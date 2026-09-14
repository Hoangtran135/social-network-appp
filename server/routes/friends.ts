import { Router } from 'express';
import { FriendRequestModel, FriendshipModel } from '../models/FriendRequest';
import { UserModel } from '../models/User';
import { createNotification } from '../notify';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendFriendRequestSchema } from '../schemas';
import { serializeFriendRequest, serializeUser } from '../serialize';

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

// Friends of the current user
friendsRouter.get('/', async (req: AuthedRequest, res) => {
  const edges = await FriendshipModel.find({
    $or: [{ userA: req.userId }, { userB: req.userId }],
  }).populate(['userA', 'userB']);
  const friends = edges.map((e: any) =>
    e.userA._id.toString() === req.userId ? serializeUser(e.userB) : serializeUser(e.userA)
  );
  res.json({ friends });
});

async function getFriendIdSet(userId: string): Promise<Set<string>> {
  const edges = await FriendshipModel.find({ $or: [{ userA: userId }, { userB: userId }] });
  return new Set(
    edges.map((e: any) => (e.userA.toString() === userId ? e.userB.toString() : e.userA.toString()))
  );
}

// Requests addressed to me
friendsRouter.get('/requests', async (req: AuthedRequest, res) => {
  const requests = await FriendRequestModel.find({ receiver: req.userId }).populate('sender');
  const myFriendIds = await getFriendIdSet(req.userId!);
  const withMutuals = await Promise.all(
    requests.map(async (r: any) => {
      const senderFriendIds = await getFriendIdSet(r.sender._id.toString());
      const mutualCount = [...senderFriendIds].filter((id) => myFriendIds.has(id)).length;
      return serializeFriendRequest(r, mutualCount);
    })
  );
  res.json({ requests: withMutuals });
});

// Requests I sent out, still pending
friendsRouter.get('/requests/sent', async (req: AuthedRequest, res) => {
  const requests = await FriendRequestModel.find({ sender: req.userId }).populate('sender');
  res.json({ requests: requests.map((r) => serializeFriendRequest(r)) });
});

friendsRouter.post('/requests', validateBody(sendFriendRequestSchema), async (req: AuthedRequest, res) => {
  const { targetUserId } = req.body;
  if (targetUserId === req.userId) {
    res.status(400).json({ error: 'Không thể gửi lời mời cho chính mình.' });
    return;
  }
  const existing = await FriendRequestModel.findOne({ sender: req.userId, receiver: targetUserId });
  if (existing) {
    res.status(409).json({ error: 'Đã gửi lời mời trước đó.' });
    return;
  }
  const [me, target] = await Promise.all([UserModel.findById(req.userId), UserModel.findById(targetUserId)]);
  const blocked =
    me?.blockedUsers.some((id: any) => id.toString() === targetUserId) ||
    target?.blockedUsers.some((id: any) => id.toString() === req.userId);
  if (blocked) {
    res.status(403).json({ error: 'Không thể gửi lời mời kết bạn cho người dùng này.' });
    return;
  }
  const request = await FriendRequestModel.create({ sender: req.userId, receiver: targetUserId });
  await request.populate('sender');

  await createNotification({
    user: targetUserId,
    actor: req.userId,
    type: 'friend_request',
    content: 'đã gửi cho bạn một lời mời kết bạn.',
    targetId: req.userId,
    targetType: 'profile',
  });

  res.json({ request: serializeFriendRequest(request) });
});

friendsRouter.post('/requests/:id/accept', async (req: AuthedRequest, res) => {
  const request = await FriendRequestModel.findById(req.params.id).populate('sender');
  if (!request || request.receiver.toString() !== req.userId) {
    res.status(404).json({ error: 'Không tìm thấy lời mời.' });
    return;
  }
  await FriendshipModel.create({ userA: req.userId, userB: request.sender._id });
  await request.deleteOne();

  await createNotification({
    user: request.sender._id,
    actor: req.userId,
    type: 'friend_accept',
    content: 'đã chấp nhận lời mời kết bạn của bạn.',
    targetId: req.userId,
    targetType: 'profile',
  });

  res.json({ ok: true });
});

friendsRouter.post('/requests/:id/reject', async (req: AuthedRequest, res) => {
  const request = await FriendRequestModel.findById(req.params.id);
  if (!request || request.receiver.toString() !== req.userId) {
    res.status(404).json({ error: 'Không tìm thấy lời mời.' });
    return;
  }
  await request.deleteOne();
  res.json({ ok: true });
});

// Public: friends of any given user (for viewing their profile's friends tab)
friendsRouter.get('/of/:userId', async (req: AuthedRequest, res) => {
  const edges = await FriendshipModel.find({
    $or: [{ userA: req.params.userId }, { userB: req.params.userId }],
  }).populate(['userA', 'userB']);
  const friends = edges.map((e: any) =>
    e.userA._id.toString() === req.params.userId ? serializeUser(e.userB) : serializeUser(e.userA)
  );
  res.json({ friends });
});

friendsRouter.delete('/requests/:id', async (req: AuthedRequest, res) => {
  const request = await FriendRequestModel.findById(req.params.id);
  if (!request || request.sender.toString() !== req.userId) {
    res.status(404).json({ error: 'Không tìm thấy lời mời.' });
    return;
  }
  await request.deleteOne();
  res.json({ ok: true });
});

friendsRouter.delete('/:userId', async (req: AuthedRequest, res) => {
  await FriendshipModel.deleteOne({
    $or: [
      { userA: req.userId, userB: req.params.userId },
      { userA: req.params.userId, userB: req.userId },
    ],
  });
  res.json({ ok: true });
});
