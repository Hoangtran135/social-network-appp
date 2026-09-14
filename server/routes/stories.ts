import { Router } from 'express';
import { StoryModel } from '../models/Story';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { serializeStory } from '../serialize';

export const storiesRouter = Router();
storiesRouter.use(requireAuth);

storiesRouter.get('/', async (_req, res) => {
  const stories = await StoryModel.find({ expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .populate(['user', 'viewers.user']);
  res.json({ stories: stories.map(serializeStory) });
});

storiesRouter.post('/', async (req: AuthedRequest, res) => {
  const { type, mediaUrl, textContent, backgroundGradient } = req.body;
  const story = await StoryModel.create({
    user: req.userId,
    type,
    mediaUrl,
    textContent,
    backgroundGradient,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await story.populate('user');
  res.json({ story: serializeStory(story) });
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
