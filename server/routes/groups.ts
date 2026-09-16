import { Router } from 'express';
import { GroupModel } from '../models/Group';
import { UserModel } from '../models/User';
import { GroupJoinRequestModel } from '../models/GroupJoinRequest';
import { GroupInviteModel } from '../models/GroupInvite';
import { FriendshipModel } from '../models/FriendRequest';
import { PostModel } from '../models/Post';
import { createNotification } from '../notify';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createGroupSchema, groupInviteSchema, groupPromoteSchema, groupRulesSchema } from '../schemas';
import { serializeGroup, serializeGroupJoinRequest } from '../serialize';
import { emitToUser, emitToUsers, broadcastToAll } from '../realtime';

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

// Fetches a single group not yet present in the client's already-loaded list — e.g. a brand
// new group referenced by an invite/promotion notification the client hasn't fetched yet.
groupsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id).populate('members.user creator');
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  const [hasPendingJoinRequest, hasPendingInvite, joinRequestsCount] = await Promise.all([
    GroupJoinRequestModel.exists({ group: group._id, user: req.userId }),
    GroupInviteModel.exists({ group: group._id, user: req.userId }),
    (group as any).members.some((m: any) => id(m) === req.userId && ['admin', 'moderator'].includes(m.role))
      ? GroupJoinRequestModel.countDocuments({ group: group._id })
      : Promise.resolve(undefined),
  ]);
  res.json({
    group: serializeGroup(group, req.userId, {
      hasPendingJoinRequest: !!hasPendingJoinRequest,
      hasPendingInvite: !!hasPendingInvite,
      joinRequestsCount,
    }),
  });
});

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
  // Public groups show up in everyone's "Discover" tab live; private ones stay invisible
  // until an invite/join-request brings someone in individually.
  if (group.privacy === 'public') broadcastToAll('group:new', { group: serializeGroup(group, undefined) }, req.userId);
});

function findMembership(group: any, userId: string | undefined) {
  return group.members.find((m: any) => m.user._id.toString() === userId || m.user.toString() === userId);
}

// Pushes the group's current state live to every member — used after membership/role/rules
// changes so everyone already in the group sees it without a manual refresh. Each recipient's
// own isMember/isAdmin flags stay whatever their client already has (they're a current member
// either way), only the shared fields (members list, rules, ...) actually need to travel.
function broadcastGroupUpdate(group: any, excludeUserId?: string) {
  const memberIds = (group.members || [])
    .map((m: any) => (m.user?._id ? m.user._id.toString() : m.user?.toString?.() || m.user))
    .filter((uid: string) => uid !== excludeUserId);
  emitToUsers(memberIds, 'group:update', { group: serializeGroup(group, undefined) });
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
    broadcastGroupUpdate(group, req.userId);
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
  // Let admins/moderators already viewing the group see the new request badge without reload.
  const requestsCount = await GroupJoinRequestModel.countDocuments({ group: group._id });
  admins.forEach((m: any) => {
    const adminId = m.user?._id ? m.user._id.toString() : m.user.toString();
    emitToUser(adminId, 'group:update', {
      group: serializeGroup(group, adminId, { joinRequestsCount: requestsCount }),
    });
  });
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
  broadcastGroupUpdate(group, req.userId);
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
  broadcastGroupUpdate(group, req.userId);
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
  broadcastGroupUpdate(group, req.userId);
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
    broadcastGroupUpdate(group, req.userId);
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
  // The invitee doesn't have this group in their local list at all yet — send it to them
  // directly (with their own viewer-specific hasPendingInvite flag) rather than the generic
  // member broadcast, which would be wrong for someone who isn't a member yet.
  emitToUser(userId, 'group:update', { group: serializeGroup(group, userId, { hasPendingInvite: true }) });
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
  broadcastGroupUpdate(group, req.userId);
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
  broadcastGroupUpdate(group, req.userId);
  // The removed member isn't in `members` anymore so the broadcast above skips them —
  // tell them directly that they're out.
  emitToUser(req.params.userId, 'group:member-removed', { groupId: group._id.toString() });
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
  broadcastGroupUpdate(group, req.userId);
});

groupsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const group = await GroupModel.findById(req.params.id);
  if (!group) {
    res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    return;
  }
  if (group.creator.toString() !== req.userId) {
    const me = await UserModel.findById(req.userId);
    if (!me || me.role !== 'admin') {
      res.status(403).json({ error: 'Chỉ người tạo nhóm hoặc quản trị viên mới có thể xóa nhóm.' });
      return;
    }
  }
  const memberIds = group.members.map((m: any) => m.user.toString()).filter((uid: string) => uid !== req.userId);
  await group.deleteOne();
  await PostModel.deleteMany({ group: req.params.id });
  await GroupJoinRequestModel.deleteMany({ group: req.params.id });
  await GroupInviteModel.deleteMany({ group: req.params.id });
  res.json({ ok: true });
  emitToUsers(memberIds, 'group:deleted', { groupId: req.params.id });
});
