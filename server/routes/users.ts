import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { FriendRequestModel, FriendshipModel } from '../models/FriendRequest';
import { createNotification } from '../notify';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '../schemas';
import { serializeUser, serializeMe } from '../serialize';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', async (req: AuthedRequest, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter: Record<string, unknown> = {};
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
  }
  if (req.query.role === 'admin' || req.query.role === 'user') filter.role = req.query.role;
  if (req.query.banned === 'true') filter.isBanned = true;
  const users = await UserModel.find(filter).limit(500);
  res.json({ users: users.map(serializeUser) });
});

usersRouter.get('/:id', async (req, res) => {
  const user = await UserModel.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  res.json({ user: serializeUser(user) });
});

usersRouter.patch('/me', validateBody(updateProfileSchema), async (req: AuthedRequest, res) => {
  const allowed = ['name', 'bio', 'avatar', 'coverImage', 'workplace', 'education', 'location', 'website'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  const user = await UserModel.findByIdAndUpdate(req.userId, updates, { new: true });
  res.json({ user: serializeMe(user) });
});

usersRouter.patch('/me/password', validateBody(changePasswordSchema), async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await UserModel.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    return;
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
});

// Blocking is mutual in effect: once A blocks B, existing friendship/pending requests
// between them are torn down and neither can re-friend or message the other (enforced
// in friends.ts / messages.ts).
usersRouter.post('/:id/block', async (req: AuthedRequest, res) => {
  const targetId = req.params.id;
  if (targetId === req.userId) {
    res.status(400).json({ error: 'Không thể tự chặn chính mình.' });
    return;
  }
  const me = await UserModel.findById(req.userId);
  if (!me) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  if (!me.blockedUsers.some((id: any) => id.toString() === targetId)) {
    me.blockedUsers.push(targetId as any);
    await me.save();
  }
  await Promise.all([
    FriendshipModel.deleteOne({
      $or: [
        { userA: req.userId, userB: targetId },
        { userA: targetId, userB: req.userId },
      ],
    }),
    FriendRequestModel.deleteMany({
      $or: [
        { sender: req.userId, receiver: targetId },
        { sender: targetId, receiver: req.userId },
      ],
    }),
  ]);
  res.json({ user: serializeMe(me) });
});

usersRouter.delete('/:id/block', async (req: AuthedRequest, res) => {
  const me = await UserModel.findById(req.userId);
  if (!me) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  me.blockedUsers = me.blockedUsers.filter((id: any) => id.toString() !== req.params.id) as any;
  await me.save();
  res.json({ user: serializeMe(me) });
});

usersRouter.patch('/:id/ban', requireAdmin, async (req: AuthedRequest, res) => {
  const target = await UserModel.findById(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  target.isBanned = !target.isBanned;
  await target.save();
  await createNotification({
    user: target._id,
    actor: req.userId,
    type: 'system',
    content: target.isBanned
      ? 'Tài khoản của bạn đã bị khóa do vi phạm chính sách cộng đồng.'
      : 'Tài khoản của bạn đã được mở khóa.',
    targetType: 'system',
  });
  res.json({ user: serializeUser(target) });
});

usersRouter.patch('/:id/role', requireAdmin, async (req: AuthedRequest, res) => {
  const target = await UserModel.findById(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  target.role = target.role === 'admin' ? 'user' : 'admin';
  await target.save();
  res.json({ user: serializeUser(target) });
});
