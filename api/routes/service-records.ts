import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ServiceRecord from '../models/ServiceRecord.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Static platform fee: ₹1.90
const PLATFORM_FEE = 1.9;

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Calculate fees (static ₹1.90)
function calculateFees(amount: number) {
    const platformFee = PLATFORM_FEE;
    const garageEarnings = amount - platformFee;
    return { platformFee, garageEarnings };
}

// Initiate service - sends OTP to customer
router.post('/initiate', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can initiate services' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found. Complete onboarding first.' });
        }

        const { customerPhone, description, amount } = req.body;

        if (!customerPhone || !description || !amount) {
            return res.status(400).json({ message: 'Phone, description, and amount are required' });
        }

        if (amount < 1) {
            return res.status(400).json({ message: 'Amount must be at least ₹1' });
        }

        const { platformFee, garageEarnings } = calculateFees(amount);
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const serviceRecord = new ServiceRecord({
            garageId: garage._id,
            garageName: garage.name,
            customerPhone,
            description,
            amount,
            platformFee,
            garageEarnings,
            otp,
            otpExpiry,
            status: 'pending_otp',
        });

        await serviceRecord.save();

        // In production, send SMS here via Twilio/Firebase
        // For now, we'll return the OTP in response (for testing)
        // TODO: Integrate actual SMS sending

        console.log(`OTP for ${customerPhone}: ${otp}`);
        console.log(`Message: "${garage.name}" wants to record a service: ${description} for ₹${amount}. Share OTP ${otp} only if this is correct.`);

        res.status(201).json({
            serviceId: serviceRecord._id,
            message: 'OTP sent to customer',
            // Remove this in production - only for testing
            _testOTP: process.env.NODE_ENV !== 'production' ? otp : undefined,
        });
    } catch (error: any) {
        console.error('Initiate service error:', error);
        res.status(500).json({ message: 'Failed to initiate service', details: error.message });
    }
});

// Verify OTP
router.post('/verify-otp', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can verify OTP' });
        }

        const { serviceId, otp } = req.body;

        if (!serviceId || !otp) {
            return res.status(400).json({ message: 'Service ID and OTP are required' });
        }

        const serviceRecord = await ServiceRecord.findById(serviceId);
        if (!serviceRecord) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        if (serviceRecord.status !== 'pending_otp') {
            return res.status(400).json({ message: 'OTP already verified or service cancelled' });
        }

        if (new Date() > serviceRecord.otpExpiry!) {
            return res.status(400).json({ message: 'OTP expired. Please initiate again.' });
        }

        if (serviceRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        serviceRecord.status = 'otp_verified';
        serviceRecord.otp = undefined; // Clear OTP after verification
        await serviceRecord.save();

        res.json({
            message: 'OTP verified successfully',
            serviceId: serviceRecord._id,
            amount: serviceRecord.amount,
            platformFee: serviceRecord.platformFee,
            garageEarnings: serviceRecord.garageEarnings,
        });
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Failed to verify OTP', details: error.message });
    }
});

// Complete service with payment
router.post('/complete', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can complete services' });
        }

        const { serviceId, paymentMethod, razorpayPaymentId } = req.body;

        if (!serviceId || !paymentMethod) {
            return res.status(400).json({ message: 'Service ID and payment method are required' });
        }

        if (!['cash', 'razorpay'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Payment method must be cash or razorpay' });
        }

        const serviceRecord = await ServiceRecord.findById(serviceId);
        if (!serviceRecord) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        if (serviceRecord.status !== 'otp_verified') {
            return res.status(400).json({ message: 'OTP must be verified first' });
        }

        // For Razorpay, verify payment ID exists
        if (paymentMethod === 'razorpay' && !razorpayPaymentId) {
            return res.status(400).json({ message: 'Razorpay payment ID required' });
        }

        serviceRecord.paymentMethod = paymentMethod;
        serviceRecord.isReliable = paymentMethod === 'razorpay'; // Cash is less reliable
        serviceRecord.status = 'completed';

        if (razorpayPaymentId) {
            serviceRecord.razorpayPaymentId = razorpayPaymentId;
        }

        await serviceRecord.save();

        res.json({
            message: 'Service completed successfully',
            serviceRecord: {
                id: serviceRecord._id,
                description: serviceRecord.description,
                amount: serviceRecord.amount,
                paymentMethod: serviceRecord.paymentMethod,
                isReliable: serviceRecord.isReliable,
                garageEarnings: serviceRecord.garageEarnings,
            },
        });
    } catch (error: any) {
        console.error('Complete service error:', error);
        res.status(500).json({ message: 'Failed to complete service', details: error.message });
    }
});

// Get garage's service history
router.get('/history', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can view service history' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const services = await ServiceRecord.find({
            garageId: garage._id,
            status: 'completed'
        }).sort({ createdAt: -1 }).limit(50);

        const stats = {
            totalServices: services.length,
            totalEarnings: services.reduce((sum, s) => sum + s.garageEarnings, 0),
            reliableServices: services.filter(s => s.isReliable).length,
        };

        res.json({ services, stats });
    } catch (error: any) {
        console.error('Get service history error:', error);
        res.status(500).json({ message: 'Failed to get service history' });
    }
});

export default router;
