import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IService extends Document {
    garageId: Types.ObjectId;
    name: string;
    description?: string;
    price: number;
    duration: number; // in minutes
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema = new Schema<IService>({
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    duration: { type: Number, required: true, default: 60 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

ServiceSchema.index({ garageId: 1 });

export default mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);
