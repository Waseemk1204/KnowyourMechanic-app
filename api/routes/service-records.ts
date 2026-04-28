import crypto from 'crypto';
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import ServiceRecord from '../models/ServiceRecord.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';
import { sendInvoiceWithPdf, sendOtpWhatsApp, isWhatsAppConfigured } from '../utils/whatsapp.js';
import { generateInvoicePdf, generateInvoiceNumber } from '../utils/pdfInvoice.js';
import { sendServiceApprovalNotification } from '../utils/notifications.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

// Static platform fee: ₹1.90
const PLATFORM_FEE = 1.9;

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt instead of Math.random for unpredictability.
 */
function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
}

// Calculate fees (static ₹1.90 added to customer payment)
// Customer pays: amount + platform fee
// Garage receives: original amount
function calculateFees(amount: number) {
    const platformFee = PLATFORM_FEE;
    const customerPays = amount + platformFee;  // Customer pays more
    const garageEarnings = amount;              // Garage gets full amount
    return { platformFee, customerPays, garageEarnings };
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

        // Smart channel detection: check if customer has the app
        const existingCustomer = await User.findOne({
            phoneNumber: customerPhone,
            role: 'customer',
            firebaseUid: { $exists: true, $ne: '' },
        });

        if (existingCustomer && existingCustomer.fcmToken) {
            // ─── IN-APP VERIFICATION (FREE) ───
            serviceRecord.verificationMethod = 'in_app';
            await serviceRecord.save();

            // Send push notification
            const pushResult = await sendServiceApprovalNotification(
                existingCustomer.fcmToken,
                {
                    garageName: garage.name,
                    description,
                    amount,
                    serviceId: serviceRecord._id.toString(),
                }
            );

            // If token expired, clear it and fall through to WhatsApp
            if (!pushResult.success && pushResult.error === 'token_expired') {
                existingCustomer.fcmToken = undefined;
                await existingCustomer.save();
                // Falls through to WhatsApp OTP below
            } else {
                return res.status(201).json({
                    serviceId: serviceRecord._id,
                    message: 'Approval request sent to customer app',
                    verificationMethod: 'in_app',
                });
            }
        }

        // ─── WHATSAPP OTP FLOW (FALLBACK) ───
        serviceRecord.verificationMethod = 'whatsapp_otp';
        await serviceRecord.save();

        let otpSent = false;
        if (isWhatsAppConfigured()) {
            try {
                const result = await sendOtpWhatsApp(customerPhone, otp, {
                    garageName: garage.name,
                    description,
                    amount,
                });
                otpSent = result.success;
            } catch (whatsappError) {
                console.error('WhatsApp OTP error:', whatsappError);
            }
        }

        // Only log OTP in development — never in production
        if (!otpSent && !isProduction) {
            console.log(`[DEV] OTP for ${customerPhone}: ${otp}`);
        }

        const responseBody: Record<string, unknown> = {
            serviceId: serviceRecord._id,
            message: otpSent ? 'OTP sent via WhatsApp' : 'OTP generated (WhatsApp not configured)',
            verificationMethod: 'whatsapp_otp',
        };

        // Only expose test OTP in non-production environments
        if (!otpSent && !isProduction) {
            responseBody._testOTP = otp;
        }

        res.status(201).json(responseBody);
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

        // Timing-safe OTP comparison to prevent timing attacks
        const otpMatch = serviceRecord.otp && otp &&
            serviceRecord.otp.length === otp.length &&
            crypto.timingSafeEqual(Buffer.from(serviceRecord.otp), Buffer.from(otp));

        if (!otpMatch) {
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

        // Auto-create customer account if doesn't exist
        try {
            const existingCustomer = await User.findOne({
                phoneNumber: serviceRecord.customerPhone,
                role: 'customer'
            });

            if (!existingCustomer) {
                // Create a placeholder customer account
                // They can "claim" it when they login with this phone number
                const newCustomer = new User({
                    phoneNumber: serviceRecord.customerPhone,
                    role: 'customer',
                    createdAt: new Date()
                });
                await newCustomer.save();
            }
        } catch (customerError) {
            // Don't fail the service completion if customer creation fails
            console.error('Auto-create customer error:', customerError);
        }

        // Generate PDF invoice and send via WhatsApp if configured
        let whatsappSent = false;
        if (isWhatsAppConfigured()) {
            try {
                const garage = await Garage.findById(serviceRecord.garageId);
                const invoiceNumber = generateInvoiceNumber();
                const invoiceDate = new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                });

                // Persist invoice number on the record
                serviceRecord.invoiceNumber = invoiceNumber;
                await serviceRecord.save();

                // Generate PDF
                const pdfBuffer = await generateInvoicePdf({
                    invoiceNumber,
                    date: invoiceDate,
                    customerPhone: serviceRecord.customerPhone,
                    garageName: garage?.name || 'Unknown Garage',
                    serviceDescription: serviceRecord.description,
                    amount: serviceRecord.amount,
                    platformFee: serviceRecord.platformFee,
                    garageEarnings: serviceRecord.garageEarnings,
                    paymentMethod: paymentMethod,
                    businessName: process.env.WHATSAPP_BUSINESS_NAME || 'KnowYourMechanic',
                });

                // Send via WhatsApp with PDF attachment
                const result = await sendInvoiceWithPdf(
                    serviceRecord.customerPhone,
                    pdfBuffer,
                    invoiceNumber,
                    {
                        customerName: 'Customer',
                        garageName: garage?.name || 'Unknown Garage',
                        serviceDescription: serviceRecord.description,
                        amount: serviceRecord.amount,
                        platformFee: serviceRecord.platformFee,
                        date: invoiceDate,
                    }
                );

                whatsappSent = result.success;
            } catch (whatsappError) {
                console.error('WhatsApp invoice error:', whatsappError);
            }
        }

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
            whatsappInvoiceSent: whatsappSent,
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

        // Get total count (not limited)
        const totalCount = await ServiceRecord.countDocuments({
            garageId: garage._id,
            status: 'completed'
        });

        // Get earnings from all services for accurate stats
        const allServicesForStats = await ServiceRecord.find({
            garageId: garage._id,
            status: 'completed'
        }).select('garageEarnings isReliable');

        const stats = {
            totalServices: totalCount,
            totalEarnings: allServicesForStats.reduce((sum, s) => sum + s.garageEarnings, 0),
            reliableServices: allServicesForStats.filter(s => s.isReliable).length,
        };

        res.json({ services, stats });
    } catch (error: any) {
        console.error('Get service history error:', error);
        res.status(500).json({ message: 'Failed to get service history' });
    }
});

// Get service records for a specific garage (public endpoint for customers)
router.get('/garage/:garageId', async (req, res) => {
    await dbConnect();
    try {
        const { garageId } = req.params;

        const serviceRecords = await ServiceRecord.find({
            garageId,
            status: 'completed'
        })
            .sort({ createdAt: -1 })
            .select('description amount createdAt isReliable')
            .lean();

        res.json(serviceRecords);
    } catch (error: any) {
        console.error('Get garage service records error:', error);
        res.status(500).json({ message: 'Failed to get service records' });
    }
});

// Get customer's service history (for Activity page)
router.get('/my-history', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find all completed services for this customer's phone number
        const services = await ServiceRecord.find({
            customerPhone: user.phoneNumber,
            status: 'completed'
        })
            .sort({ createdAt: -1 })
            .populate('garageId', 'name photoUrl location')
            .lean();

        res.json(services);
    } catch (error: any) {
        console.error('Get customer service history error:', error);
        res.status(500).json({ message: 'Failed to get service history' });
    }
});

// ─── IN-APP APPROVAL ENDPOINTS ────────────────────────────

// Get pending approvals for a customer
router.get('/pending-approvals', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const pending = await ServiceRecord.find({
            customerPhone: user.phoneNumber,
            status: 'pending_otp',
            verificationMethod: 'in_app',
        })
            .sort({ createdAt: -1 })
            .select('garageName description amount platformFee garageEarnings createdAt')
            .lean();

        res.json(pending);
    } catch (error: any) {
        console.error('Get pending approvals error:', error);
        res.status(500).json({ message: 'Failed to get pending approvals' });
    }
});

// Customer approves a pending service (replaces OTP verification)
router.post('/approve', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { serviceId } = req.body;
        if (!serviceId) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const serviceRecord = await ServiceRecord.findById(serviceId);
        if (!serviceRecord) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        // Verify this service belongs to this customer
        if (serviceRecord.customerPhone !== user.phoneNumber) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (serviceRecord.status !== 'pending_otp') {
            return res.status(400).json({ message: 'Service already processed' });
        }

        serviceRecord.status = 'otp_verified';
        serviceRecord.approvedByCustomer = true;
        serviceRecord.otp = undefined;
        await serviceRecord.save();

        res.json({
            message: 'Service approved successfully',
            serviceId: serviceRecord._id,
            amount: serviceRecord.amount,
            platformFee: serviceRecord.platformFee,
            garageEarnings: serviceRecord.garageEarnings,
        });
    } catch (error: any) {
        console.error('Approve service error:', error);
        res.status(500).json({ message: 'Failed to approve service' });
    }
});

// Customer rejects a pending service
router.post('/reject', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { serviceId } = req.body;
        if (!serviceId) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const serviceRecord = await ServiceRecord.findById(serviceId);
        if (!serviceRecord) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        if (serviceRecord.customerPhone !== user.phoneNumber) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (serviceRecord.status !== 'pending_otp') {
            return res.status(400).json({ message: 'Service already processed' });
        }

        serviceRecord.status = 'cancelled';
        serviceRecord.approvedByCustomer = false;
        serviceRecord.otp = undefined;
        await serviceRecord.save();

        res.json({ message: 'Service rejected', serviceId: serviceRecord._id });
    } catch (error: any) {
        console.error('Reject service error:', error);
        res.status(500).json({ message: 'Failed to reject service' });
    }
});

// ─── DOWNLOADABLE INVOICE ─────────────────────────────────

// Generate and download invoice PDF on-demand
router.get('/invoice/:serviceId', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const serviceRecord = await ServiceRecord.findById(req.params.serviceId);
        if (!serviceRecord) {
            return res.status(404).json({ message: 'Service record not found' });
        }

        // Authorization: customer can download own invoices, garage can download their own service records
        if (user.role === 'customer') {
            if (serviceRecord.customerPhone !== user.phoneNumber) {
                return res.status(403).json({ message: 'You can only download your own invoices' });
            }
        } else if (user.role === 'garage') {
            const garage = await Garage.findOne({ userId: user._id });
            if (!garage || !serviceRecord.garageId.equals(garage._id)) {
                return res.status(403).json({ message: 'You can only download invoices for your services' });
            }
        } else {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (serviceRecord.status !== 'completed') {
            return res.status(400).json({ message: 'Invoice only available for completed services' });
        }

        // Reuse existing invoice number or generate a new one and persist it
        let invoiceNumber = serviceRecord.invoiceNumber;
        if (!invoiceNumber) {
            invoiceNumber = generateInvoiceNumber();
            serviceRecord.invoiceNumber = invoiceNumber;
            await serviceRecord.save();
        }

        const garage = await Garage.findById(serviceRecord.garageId);
        const invoiceDate = new Date(serviceRecord.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        const pdfBuffer = await generateInvoicePdf({
            invoiceNumber,
            date: invoiceDate,
            customerPhone: serviceRecord.customerPhone,
            garageName: garage?.name || 'Unknown Garage',
            serviceDescription: serviceRecord.description,
            amount: serviceRecord.amount,
            platformFee: serviceRecord.platformFee,
            garageEarnings: serviceRecord.garageEarnings,
            paymentMethod: serviceRecord.paymentMethod || 'cash',
            businessName: process.env.WHATSAPP_BUSINESS_NAME || 'KnowyourMechanic',
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoiceNumber}.pdf`);
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('Generate invoice error:', error);
        res.status(500).json({ message: 'Failed to generate invoice' });
    }
});

export default router;
