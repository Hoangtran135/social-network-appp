import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { FriendRequestModel, FriendshipModel } from '../models/FriendRequest';
import { createNotification } from '../notify';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '../schemas';
import { serializeUser, serializeMe } from '../serialize';
import { emitToUser, emitToUsers, disconnectUser } from '../realtime';

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
  if (req.query.bot === 'true') filter.isBot = true;
  if (req.query.online === 'true') filter.isOnline = true;

  // Bounded, ordered pagination — the old unpaginated `.limit(500)` meant a 10k-user
  // instance silently dropped everyone past the first (arbitrarily-ordered) 500.
  const limit = Math.min(Number(req.query.limit) || 60, 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);
  const [users, total] = await Promise.all([
    UserModel.find(filter).sort({ joinDate: -1 }).skip(skip).limit(limit),
    UserModel.countDocuments(filter),
  ]);
  res.json({ users: users.map(serializeUser), total });
});

// Cheap aggregate counts for the admin dashboard — avoids pulling every user document
// over the wire just to display a couple of numbers.
usersRouter.get('/stats', requireAdmin, async (_req, res) => {
  const [total, online, banned, admins] = await Promise.all([
    UserModel.countDocuments({}),
    UserModel.countDocuments({ isOnline: true }),
    UserModel.countDocuments({ isBanned: true }),
    UserModel.countDocuments({ role: 'admin' }),
  ]);
  res.json({ total, online, banned, admins });
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
    type: 'moderation',
    content: target.isBanned
      ? 'Tài khoản của bạn đã bị khóa do vi phạm chính sách cộng đồng.'
      : 'Tài khoản của bạn đã được mở khóa.',
    targetType: 'system',
  });
  if (target.isBanned) {
    // A still-valid access token would otherwise keep working for up to 15 more minutes —
    // tell the client to log out right now, then drop their sockets once that's had a
    // moment to actually reach them (an immediate disconnect can race the emit itself).
    emitToUser(target._id.toString(), 'user:banned', {});
    setTimeout(() => disconnectUser(target._id.toString()), 300);
  }
  res.json({ user: serializeUser(target) });
  await broadcastUserUpdateToAdmins(target, req.userId);
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
  await broadcastUserUpdateToAdmins(target, req.userId);
});

// Keeps every other admin's user-management table in sync live — without this, a second
// admin viewing the same list only sees a ban/role change after they happen to reload.
async function broadcastUserUpdateToAdmins(target: any, excludeUserId: string | undefined) {
  const admins = await UserModel.find({ role: 'admin' }, '_id');
  emitToUsers(
    admins.map((a) => a._id.toString()).filter((uid) => uid !== excludeUserId),
    'admin:user-update',
    { user: serializeUser(target) }
  );
}
