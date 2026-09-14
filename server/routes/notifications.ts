import { Router } from 'express';
import { NotificationModel } from '../models/Notification';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { serializeNotification } from '../serialize';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthedRequest, res) => {
  const notifs = await NotificationModel.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 30, 100))
    .skip(Number(req.query.skip) || 0)
    .populate('actor');
  res.json({ notifications: notifs.map(serializeNotification) });
});

notificationsRouter.patch('/:id/read', async (req: AuthedRequest, res) => {
  await NotificationModel.updateOne(
    { _id: req.params.id, user: req.userId },
    { isRead: true }
  );
  res.json({ ok: true });
});

notificationsRouter.patch('/read-all', async (req: AuthedRequest, res) => {
  await NotificationModel.updateMany({ user: req.userId }, { isRead: true });
  res.json({ ok: true });
});
