import mongoose, { Schema, Document, Types } from 'mongoose';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface IBooking extends Document {
    customerId: Types.ObjectId;
    garageId: Types.ObjectId;
    serviceId: Types.ObjectId;
    scheduledDate: Date;
    scheduledTime: string; // e.g., "10:00 AM"
    status: BookingStatus;
    notes?: string;
    totalPrice: number;
    customerPhone: string;
    vehicleInfo?: {
        make: string;
        model: string;
        year: number;
        plateNumber?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    notes: { type: String },
    totalPrice: { type: Number, required: true },
    customerPhone: { type: String, required: true },
    vehicleInfo: {
        make: { type: String },
        model: { type: String },
        year: { type: Number },
        plateNumber: { type: String },
    },
}, { timestamps: true });

// Indexes for common queries
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ garageId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ scheduledDate: 1, garageId: 1 });

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
