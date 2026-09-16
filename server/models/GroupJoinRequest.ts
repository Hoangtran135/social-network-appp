import mongoose, { Schema } from 'mongoose';

const groupJoinRequestSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

groupJoinRequestSchema.index({ group: 1, user: 1 }, { unique: true });

export const GroupJoinRequestModel =
  mongoose.models.GroupJoinRequest || mongoose.model('GroupJoinRequest', groupJoinRequestSchema);
