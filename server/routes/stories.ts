import { Router } from 'express';
import { StoryModel } from '../models/Story';
import { FriendshipModel } from '../models/FriendRequest';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { serializeStory } from '../serialize';
import { emitToUsers, broadcastToAll } from '../realtime';

export const storiesRouter = Router();
storiesRouter.use(requireAuth);

async function getFriendIds(userId: string | undefined): Promise<string[]> {
  const friendEdges = await FriendshipModel.find({ $or: [{ userA: userId }, { userB: userId }] });
  return friendEdges.map((e: any) => (e.userA.toString() === userId ? e.userB.toString() : e.userA.toString()));
}

async function broadcastStory(story: any, event: 'story:new' | 'story:delete', payload: unknown, authorId: string) {
  if (story.privacy === 'friends') {
    const friendIds = await getFriendIds(authorId);
    emitToUsers(friendIds, event, payload);
  } else {
    broadcastToAll(event, payload, authorId);
  }
}

storiesRouter.get('/', async (req: AuthedRequest, res) => {
  const stories = await StoryModel.find({ expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .populate(['user', 'viewers.user']);

  const friendEdges = await FriendshipModel.find({ $or: [{ userA: req.userId }, { userB: req.userId }] });
  const friendIds = new Set(
    friendEdges.map((e: any) => (e.userA.toString() === req.userId ? e.userB.toString() : e.userA.toString()))
  );

  const visible = stories.filter((s: any) => {
    const authorId = s.user._id ? s.user._id.toString() : s.user.toString();
    if (authorId === req.userId) return true;
    if (s.privacy === 'friends') return friendIds.has(authorId);
    return true; // public
  });

  res.json({ stories: visible.map(serializeStory) });
});

storiesRouter.post('/', async (req: AuthedRequest, res) => {
  const { type, mediaUrl, textContent, backgroundGradient, privacy } = req.body;
  const story = await StoryModel.create({
    user: req.userId,
    type,
    privacy: privacy === 'friends' ? 'friends' : 'public',
    mediaUrl,
    textContent,
    backgroundGradient,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await story.populate('user');
  res.json({ story: serializeStory(story) });
  broadcastStory(story, 'story:new', { story: serializeStory(story) }, req.userId!);
});

storiesRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const story = await StoryModel.findById(req.params.id);
  if (!story) {
    res.status(404).json({ error: 'Không tìm thấy story.' });
    return;
  }
  if (story.user.toString() !== req.userId) {
    res.status(403).json({ error: 'Bạn không có quyền xóa story này.' });
    return;
  }
  await story.deleteOne();
  res.json({ ok: true });
  broadcastStory(story, 'story:delete', { storyId: story._id.toString() }, req.userId!);
});

storiesRouter.post('/:id/view', async (req: AuthedRequest, res) => {
  const story = await StoryModel.findById(req.params.id);
  if (!story) {
    res.status(404).json({ error: 'Không tìm thấy story.' });
    return;
  }
  if (!story.viewers.some((v: any) => v.user.toString() === req.userId)) {
    story.viewers.push({ user: req.userId, viewedAt: new Date() } as any);
    await story.save();
  }
  await story.populate(['user', 'viewers.user']);
  res.json({ story: serializeStory(story) });
});
