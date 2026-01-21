import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Review from '../models/Review.js';
import ServiceRecord from '../models/ServiceRecord.js';
import Garage from '../models/Garage.js';
import User from '../models/User.js';
import dbConnect from '../utils/dbConnect.js';

const router = express.Router();

// Helper function to recalculate garage rating
async function recalculateGarageRating(garageId: string) {
    const reviews = await Review.find({ garageId });

    if (reviews.length === 0) {
        await Garage.findByIdAndUpdate(garageId, {
            rating: 0,
            totalReviews: 0
        });
        return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Garage.findByIdAndUpdate(garageId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: reviews.length
    });
}

// Submit or update a review
router.post('/', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'customer') {
            return res.status(403).json({ message: 'Only customers can leave reviews' });
        }

        const { garageId, rating, comment } = req.body;

        if (!garageId || !rating) {
            return res.status(400).json({ message: 'Garage ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check if customer has completed service record with this garage
        const hasServiceRecord = await ServiceRecord.findOne({
            garageId,
            customerPhone: user.phoneNumber,
            status: 'completed'
        });

        if (!hasServiceRecord) {
            return res.status(403).json({
                message: 'You can only review garages where you have received services'
            });
        }

        // Check if review already exists (upsert)
        const existingReview = await Review.findOne({
            customerId: user._id,
            garageId
        });

        if (existingReview) {
            // Update existing review
            existingReview.rating = rating;
            existingReview.comment = comment || '';
            await existingReview.save();

            await recalculateGarageRating(garageId);

            return res.json({
                message: 'Review updated successfully',
                review: existingReview
            });
        }

        // Create new review
        const review = new Review({
            customerId: user._id,
            garageId,
            rating,
            comment: comment || ''
        });

        await review.save();
        await recalculateGarageRating(garageId);

        res.status(201).json({
            message: 'Review submitted successfully',
            review
        });
    } catch (error: any) {
        console.error('Submit review error:', error);
        res.status(500).json({ message: 'Failed to submit review', details: error.message });
    }
});

// Get all reviews for a garage (public)
router.get('/garage/:garageId', async (req, res) => {
    await dbConnect();
    try {
        const { garageId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ garageId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'phoneNumber')
            .lean();

        const total = await Review.countDocuments({ garageId });

        // Mask customer phone numbers for privacy
        const maskedReviews = reviews.map(review => ({
            ...review,
            customerPhone: (review.customerId as any)?.phoneNumber
                ? `${(review.customerId as any).phoneNumber.slice(0, 3)}****${(review.customerId as any).phoneNumber.slice(-2)}`
                : 'Anonymous'
        }));

        res.json({
            reviews: maskedReviews,
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + reviews.length < total
            }
        });
    } catch (error: any) {
        console.error('Get garage reviews error:', error);
        res.status(500).json({ message: 'Failed to get reviews' });
    }
});

// Get customer's own review for a garage
router.get('/my-review/:garageId', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { garageId } = req.params;

        const review = await Review.findOne({
            customerId: user._id,
            garageId
        }).lean();

        // Check if customer has service record (to determine if they can review)
        const hasServiceRecord = await ServiceRecord.findOne({
            garageId,
            customerPhone: user.phoneNumber,
            status: 'completed'
        });

        res.json({
            review,
            canReview: !!hasServiceRecord
        });
    } catch (error: any) {
        console.error('Get my review error:', error);
        res.status(500).json({ message: 'Failed to get review' });
    }
});

// Update review
router.put('/:reviewId', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { reviewId } = req.params;
        const { rating, comment } = req.body;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Only review owner can update
        if (review.customerId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You can only update your own reviews' });
        }

        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({ message: 'Rating must be between 1 and 5' });
            }
            review.rating = rating;
        }

        if (comment !== undefined) {
            review.comment = comment;
        }

        await review.save();
        await recalculateGarageRating(review.garageId.toString());

        res.json({ message: 'Review updated successfully', review });
    } catch (error: any) {
        console.error('Update review error:', error);
        res.status(500).json({ message: 'Failed to update review' });
    }
});

// Delete review
router.delete('/:reviewId', authenticate, async (req: AuthRequest, res) => {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Only review owner can delete
        if (review.customerId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own reviews' });
        }

        const garageId = review.garageId.toString();
        await Review.findByIdAndDelete(reviewId);
        await recalculateGarageRating(garageId);

        res.json({ message: 'Review deleted successfully' });
    } catch (error: any) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
});

export default router;
