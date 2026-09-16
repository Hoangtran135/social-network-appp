import mongoose, { Schema } from 'mongoose';

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    avatar: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    rules: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

groupSchema.index({ 'members.user': 1 });
groupSchema.index({ name: 'text', description: 'text' });

export const GroupModel = mongoose.models.Group || mongoose.model('Group', groupSchema);
