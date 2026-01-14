import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Service from '../models/Service.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Get services for a garage (public)
router.get('/garage/:garageId', async (req, res) => {
    await dbConnect();
    try {
        const services = await Service.find({
            garageId: req.params.garageId,
            isActive: true
        });
        res.json(services);
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ message: 'Failed to get services' });
    }
});

// Create service (Garage owner)
router.post('/', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can create services' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found. Complete onboarding first.' });
        }

        const { name, description, price, duration } = req.body;

        const service = new Service({
            garageId: garage._id,
            name,
            description,
            price,
            duration: duration || 60,
        });

        await service.save();
        res.status(201).json(service);
    } catch (error: any) {
        console.error('Create service error:', error);
        res.status(500).json({ message: 'Failed to create service', details: error.message });
    }
});

// Update service (Garage owner)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can update services' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const service = await Service.findOne({ _id: req.params.id, garageId: garage._id });
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        const { name, description, price, duration, isActive } = req.body;

        if (name) service.name = name;
        if (description !== undefined) service.description = description;
        if (price) service.price = price;
        if (duration) service.duration = duration;
        if (isActive !== undefined) service.isActive = isActive;

        await service.save();
        res.json(service);
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ message: 'Failed to update service' });
    }
});

// Delete service (soft delete - sets isActive to false)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can delete services' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const service = await Service.findOne({ _id: req.params.id, garageId: garage._id });
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        service.isActive = false;
        await service.save();

        res.json({ message: 'Service deleted' });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ message: 'Failed to delete service' });
    }
});

// Get my services (for garage owner)
router.get('/my-services', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can view their services' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const services = await Service.find({ garageId: garage._id });
        res.json(services);
    } catch (error) {
        console.error('Get my services error:', error);
        res.status(500).json({ message: 'Failed to get services' });
    }
});

export default router;
