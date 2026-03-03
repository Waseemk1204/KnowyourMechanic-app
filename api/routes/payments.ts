import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ServiceRecord from '../models/ServiceRecord.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';
import {
    isRazorpayConfigured,
    createOrderWithRoute,
    verifyPaymentSignature,
    PLATFORM_FEE_PAISE,
} from '../utils/razorpay.js';

const router = express.Router();

// Check if Razorpay is configured
router.get('/status', (req, res) => {
    res.json({ configured: isRazorpayConfigured() });
});

// Create payment order for a service record
router.post('/create-order', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        if (!isRazorpayConfigured()) {
            return res.status(503).json({ message: 'Razorpay is not configured. Please add API keys.' });
        }

        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can create payment orders' });
        }

        const { serviceId } = req.body;
        if (!serviceId) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const serviceRecord = await ServiceRecord.findById(serviceId);
        if (!serviceRecord) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const totalAmountPaise = Math.round(serviceRecord.amount * 100) + PLATFORM_FEE_PAISE;

        // If garage has a Razorpay linked account, use route transfers
        const garageAccountId = (garage as any).razorpayAccountId;
        if (garageAccountId) {
            const order = await createOrderWithRoute({
                amount: totalAmountPaise,
                garageAccountId,
                serviceRecordId: serviceId,
            });

            return res.json({
                orderId: order.orderId,
                amount: order.amount,
                currency: 'INR',
                keyId: process.env.RAZORPAY_KEY_ID,
            });
        }

        // Fallback: simple order without route (manual settlement)
        const Razorpay = (await import('razorpay')).default;
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const order = await rzp.orders.create({
            amount: totalAmountPaise,
            currency: 'INR',
            receipt: serviceId,
        });

        res.json({
            orderId: order.id,
            amount: totalAmountPaise,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error: any) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Failed to create payment order', details: error.message });
    }
});

// Verify payment and mark service as paid
router.post('/verify', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const { orderId, paymentId, signature, serviceId } = req.body;

        if (!orderId || !paymentId || !signature || !serviceId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const isValid = verifyPaymentSignature(orderId, paymentId, signature);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // Update service record payment status
        const serviceRecord = await ServiceRecord.findById(serviceId);
        if (serviceRecord) {
            serviceRecord.paymentMethod = 'razorpay';
            serviceRecord.isReliable = true;
            (serviceRecord as any).razorpayPaymentId = paymentId;
            (serviceRecord as any).razorpayOrderId = orderId;
            await serviceRecord.save();
        }

        res.json({ message: 'Payment verified successfully', verified: true });
    } catch (error: any) {
        console.error('Verify payment error:', error);
        res.status(500).json({ message: 'Failed to verify payment', details: error.message });
    }
});

export default router;
