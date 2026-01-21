import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
    customerId: Types.ObjectId;
    garageId: Types.ObjectId;
    rating: number; // 1-5
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
}, { timestamps: true });

// Indexes
ReviewSchema.index({ garageId: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1 });

// Unique constraint: one review per customer per garage
ReviewSchema.index({ customerId: 1, garageId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
