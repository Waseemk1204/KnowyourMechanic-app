import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Sync user (create or get)
router.post('/sync', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const { role } = req.body;

        if (!role || !['customer', 'garage'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const phoneNumber = req.user!.phone_number || '';

        // First check if user exists by Firebase UID
        let user = await User.findOne({ firebaseUid: req.user!.uid });

        if (!user) {
            // Check if there's an existing account with this phone number but no Firebase UID
            // (auto-created from service records)
            const existingByPhone = await User.findOne({
                phoneNumber,
                role: 'customer',
                firebaseUid: { $exists: false }
            });

            if (existingByPhone && role === 'customer') {
                // Link this Firebase account to the existing customer record
                existingByPhone.firebaseUid = req.user!.uid;
                await existingByPhone.save();
                console.log(`Linked Firebase account to existing customer: ${phoneNumber}`);
                user = existingByPhone;
            } else {
                // Create new user
                user = new User({
                    firebaseUid: req.user!.uid,
                    phoneNumber,
                    role,
                });
                await user.save();
            }
        }

        res.status(200).json(user);
    } catch (error: any) {
        console.error('Sync error stack:', error.stack);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'User already exists or database index conflict. Please contact support.',
                details: error.message
            });
        }

        res.status(500).json({ message: 'Internal server error', details: error.message });
    }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
