import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReport extends Document {
    reporterId: Types.ObjectId;
    garageId: Types.ObjectId;
    serviceRecordId?: Types.ObjectId;
    reason: 'fraud' | 'overcharging' | 'poor_service' | 'harassment' | 'other';
    description: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', required: true },
    serviceRecordId: { type: Schema.Types.ObjectId, ref: 'ServiceRecord' },
    reason: {
        type: String,
        required: true,
        enum: ['fraud', 'overcharging', 'poor_service', 'harassment', 'other'],
    },
    description: { type: String, required: true, maxlength: 1000 },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    },
}, { timestamps: true });

ReportSchema.index({ reporterId: 1 });
ReportSchema.index({ garageId: 1 });
ReportSchema.index({ status: 1 });

export default mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);
