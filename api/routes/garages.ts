import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Create or update garage profile
router.post('/profile', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Forbidden: Only garages can create profiles' });
        }

        const { name, address, coordinates, serviceHours, workingDays, photoUrl } = req.body;

        let garage = await Garage.findOne({ userId: user._id });

        if (garage) {
            garage.name = name || garage.name;
            garage.location = {
                address: address || garage.location.address,
                coordinates: coordinates || garage.location.coordinates
            };
            garage.serviceHours = serviceHours || garage.serviceHours;
            garage.workingDays = workingDays || garage.workingDays;
            garage.photoUrl = photoUrl || garage.photoUrl;
            await garage.save();
        } else {
            garage = new Garage({
                userId: user._id,
                name,
                location: { address, coordinates },
                serviceHours,
                workingDays,
                photoUrl
            });
            await garage.save();
        }

        res.status(200).json(garage);
    } catch (error) {
        console.error('Garage profile update error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all garages (Discovery)
router.get('/discovery', async (req, res) => {
    await dbConnect();
    try {
        const { lat, lng, radius = 5000 } = req.query;

        let query: any = {};

        if (lat && lng) {
            query['location.coordinates'] = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
                    },
                    $maxDistance: parseInt(radius as string)
                }
            };
        }

        const garages = await Garage.find(query).populate('userId', 'phoneNumber').lean();

        // Get service counts for all garages
        const Service = (await import('../models/Service.js')).default;
        const garageIds = garages.map((g: any) => g._id);

        // Check total services in database
        const totalServices = await Service.countDocuments({ isActive: true });
        const allServices = await Service.find({ isActive: true }).limit(10).lean();

        const serviceCounts = await Service.aggregate([
            { $match: { garageId: { $in: garageIds }, isActive: true } },
            { $group: { _id: '$garageId', count: { $sum: 1 } } }
        ]);

        console.log('Service count debugging:', {
            totalGarages: garageIds.length,
            totalServicesInDb: totalServices,
            sampleServices: allServices.map(s => ({ name: s.name, garageId: s.garageId?.toString() })),
            garageNames: garages.map((g: any) => ({ id: g._id.toString(), name: g.name })),
            serviceCounts,
            serviceCountsLength: serviceCounts.length
        });

        // Create a map of garage ID to service count
        const countMap = new Map(serviceCounts.map((s: any) => [s._id.toString(), s.count]));

        // Add totalServices to each garage
        const garagesWithCounts = garages.map((g: any) => ({
            ...g,
            totalServices: countMap.get(g._id.toString()) || 0
        }));

        res.status(200).json(garagesWithCounts);
    } catch (error) {
        console.error('Garage discovery error:', error);
        // If geospatial query fails, return all garages
        try {
            const garages = await Garage.find({}).populate('userId', 'phoneNumber');
            res.status(200).json(garages);
        } catch (e) {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});

// Get current garage's profile (for settings)
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can access profile' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        res.json(garage);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update garage profile (for settings)
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can update profile' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const {
            name, email, phone, address, coordinates,
            serviceHours, workingDays, businessType, legalBusinessName, photoUrl
        } = req.body;

        if (name !== undefined) garage.name = name;
        if (email !== undefined) garage.email = email;
        if (phone !== undefined) garage.phone = phone;
        if (address !== undefined) garage.location.address = address;
        if (coordinates !== undefined) garage.location.coordinates = coordinates;
        if (serviceHours !== undefined) garage.serviceHours = serviceHours;
        if (workingDays !== undefined) garage.workingDays = workingDays;
        if (businessType !== undefined) garage.businessType = businessType;
        if (legalBusinessName !== undefined) garage.legalBusinessName = legalBusinessName;
        if (photoUrl !== undefined) garage.photoUrl = photoUrl;

        await garage.save();
        res.json({ message: 'Profile updated', garage });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update bank details
router.put('/bank-details', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can update bank details' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;

        if (!accountNumber || !ifscCode || !accountHolderName) {
            return res.status(400).json({ message: 'Account number, IFSC code, and account holder name are required' });
        }

        garage.bankDetails = {
            accountNumber,
            ifscCode,
            accountHolderName,
            bankName: bankName || '',
        };

        await garage.save();
        res.json({ message: 'Bank details updated successfully' });
    } catch (error) {
        console.error('Update bank details error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get specific garage (MUST be last - catches all IDs)
router.get('/:id', async (req, res) => {
    await dbConnect();
    try {
        const garage = await Garage.findById(req.params.id).populate('userId', 'phoneNumber');
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }
        res.status(200).json(garage);
    } catch (error) {
        console.error('Get garage error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
