import { NotificationModel } from './models/Notification';
import { serializeNotification } from './serialize';
import { emitToUser } from './realtime';

interface CreateNotificationInput {
  user: any;
  actor: any;
  type: string;
  content: string;
  targetId?: string;
  targetType?: string;
}

// Thin wrapper around NotificationModel.create that also pushes the notification live
// over Socket.io — use this instead of NotificationModel.create directly so every
// notification-producing action (likes, comments, friend requests, admin actions...)
// shows up instantly client-side without a manual refresh.
export async function createNotification(data: CreateNotificationInput) {
  const notif = await NotificationModel.create(data);
  await notif.populate('actor');
  emitToUser(data.user.toString(), 'notification:new', serializeNotification(notif));
  return notif;
}
