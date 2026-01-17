import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentMethod = 'cash' | 'razorpay';
export type ServiceStatus = 'pending_otp' | 'otp_verified' | 'payment_pending' | 'completed' | 'cancelled';

export interface IServiceRecord extends Document {
    garageId: Types.ObjectId;
    garageName: string;
    customerPhone: string;
    description: string;
    amount: number;
    platformFee: number;
    garageEarnings: number;
    paymentMethod?: PaymentMethod;
    status: ServiceStatus;
    isReliable: boolean; // false for cash payments
    otp?: string;
    otpExpiry?: Date;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Static platform fee: ₹1.90 (in rupees)
const PLATFORM_FEE = 1.9;

const ServiceRecordSchema = new Schema<IServiceRecord>({
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', required: true },
    garageName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    garageEarnings: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'razorpay'] },
    status: {
        type: String,
        enum: ['pending_otp', 'otp_verified', 'payment_pending', 'completed', 'cancelled'],
        default: 'pending_otp'
    },
    isReliable: { type: Boolean, default: true },
    otp: { type: String },
    otpExpiry: { type: Date },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
}, { timestamps: true });

// Indexes
ServiceRecordSchema.index({ garageId: 1, createdAt: -1 });
ServiceRecordSchema.index({ customerPhone: 1 });
ServiceRecordSchema.index({ status: 1 });

// Static method to calculate fees (static ₹1.90)
ServiceRecordSchema.statics.calculateFees = function (amount: number) {
    const platformFee = PLATFORM_FEE;
    const garageEarnings = amount - platformFee;
    return { platformFee, garageEarnings };
};

export default mongoose.models.ServiceRecord || mongoose.model<IServiceRecord>('ServiceRecord', ServiceRecordSchema);
export { PLATFORM_FEE };
