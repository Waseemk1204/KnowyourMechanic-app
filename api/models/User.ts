import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    firebaseUid: string;
    phoneNumber: string;
    role: 'customer' | 'garage' | 'admin' | 'employee';
    name?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    vehicleNumber?: string;
    fcmToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    firebaseUid: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    role: { type: String, enum: ['customer', 'garage', 'admin', 'employee'], required: true },
    name: { type: String },
    vehicleMake: { type: String },
    vehicleModel: { type: String },
    vehicleYear: { type: String },
    vehicleNumber: { type: String },
    fcmToken: { type: String },
}, { timestamps: true });

// Indexes
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ phoneNumber: 1, role: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
