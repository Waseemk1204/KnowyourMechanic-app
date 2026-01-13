import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    firebaseUid: string;
    phoneNumber: string;
    role: 'customer' | 'garage';
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    firebaseUid: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    role: { type: String, enum: ['customer', 'garage'], required: true },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
