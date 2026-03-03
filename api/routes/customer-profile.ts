import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Get customer profile
router.get('/', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            name: user.name || '',
            vehicleMake: user.vehicleMake || '',
            vehicleModel: user.vehicleModel || '',
            vehicleYear: user.vehicleYear || '',
            vehicleNumber: user.vehicleNumber || '',
            phoneNumber: user.phoneNumber,
        });
    } catch (error: any) {
        console.error('Get customer profile error:', error);
        res.status(500).json({ message: 'Failed to get profile' });
    }
});

// Update customer profile
router.put('/', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, vehicleMake, vehicleModel, vehicleYear, vehicleNumber, fcmToken } = req.body;

        if (name !== undefined) user.name = name;
        if (vehicleMake !== undefined) user.vehicleMake = vehicleMake;
        if (vehicleModel !== undefined) user.vehicleModel = vehicleModel;
        if (vehicleYear !== undefined) user.vehicleYear = vehicleYear;
        if (vehicleNumber !== undefined) user.vehicleNumber = vehicleNumber;
        if (fcmToken !== undefined) user.fcmToken = fcmToken;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            name: user.name,
            vehicleMake: user.vehicleMake,
            vehicleModel: user.vehicleModel,
            vehicleYear: user.vehicleYear,
            vehicleNumber: user.vehicleNumber,
        });
    } catch (error: any) {
        console.error('Update customer profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

export default router;
