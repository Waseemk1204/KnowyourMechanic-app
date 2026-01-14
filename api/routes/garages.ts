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

        const garages = await Garage.find(query).populate('userId', 'phoneNumber');
        res.status(200).json(garages);
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

// Get specific garage
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
