import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import ServiceRecord from '../models/ServiceRecord.js';
import Report from '../models/Report.js';
import dbConnect from '../utils/dbConnect.js';
import admin from '../utils/firebaseAdmin.js';

const router = express.Router();

// ─── PLATFORM STATS ────────────────────────────────────────

router.get('/stats', authenticate, requireAdmin, async (_req: AuthRequest, res) => {
    await dbConnect();
    try {
        const [
            totalGarages,
            totalCustomers,
            totalEmployees,
            totalServices,
            allServices,
        ] = await Promise.all([
            Garage.countDocuments(),
            User.countDocuments({ role: 'customer' }),
            Employee.countDocuments({ isActive: true }),
            ServiceRecord.countDocuments({ status: 'completed' }),
            ServiceRecord.find({ status: 'completed' }).select('amount platformFee garageEarnings createdAt').lean(),
        ]);

        const totalRevenue = allServices.reduce((sum, s) => sum + s.platformFee, 0);
        const totalGMV = allServices.reduce((sum, s) => sum + s.amount, 0);

        // Services per day (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentServices = allServices.filter(s => new Date(s.createdAt) > thirtyDaysAgo);
        const avgServicesPerDay = recentServices.length > 0 ? (recentServices.length / 30).toFixed(1) : '0';

        // Daily breakdown (last 30 days) for chart
        const dailyBreakdown: { date: string; count: number; revenue: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const dayServices = recentServices.filter(s => {
                const d = new Date(s.createdAt).toISOString().split('T')[0];
                return d === dateStr;
            });
            dailyBreakdown.push({
                date: dateStr,
                count: dayServices.length,
                revenue: dayServices.reduce((sum, s) => sum + s.platformFee, 0),
            });
        }

        // Garages with referrals vs without
        const referredGarages = await Garage.countDocuments({ assignedEmployeeId: { $exists: true } });

        res.json({
            totalGarages,
            totalCustomers,
            totalEmployees,
            totalServices,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalGMV: Math.round(totalGMV * 100) / 100,
            avgServicesPerDay,
            referredGarages,
            dailyBreakdown,
        });
    } catch (error: any) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Failed to get stats' });
    }
});

// ─── ALL GARAGES (for map + list) ──────────────────────────

router.get('/garages', authenticate, requireAdmin, async (_req: AuthRequest, res) => {
    await dbConnect();
    try {
        const garages = await Garage.find()
            .select('name location phone email rating totalReviews onboardingStatus isVerified referralCode assignedEmployeeId createdAt')
            .populate('assignedEmployeeId', 'name referralCode')
            .lean();

        // Get service counts per garage
        const garageCounts = await ServiceRecord.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$garageId', count: { $sum: 1 }, totalEarnings: { $sum: '$garageEarnings' } } },
        ]);

        const countMap = new Map(garageCounts.map(g => [g._id.toString(), g]));

        const enriched = garages.map(g => ({
            ...g,
            serviceCount: countMap.get((g as any)._id.toString())?.count || 0,
            totalEarnings: countMap.get((g as any)._id.toString())?.totalEarnings || 0,
        }));

        res.json(enriched);
    } catch (error: any) {
        console.error('Admin garages error:', error);
        res.status(500).json({ message: 'Failed to get garages' });
    }
});

// ─── EMPLOYEE CRUD ─────────────────────────────────────────

// List all employees
router.get('/employees', authenticate, requireAdmin, async (_req: AuthRequest, res) => {
    await dbConnect();
    try {
        const employees = await Employee.find().sort({ createdAt: -1 }).lean();

        // Get garage counts per employee
        const garageCounts = await Garage.aggregate([
            { $match: { assignedEmployeeId: { $exists: true } } },
            { $group: { _id: '$assignedEmployeeId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map(garageCounts.map(e => [e._id.toString(), e.count]));

        const enriched = employees.map(emp => ({
            ...emp,
            garageCount: countMap.get((emp as any)._id.toString()) || 0,
        }));

        res.json(enriched);
    } catch (error: any) {
        console.error('List employees error:', error);
        res.status(500).json({ message: 'Failed to list employees' });
    }
});

// Create employee
router.post('/employees', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const { name, email, phone, role } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'Name, email, and phone are required' });
        }

        // Generate unique referral code
        const referralCode = await (Employee as any).generateUniqueCode();

        // Create Firebase account for employee
        let firebaseUid = '';
        try {
            const fbUser = await admin.auth().createUser({
                phoneNumber: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`,
                displayName: name,
            });
            firebaseUid = fbUser.uid;

            // Create User record
            await new User({
                firebaseUid,
                phoneNumber: phone,
                role: role || 'employee',
                name,
            }).save();
        } catch (fbError: any) {
            // If Firebase user already exists, try to find them
            if (fbError.code === 'auth/phone-number-already-exists') {
                const existingUser = await User.findOne({ phoneNumber: phone });
                if (existingUser) {
                    existingUser.role = role || 'employee';
                    existingUser.name = name;
                    await existingUser.save();
                    firebaseUid = existingUser.firebaseUid;
                }
            } else {
                console.warn('Firebase user creation failed (employee can still log in later):', fbError.message);
            }
        }

        const employee = new Employee({
            name,
            email,
            phone,
            referralCode,
            firebaseUid,
            role: role || 'employee',
            isActive: true,
        });

        await employee.save();

        res.status(201).json({
            message: 'Employee created successfully',
            employee: {
                _id: employee._id,
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                referralCode: employee.referralCode,
                role: employee.role,
            },
        });
    } catch (error: any) {
        console.error('Create employee error:', error);
        res.status(500).json({ message: 'Failed to create employee', details: error.message });
    }
});

// Update employee
router.put('/employees/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const { name, email, phone, isActive } = req.body;
        if (name !== undefined) employee.name = name;
        if (email !== undefined) employee.email = email;
        if (phone !== undefined) employee.phone = phone;
        if (isActive !== undefined) employee.isActive = isActive;

        await employee.save();
        res.json({ message: 'Employee updated', employee });
    } catch (error: any) {
        console.error('Update employee error:', error);
        res.status(500).json({ message: 'Failed to update employee' });
    }
});

// Employee performance detail
router.get('/employees/:id/performance', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const employee = await Employee.findById(req.params.id).lean();
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Get all garages assigned to this employee
        const garages = await Garage.find({ assignedEmployeeId: employee._id })
            .select('name location phone rating totalReviews createdAt')
            .lean();

        const garageIds = garages.map(g => (g as any)._id);

        // Get service stats per garage
        const serviceStats = await ServiceRecord.aggregate([
            { $match: { garageId: { $in: garageIds }, status: 'completed' } },
            {
                $group: {
                    _id: '$garageId',
                    totalServices: { $sum: 1 },
                    totalEarnings: { $sum: '$garageEarnings' },
                    totalPlatformFee: { $sum: '$platformFee' },
                    firstService: { $min: '$createdAt' },
                    lastService: { $max: '$createdAt' },
                },
            },
        ]);

        const statsMap = new Map(serviceStats.map(s => [s._id.toString(), s]));

        const garagesWithStats = garages.map(g => {
            const stats = statsMap.get((g as any)._id.toString());
            const daysSinceFirst = stats
                ? Math.max(1, Math.ceil((Date.now() - new Date(stats.firstService).getTime()) / (24 * 60 * 60 * 1000)))
                : 0;
            return {
                ...g,
                totalServices: stats?.totalServices || 0,
                totalEarnings: stats?.totalEarnings || 0,
                totalPlatformFee: stats?.totalPlatformFee || 0,
                avgServicesPerDay: daysSinceFirst > 0 ? (stats!.totalServices / daysSinceFirst).toFixed(1) : '0',
            };
        });

        // Aggregates
        const totalServices = garagesWithStats.reduce((sum, g) => sum + g.totalServices, 0);
        const totalEarnings = garagesWithStats.reduce((sum, g) => sum + g.totalEarnings, 0);

        res.json({
            employee,
            garages: garagesWithStats,
            aggregates: {
                totalGarages: garages.length,
                totalServices,
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                avgServicesPerGarage: garages.length > 0 ? (totalServices / garages.length).toFixed(1) : '0',
            },
        });
    } catch (error: any) {
        console.error('Employee performance error:', error);
        res.status(500).json({ message: 'Failed to get performance data' });
    }
});

// ─── REPORT MANAGEMENT ─────────────────────────────────────

// List all reports
router.get('/reports', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const statusFilter = req.query.status as string;
        const filter: any = {};
        if (statusFilter && statusFilter !== 'all') {
            filter.status = statusFilter;
        }

        const reports = await Report.find(filter)
            .sort({ createdAt: -1 })
            .populate('reporterId', 'name phoneNumber')
            .populate('garageId', 'name')
            .lean();

        res.json(reports);
    } catch (error: any) {
        console.error('Admin reports error:', error);
        res.status(500).json({ message: 'Failed to get reports' });
    }
});

// Update report status
router.put('/reports/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const { status } = req.body;
        if (!['pending', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        report.status = status;
        await report.save();

        res.json({ message: 'Report status updated', report });
    } catch (error: any) {
        console.error('Update report error:', error);
        res.status(500).json({ message: 'Failed to update report' });
    }
});

export default router;
