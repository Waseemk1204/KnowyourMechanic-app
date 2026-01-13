import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGarage extends Document {
    userId: Types.ObjectId;
    name: string;
    location: {
        address: string;
        coordinates: [number, number];
    };
    serviceHours: string;
    workingDays: string;
    photoUrl?: string;
    rating: number;
    totalReviews: number;
    createdAt: Date;
    updatedAt: Date;
}

const GarageSchema = new Schema<IGarage>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    location: {
        address: { type: String },
        coordinates: { type: [Number], index: '2dsphere' },
    },
    serviceHours: { type: String },
    workingDays: { type: String },
    photoUrl: { type: String },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

GarageSchema.index({ 'location.coordinates': '2dsphere' });

export default mongoose.models.Garage || mongoose.model<IGarage>('Garage', GarageSchema);
