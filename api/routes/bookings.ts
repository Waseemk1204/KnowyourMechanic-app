import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Create booking (Customer)
router.post('/', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'customer') {
            return res.status(403).json({ message: 'Only customers can create bookings' });
        }

        const { garageId, serviceId, scheduledDate, scheduledTime, notes, vehicleInfo } = req.body;

        // Validate service exists and get price
        const service = await Service.findById(serviceId);
        if (!service || !service.isActive) {
            return res.status(404).json({ message: 'Service not found or inactive' });
        }

        // Validate garage exists
        const garage = await Garage.findById(garageId);
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const booking = new Booking({
            customerId: user._id,
            garageId,
            serviceId,
            scheduledDate: new Date(scheduledDate),
            scheduledTime,
            notes,
            totalPrice: service.price,
            customerPhone: user.phoneNumber,
            vehicleInfo,
        });

        await booking.save();

        res.status(201).json(booking);
    } catch (error: any) {
        console.error('Create booking error:', error);
        res.status(500).json({ message: 'Failed to create booking', details: error.message });
    }
});

// Get customer's bookings
router.get('/my-bookings', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const bookings = await Booking.find({ customerId: user._id })
            .populate('garageId', 'name location photoUrl')
            .populate('serviceId', 'name price duration')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error('Get customer bookings error:', error);
        res.status(500).json({ message: 'Failed to get bookings' });
    }
});

// Get garage's bookings (for garage owners)
router.get('/garage-bookings', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garages can view garage bookings' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found' });
        }

        const { status } = req.query;
        const query: any = { garageId: garage._id };
        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .populate('customerId', 'phoneNumber')
            .populate('serviceId', 'name price duration')
            .sort({ scheduledDate: 1 });

        res.json(bookings);
    } catch (error) {
        console.error('Get garage bookings error:', error);
        res.status(500).json({ message: 'Failed to get bookings' });
    }
});

// Update booking status (Garage owner)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { status } = req.body;
        const validStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization
        if (user.role === 'garage') {
            const garage = await Garage.findOne({ userId: user._id });
            if (!garage || !booking.garageId.equals(garage._id)) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        } else if (user.role === 'customer') {
            if (!booking.customerId.equals(user._id)) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            // Customers can only cancel
            if (status !== 'cancelled') {
                return res.status(403).json({ message: 'Customers can only cancel bookings' });
            }
        }

        booking.status = status;
        await booking.save();

        res.json(booking);
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ message: 'Failed to update booking' });
    }
});

// Get single booking
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('garageId', 'name location photoUrl')
            .populate('serviceId', 'name price duration')
            .populate('customerId', 'phoneNumber');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ message: 'Failed to get booking' });
    }
});

export default router;
