import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import dbConnect from '../utils/dbConnect';

const router = express.Router();

// Sync user (create or get)
router.post('/sync', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const { role } = req.body;

        if (!role || !['customer', 'garage'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        let user = await User.findOne({ firebaseUid: req.user!.uid });

        if (!user) {
            user = new User({
                firebaseUid: req.user!.uid,
                phoneNumber: req.user!.phone_number || '',
                role,
            });
            await user.save();
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
