import { Router } from 'express';
import { GroupModel } from '../models/Group';
import { GroupJoinRequestModel } from '../models/GroupJoinRequest';
import { GroupInviteModel } from '../models/GroupInvite';
import { FriendshipModel } from '../models/FriendRequest';
import { PostModel } from '../models/Post';
import { createNotification } from '../notify';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createGroupSchema, groupInviteSchema, groupPromoteSchema, groupRulesSchema } from '../schemas';
import { serializeGroup, serializeGroupJoinRequest } from '../serialize';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

groupsRouter.get('/', async (req: AuthedRequest, res) => {
  const groups = await GroupModel.find().limit(300).populate('members.user creator');
  const myPendingRequests = await GroupJoinRequestModel.find({ user: req.userId }).select('group');
  const pendingGroupIds = new Set(myPendingRequests.map((r: any) => r.group.toString()));
  const myPendingInvites = await GroupInviteModel.find({ user: req.userId }).select('group');
  const invitedGroupIds = new Set(myPendingInvites.map((r: any) => r.group.toString()));

  const adminGroupIds = groups
    .filter((g: any) => g.members.some((m: any) => id(m) === req.userId && ['admin', 'moderator'].includes(m.role)))
    .map((g: any) => g._id);
  const requestCounts = await GroupJoinRequestModel.aggregate([
    { $match: { group: { $in: adminGroupIds } } },
    { $group: { _id: '$group', count: { $sum: 1 } } },
  ]);
  const countByGroup = new Map(requestCounts.map((r: any) => [r._id.toString(), r.count]));

  res.json({
    groups: groups.map((g: any) =>
      serializeGroup(g, req.userId, {
        hasPendingJoinRequest: pendingGroupIds.has(g._id.toString()),
        joinRequestsCount: countByGroup.get(g._id.toString()),
        hasPendingInvite: invitedGroupIds.has(g._id.toString()),
      })
    ),
  });
});

function id(m: any) {
  return (m.user?._id ? m.user._id : m.user).toString();
}

groupsRouter.post('/', validateBody(createGroupSchema), async (req: AuthedRequest, res) => {
  const { name, description, privacy, avatar, coverImage } = req.body;
  const group = await GroupModel.create({
    name,
    description,
    privacy,
    avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&q=80',
    coverImage: coverImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    creator: req.userId,
    members: [{ user: req.userId, role: 'admin' }],
    rules: ['Tôn trọng các thành viên khác.', 'Không đăng tải spam, nội dung độc hại.'],
  });
  await group.populate('members.user creator');
  res.json({ group: serializeGroup(group, req.userId) });
});

function findMembership(group: any, userId: string | undefined) {
  return group.members.find((m: any) => m.user._id.toString() === userId || m.user.toString() === userId);
}

groupsRouter.post('/:id/join', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  if (findMembership(group, req.userId)) {
    res.json({ group: serializeGroup(group, req.userId) });
    return;
  }

  // Already invited by an admin? Joining is then just accepting that invite — no need to
  // queue a separate request for someone who's already been asked in.
  const pendingInvite = await GroupInviteModel.findOne({ group: group._id, user: req.userId });
  if (pendingInvite) {
    group.members.push({ user: req.userId, role: 'member' } as any);
    await group.save();
    await group.populate('members.user creator');
    await pendingInvite.deleteOne();
    res.json({ group: serializeGroup(group, req.userId) });
    return;
  }

  try {
    await GroupJoinRequestModel.create({ group: group._id, user: req.userId });
  } catch (err: any) {
    if (err?.code !== 11000) throw err; // ignore duplicate-request race
  }

  const admins = group.members.filter((m: any) => m.role === 'admin' || m.role === 'moderator');
  await Promise.all(
    admins.map((m: any) =>
      createNotification({
        user: m.user,
        actor: req.userId,
        type: 'group_invite',
        content: `đã yêu cầu tham gia nhóm "${group.name}".`,
        targetId: group._id.toString(),
        targetType: 'group',
      })
    )
  );

  res.json({ group: serializeGroup(group, req.userId, { hasPendingJoinRequest: true }) });
});

groupsRouter.get('/:id/join-requests', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
    res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể xem yêu cầu tham gia.' });
    return;
  }
  const requests = await GroupJoinRequestModel.find({ group: group._id }).sort({ createdAt: -1 }).populate('user');
  res.json({ requests: requests.map(serializeGroupJoinRequest) });
});

groupsRouter.post('/:id/join-requests/:userId/approve', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
    res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể duyệt yêu cầu.' });
    return;
  }
  const request = await GroupJoinRequestModel.findOne({ group: group._id, user: req.params.userId });
  if (!request) {
    res.status(404).json({ error: 'Không tìm thấy yêu cầu tham gia.' });
    return;
  }
  if (!findMembership(group, req.params.userId)) {
    group.members.push({ user: req.params.userId, role: 'member' } as any);
    await group.save();
    await group.populate('members.user creator');
  }
  await request.deleteOne();
  await GroupInviteModel.deleteOne({ group: group._id, user: req.params.userId });

  await createNotification({
    user: req.params.userId,
    actor: req.userId,
    type: 'group_invite',
    content: `đã chấp nhận yêu cầu tham gia nhóm "${group.name}" của bạn.`,
    targetId: group._id.toString(),
    targetType: 'group',
  });

  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/join-requests/:userId/reject', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
    res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể từ chối yêu cầu.' });
    return;
  }
  await GroupJoinRequestModel.deleteOne({ group: group._id, user: req.params.userId });
  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/leave', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  const otherMembersRemain = group.members.some((m: any) => m.user._id.toString() !== req.userId);
  const admins = group.members.filter((m: any) => m.role === 'admin');
  const isSoleAdmin = requester?.role === 'admin' && admins.length === 1;
  if (isSoleAdmin && otherMembersRemain) {
    res.status(400).json({
      error: 'Bạn là trưởng nhóm duy nhất. Hãy bổ nhiệm người khác làm trưởng nhóm trước khi rời khỏi.',
    });
    return;
  }
  group.members = group.members.filter((m: any) => m.user._id.toString() !== req.userId) as any;
  await group.save();
  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/members/:userId/promote', validateBody(groupPromoteSchema), async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  const target = findMembership(group, req.params.userId);
  if (!requester || requester.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ trưởng nhóm mới có thể bổ nhiệm.' });
    return;
  }
  if (!target) {
    res.status(404).json({ error: 'Người dùng không thuộc nhóm.' });
    return;
  }
  target.role = req.body.role === 'admin' ? 'admin' : 'moderator';
  await group.save();
  await group.populate('members.user creator');

  await createNotification({
    user: req.params.userId,
    actor: req.userId,
    type: 'group_invite',
    content:
      target.role === 'admin'
        ? `đã bổ nhiệm bạn làm trưởng nhóm "${group.name}".`
        : `đã bổ nhiệm bạn làm phó nhóm "${group.name}".`,
    targetId: group._id.toString(),
    targetType: 'group',
  });

  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/invite', validateBody(groupInviteSchema), async (req: AuthedRequest, res) => {
  const { userId } = req.body;
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
    res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể mời thành viên.' });
    return;
  }
  if (findMembership(group, userId)) {
    res.status(409).json({ error: 'Người này đã là thành viên của nhóm.' });
    return;
  }
  const isFriend = await FriendshipModel.exists({
    $or: [
      { userA: req.userId, userB: userId },
      { userA: userId, userB: req.userId },
    ],
  });
  if (!isFriend) {
    res.status(403).json({ error: 'Bạn chỉ có thể mời bạn bè vào nhóm.' });
    return;
  }

  // If this person already asked to join, an invite from an admin just approves that
  // request outright instead of creating a redundant, separately-confirmable invite.
  const existingRequest = await GroupJoinRequestModel.findOne({ group: group._id, user: userId });
  if (existingRequest) {
    group.members.push({ user: userId, role: 'member' } as any);
    await group.save();
    await group.populate('members.user creator');
    await existingRequest.deleteOne();
    await createNotification({
      user: userId,
      actor: req.userId,
      type: 'group_invite',
      content: `đã chấp nhận yêu cầu tham gia nhóm "${group.name}" của bạn.`,
      targetId: group._id.toString(),
      targetType: 'group',
    });
    res.json({ group: serializeGroup(group, req.userId) });
    return;
  }

  try {
    await GroupInviteModel.create({ group: group._id, user: userId, invitedBy: req.userId });
  } catch (err: any) {
    if (err?.code !== 11000) throw err; // ignore duplicate-invite race
  }

  await createNotification({
    user: userId,
    actor: req.userId,
    type: 'group_invite',
    content: `đã mời bạn tham gia nhóm "${group.name}". Bấm để xem và xác nhận.`,
    targetId: group._id.toString(),
    targetType: 'group',
  });

  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/invites/accept', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const invite = await GroupInviteModel.findOne({ group: group._id, user: req.userId });
  if (!invite) {
    res.status(404).json({ error: 'Không tìm thấy lời mời tham gia nhóm.' });
    return;
  }
  if (!findMembership(group, req.userId)) {
    group.members.push({ user: req.userId, role: 'member' } as any);
    await group.save();
    await group.populate('members.user creator');
  }
  await invite.deleteOne();
  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/invites/decline', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  await GroupInviteModel.deleteOne({ group: group._id, user: req.userId });
  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.post('/:id/members/:userId/remove', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  const target = findMembership(group, req.params.userId);
  if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
    res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể xóa thành viên.' });
    return;
  }
  if (!target) {
    res.status(404).json({ error: 'Người dùng không thuộc nhóm.' });
    return;
  }
  if (target.role === 'admin') {
    res.status(403).json({ error: 'Không thể xóa trưởng nhóm.' });
    return;
  }
  if (target.role === 'moderator' && requester.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ trưởng nhóm mới có thể xóa phó nhóm.' });
    return;
  }
  group.members = group.members.filter((m: any) => m.user._id.toString() !== req.params.userId) as any;
  await group.save();
  await group.populate('members.user creator');
  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.patch('/:id/rules', validateBody(groupRulesSchema), async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const requester = findMembership(group, req.userId);
  if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
    res.status(403).json({ error: 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể chỉnh sửa quy tắc.' });
    return;
  }
  group.rules = req.body.rules;
  await group.save();
  res.json({ group: serializeGroup(group, req.userId) });
});

groupsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  if (group.creator.toString() !== req.userId) {
    res.status(403).json({ error: 'Chỉ người tạo nhóm mới có thể xóa nhóm.' });
    return;
  }
  await group.deleteOne();
  await PostModel.deleteMany({ group: req.params.id });
  await GroupJoinRequestModel.deleteMany({ group: req.params.id });
  await GroupInviteModel.deleteMany({ group: req.params.id });
  res.json({ ok: true });
});
