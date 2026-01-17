import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Step 1: Save basic business info
router.post('/business-info', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can onboard' });
        }

        const {
            name,
            email,
            phone,
            address,
            coordinates,
            serviceHours,
            workingDays,
            businessType,
            legalBusinessName
        } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'Name, email, and phone are required' });
        }

        // Find or create garage
        let garage = await Garage.findOne({ userId: user._id });

        if (garage) {
            // Update existing
            garage.name = name;
            garage.email = email;
            garage.phone = phone;
            garage.location = {
                address: address || '',
                coordinates: coordinates || [0, 0],
            };
            garage.serviceHours = serviceHours || '';
            garage.workingDays = workingDays || '';
            garage.businessType = businessType || 'individual';
            garage.legalBusinessName = legalBusinessName || name;
            garage.onboardingStatus = 'bank_details';
        } else {
            // Create new
            garage = new Garage({
                userId: user._id,
                name,
                email,
                phone,
                location: {
                    address: address || '',
                    coordinates: coordinates || [0, 0],
                },
                serviceHours: serviceHours || '',
                workingDays: workingDays || '',
                businessType: businessType || 'individual',
                legalBusinessName: legalBusinessName || name,
                onboardingStatus: 'bank_details',
            });
        }

        await garage.save();

        res.json({
            message: 'Business info saved',
            garageId: garage._id,
            nextStep: 'bank_details',
        });
    } catch (error: any) {
        console.error('Business info error:', error);
        res.status(500).json({ message: 'Failed to save business info', details: error.message });
    }
});

// Step 2: Save bank details and create Razorpay linked account
router.post('/bank-details', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can onboard' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Complete business info first' });
        }

        const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;

        if (!accountNumber || !ifscCode || !accountHolderName) {
            return res.status(400).json({ message: 'Account number, IFSC, and holder name are required' });
        }

        // Save bank details
        garage.bankDetails = {
            accountNumber,
            ifscCode,
            accountHolderName,
            bankName,
        };

        // Skip Razorpay for now - will be added later
        // Just mark as completed so garage can start using the app
        garage.onboardingStatus = 'completed';
        garage.isVerified = false; // Will be true once Razorpay is integrated

        await garage.save();

        res.json({
            message: garage.razorpayAccountId
                ? 'Bank details saved and Razorpay account created'
                : 'Bank details saved. Razorpay account pending.',
            garageId: garage._id,
            razorpayAccountId: garage.razorpayAccountId,
            onboardingStatus: garage.onboardingStatus,
            isVerified: garage.isVerified,
        });
    } catch (error: any) {
        console.error('Bank details error:', error);
        res.status(500).json({ message: 'Failed to save bank details', details: error.message });
    }
});

// Get current onboarding status
router.get('/status', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can check onboarding status' });
        }

        const garage = await Garage.findOne({ userId: user._id });

        if (!garage) {
            return res.json({
                hasGarage: false,
                onboardingStatus: 'pending',
                nextStep: 'business_info',
            });
        }

        res.json({
            hasGarage: true,
            garageId: garage._id,
            name: garage.name,
            onboardingStatus: garage.onboardingStatus,
            isVerified: garage.isVerified,
            hasRazorpay: !!garage.razorpayAccountId,
            nextStep: garage.onboardingStatus === 'pending' ? 'business_info'
                : garage.onboardingStatus === 'bank_details' ? 'bank_details'
                    : garage.onboardingStatus === 'verification' ? 'pending_verification'
                        : 'completed',
        });
    } catch (error: any) {
        console.error('Onboarding status error:', error);
        res.status(500).json({ message: 'Failed to get status' });
    }
});

// Complete onboarding (skip Razorpay for testing)
router.post('/complete', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        garage.onboardingStatus = 'completed';
        await garage.save();

        res.json({
            message: 'Onboarding completed',
            garageId: garage._id,
        });
    } catch (error: any) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({ message: 'Failed to complete onboarding' });
    }
});

export default router;
