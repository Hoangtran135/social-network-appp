import mongoose, { Schema } from 'mongoose';

const friendRequestSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
friendRequestSchema.index({ receiver: 1 });
friendRequestSchema.index({ sender: 1 });
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

const friendshipSchema = new Schema(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
// Every friendship/visibility check in the app queries "edges touching this user" —
// this is the single most frequently hit lookup in the whole schema at scale.
friendshipSchema.index({ userA: 1 });
friendshipSchema.index({ userB: 1 });

export const FriendRequestModel =
  mongoose.models.FriendRequest || mongoose.model('FriendRequest', friendRequestSchema);
export const FriendshipModel =
  mongoose.models.Friendship || mongoose.model('Friendship', friendshipSchema);
