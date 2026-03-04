import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Report from '../models/Report.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import ServiceRecord from '../models/ServiceRecord.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Submit a report (customer only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'customer') {
            return res.status(403).json({ message: 'Only customers can submit reports' });
        }

        const { garageId, serviceRecordId, reason, description } = req.body;

        if (!garageId || !reason || !description) {
            return res.status(400).json({ message: 'Garage ID, reason, and description are required' });
        }

        // Validate garage exists
        const garage = await Garage.findById(garageId);
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        // MANDATORY: Verify customer has at least one service from this garage
        const hasService = await ServiceRecord.exists({
            garageId,
            customerPhone: user.phoneNumber,
            status: 'completed',
        });
        if (!hasService) {
            return res.status(403).json({
                message: 'You can only report a garage where you have had a service done.',
            });
        }

        // If service record provided, validate it belongs to this customer
        if (serviceRecordId) {
            const record = await ServiceRecord.findOne({
                _id: serviceRecordId,
                customerPhone: user.phoneNumber,
            });
            if (!record) {
                return res.status(404).json({ message: 'Service record not found or does not belong to you' });
            }
        }

        // Prevent duplicate reports for same garage + reason
        const existing = await Report.findOne({
            reporterId: user._id,
            garageId,
            reason,
            status: { $in: ['pending', 'reviewing'] },
        });
        if (existing) {
            return res.status(409).json({ message: 'You already have an open report for this issue' });
        }

        const report = new Report({
            reporterId: user._id,
            garageId,
            serviceRecordId: serviceRecordId || undefined,
            reason,
            description,
        });

        await report.save();

        res.status(201).json({
            message: 'Report submitted successfully. We will review it shortly.',
            report,
        });
    } catch (error: any) {
        console.error('Submit report error:', error);
        res.status(500).json({ message: 'Failed to submit report', details: error.message });
    }
});

// Get my reports (customer only)
router.get('/my-reports', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const reports = await Report.find({ reporterId: user._id })
            .sort({ createdAt: -1 })
            .populate('garageId', 'name photoUrl')
            .lean();

        res.json(reports);
    } catch (error: any) {
        console.error('Get my reports error:', error);
        res.status(500).json({ message: 'Failed to get reports' });
    }
});

export default router;
