import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IEmployee extends Document {
    name: string;
    email: string;
    phone: string;
    referralCode: string;
    firebaseUid?: string;
    role: 'admin' | 'employee';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Generate a unique referral code like KYM-A7X3K
 */
function generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion
    let code = '';
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return `KYM-${code}`;
}

const EmployeeSchema = new Schema<IEmployee>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    referralCode: { type: String, required: true, unique: true },
    firebaseUid: { type: String },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

EmployeeSchema.index({ referralCode: 1 });
EmployeeSchema.index({ firebaseUid: 1 });

// Static method to generate a unique code
EmployeeSchema.statics.generateUniqueCode = async function (): Promise<string> {
    let code: string;
    let exists: boolean;
    do {
        code = generateReferralCode();
        exists = !!(await this.findOne({ referralCode: code }));
    } while (exists);
    return code;
};

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
