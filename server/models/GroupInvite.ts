import mongoose, { Schema } from 'mongoose';

const groupInviteSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

groupInviteSchema.index({ group: 1, user: 1 }, { unique: true });

export const GroupInviteModel =
  mongoose.models.GroupInvite || mongoose.model('GroupInvite', groupInviteSchema);
