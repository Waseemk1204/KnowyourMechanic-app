import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireEmployee } from '../middleware/adminAuth.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import ServiceRecord from '../models/ServiceRecord.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Get current employee's profile and referral code
router.get('/me', authenticate, requireEmployee, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const employee = await Employee.findOne({ phone: user.phoneNumber }).lean();
        if (!employee) return res.status(404).json({ message: 'Employee record not found' });

        res.json(employee);
    } catch (error: any) {
        console.error('Get employee profile error:', error);
        res.status(500).json({ message: 'Failed to get profile' });
    }
});

// Get garages assigned to this employee
router.get('/my-garages', authenticate, requireEmployee, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const employee = await Employee.findOne({ phone: user.phoneNumber });
        if (!employee) return res.status(404).json({ message: 'Employee record not found' });

        const garages = await Garage.find({ assignedEmployeeId: employee._id })
            .select('name location phone rating totalReviews createdAt')
            .lean();

        // Enrich with service stats
        const garageIds = garages.map(g => (g as any)._id);
        const stats = await ServiceRecord.aggregate([
            { $match: { garageId: { $in: garageIds }, status: 'completed' } },
            {
                $group: {
                    _id: '$garageId',
                    totalServices: { $sum: 1 },
                    totalEarnings: { $sum: '$garageEarnings' },
                    firstService: { $min: '$createdAt' },
                },
            },
        ]);

        const statsMap = new Map(stats.map(s => [s._id.toString(), s]));

        const enriched = garages.map(g => {
            const s = statsMap.get((g as any)._id.toString());
            const days = s ? Math.max(1, Math.ceil((Date.now() - new Date(s.firstService).getTime()) / 86400000)) : 0;
            return {
                ...g,
                totalServices: s?.totalServices || 0,
                totalEarnings: s?.totalEarnings || 0,
                avgServicesPerDay: days > 0 ? (s!.totalServices / days).toFixed(1) : '0',
            };
        });

        res.json(enriched);
    } catch (error: any) {
        console.error('Get my garages error:', error);
        res.status(500).json({ message: 'Failed to get garages' });
    }
});

// Get aggregate stats for this employee
router.get('/my-stats', authenticate, requireEmployee, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const employee = await Employee.findOne({ phone: user.phoneNumber });
        if (!employee) return res.status(404).json({ message: 'Employee record not found' });

        const garageCount = await Garage.countDocuments({ assignedEmployeeId: employee._id });
        const garageIds = (await Garage.find({ assignedEmployeeId: employee._id }).select('_id').lean())
            .map(g => (g as any)._id);

        const servicePipeline = await ServiceRecord.aggregate([
            { $match: { garageId: { $in: garageIds }, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalServices: { $sum: 1 },
                    totalEarnings: { $sum: '$garageEarnings' },
                    totalPlatformFee: { $sum: '$platformFee' },
                },
            },
        ]);

        const stats = servicePipeline[0] || { totalServices: 0, totalEarnings: 0, totalPlatformFee: 0 };

        // Last 30 days avg
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const recentCount = await ServiceRecord.countDocuments({
            garageId: { $in: garageIds },
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo },
        });

        res.json({
            referralCode: employee.referralCode,
            totalGarages: garageCount,
            totalServices: stats.totalServices,
            totalEarnings: Math.round(stats.totalEarnings * 100) / 100,
            avgServicesPerDay: (recentCount / 30).toFixed(1),
        });
    } catch (error: any) {
        console.error('Get my stats error:', error);
        res.status(500).json({ message: 'Failed to get stats' });
    }
});

export default router;
