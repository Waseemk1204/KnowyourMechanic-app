import mongoose, { Schema, Document, Types } from 'mongoose';

export type BusinessType = 'individual' | 'partnership' | 'proprietorship' | 'private_limited' | 'public_limited';
export type OnboardingStatus = 'pending' | 'bank_details' | 'verification' | 'completed';

export interface IBankDetails {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName?: string;
}

export interface IGarage extends Document {
    userId: Types.ObjectId;
    name: string;
    email: string;
    phone: string;
    location: {
        address: string;
        coordinates: [number, number];
    };
    serviceHours: string;
    workingDays: string;
    photoUrl?: string;
    rating: number;
    totalReviews: number;

    // Business & Banking
    businessType: BusinessType;
    legalBusinessName: string;
    bankDetails?: IBankDetails;

    // Razorpay
    razorpayAccountId?: string;

    // Onboarding
    onboardingStatus: OnboardingStatus;
    isVerified: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>({
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    bankName: { type: String },
}, { _id: false });

const GarageSchema = new Schema<IGarage>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    location: {
        address: { type: String },
        coordinates: { type: [Number], index: '2dsphere' },
    },
    serviceHours: { type: String },
    workingDays: { type: String },
    photoUrl: { type: String },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // Business & Banking
    businessType: {
        type: String,
        enum: ['individual', 'partnership', 'proprietorship', 'private_limited', 'public_limited'],
        default: 'individual'
    },
    legalBusinessName: { type: String },
    bankDetails: { type: BankDetailsSchema },

    // Razorpay
    razorpayAccountId: { type: String },

    // Onboarding
    onboardingStatus: {
        type: String,
        enum: ['pending', 'bank_details', 'verification', 'completed'],
        default: 'pending'
    },
    isVerified: { type: Boolean, default: false },
}, { timestamps: true });

GarageSchema.index({ 'location.coordinates': '2dsphere' });
GarageSchema.index({ razorpayAccountId: 1 });
GarageSchema.index({ onboardingStatus: 1 });

export default mongoose.models.Garage || mongoose.model<IGarage>('Garage', GarageSchema);
