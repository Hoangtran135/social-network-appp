import mongoose, { Schema } from 'mongoose';

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'user', 'comment', 'group'], required: true },
    targetId: { type: String, required: true },
    targetName: { type: String },
    reason: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    resolutionNote: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'alert'], default: 'info' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ReportModel = mongoose.models.Report || mongoose.model('Report', reportSchema);
export const AnnouncementModel =
  mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
