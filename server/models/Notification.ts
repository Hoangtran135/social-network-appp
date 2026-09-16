import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['like', 'comment', 'share', 'friend_request', 'friend_accept', 'group_invite', 'system', 'moderation'],
      required: true,
    },
    content: { type: String, required: true },
    targetId: { type: String },
    targetType: { type: String, enum: ['post', 'group', 'profile', 'system'] },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationModel =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
