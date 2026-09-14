import { Router } from 'express';
import { GroupModel } from '../models/Group';
import { PostModel } from '../models/Post';
import { createNotification } from '../notify';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createGroupSchema, groupInviteSchema, groupPromoteSchema } from '../schemas';
import { serializeGroup } from '../serialize';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

groupsRouter.get('/', async (req: AuthedRequest, res) => {
  const groups = await GroupModel.find().limit(300).populate('members.user creator');
  res.json({ groups: groups.map((g) => serializeGroup(g, req.userId)) });
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
  if (!findMembership(group, req.userId)) {
    group.members.push({ user: req.userId, role: 'member' } as any);
    await group.save();
    await group.populate('members.user creator');
  }
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
  group.members.push({ user: userId, role: 'member' } as any);
  await group.save();
  await group.populate('members.user creator');

  await createNotification({
    user: userId,
    actor: req.userId,
    type: 'group_invite',
    content: `đã mời bạn tham gia nhóm "${group.name}".`,
    targetId: group._id.toString(),
    targetType: 'group',
  });

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
  res.json({ ok: true });
});
