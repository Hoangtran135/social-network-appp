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

// The notifications list is always "mine, newest first" and the bell badge is always
// "mine, unread" — both need this compound index to stay fast as the collection grows.
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
