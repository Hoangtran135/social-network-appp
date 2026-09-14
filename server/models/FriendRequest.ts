import mongoose, { Schema } from 'mongoose';

const friendRequestSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const friendshipSchema = new Schema(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const FriendRequestModel =
  mongoose.models.FriendRequest || mongoose.model('FriendRequest', friendRequestSchema);
export const FriendshipModel =
  mongoose.models.Friendship || mongoose.model('Friendship', friendshipSchema);
