import { Router } from 'express';
import { PostModel } from '../models/Post';
import { createNotification } from '../notify';
import { UserModel } from '../models/User';
import { FriendshipModel } from '../models/FriendRequest';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createPostSchema, updatePostSchema, reactPostSchema, sharePostSchema } from '../schemas';
import { serializePost } from '../serialize';

export const postsRouter = Router();
postsRouter.use(requireAuth);

const POPULATE = ['author', 'wallOwner', 'group', 'reactions.userId', 'savedBy', 'taggedUsers'];

async function getFriendIds(userId: string | undefined): Promise<Set<string>> {
  const friendEdges = await FriendshipModel.find({ $or: [{ userA: userId }, { userB: userId }] });
  return new Set(
    friendEdges.map((e: any) => (e.userA.toString() === userId ? e.userB.toString() : e.userA.toString()))
  );
}

function isPostVisible(p: any, userId: string | undefined, friendIds: Set<string>): boolean {
  if (p.group && p.group.privacy === 'private') {
    if (!p.group.members.some((m: any) => m.user.toString() === userId)) return false;
  }
  const authorId = p.author._id ? p.author._id.toString() : p.author.toString();
  if (authorId === userId) return true;
  if (p.privacy === 'only_me') return false;
  if (p.privacy === 'friends') return friendIds.has(authorId);
  return true; // public
}

postsRouter.get('/', async (req: AuthedRequest, res) => {
  const posts = await PostModel.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 30, 100))
    .skip(Number(req.query.skip) || 0)
    .populate(POPULATE);

  const friendIds = await getFriendIds(req.userId);
  const visible = posts.filter((p: any) => isPostVisible(p, req.userId, friendIds));

  res.json({ posts: visible.map((p) => serializePost(p, req.userId)) });
});

postsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const post = await PostModel.findById(req.params.id).populate(POPULATE);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  const friendIds = await getFriendIds(req.userId);
  if (!isPostVisible(post, req.userId, friendIds)) {
    res.status(403).json({ error: 'Bạn không có quyền xem bài viết này.' });
    return;
  }
  res.json({ post: serializePost(post, req.userId) });
});

postsRouter.post('/', validateBody(createPostSchema), async (req: AuthedRequest, res) => {
  const { content, images, video, privacy, feeling, groupId, wallOwnerId, location, taggedUserIds } = req.body;
  const taggedIds: string[] = Array.isArray(taggedUserIds)
    ? Array.from(new Set(taggedUserIds.filter((id: string) => id !== req.userId)))
    : [];
  const post = await PostModel.create({
    author: req.userId,
    wallOwner: wallOwnerId && wallOwnerId !== req.userId ? wallOwnerId : undefined,
    content,
    images,
    video,
    privacy,
    feeling,
    location,
    group: groupId || undefined,
    taggedUsers: taggedIds,
  });
  await post.populate(POPULATE);

  if (wallOwnerId && wallOwnerId !== req.userId) {
    await createNotification({
      user: wallOwnerId,
      actor: req.userId,
      type: 'system',
      content: 'đã đăng một bài viết lên tường nhà bạn.',
      targetId: post._id.toString(),
      targetType: 'post',
    });
  }

  if (taggedIds.length > 0) {
    await Promise.all(
      taggedIds.map((userId) =>
        createNotification({
          user: userId,
          actor: req.userId,
          type: 'system',
          content: 'đã gắn thẻ bạn trong một bài viết.',
          targetId: post._id.toString(),
          targetType: 'post',
        })
      )
    );
  }

  res.json({ post: serializePost(post, req.userId) });
});

postsRouter.patch('/:id', validateBody(updatePostSchema), async (req: AuthedRequest, res) => {
  const post = await PostModel.findById(req.params.id);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  if (post.author.toString() !== req.userId) {
    res.status(403).json({ error: 'Bạn không có quyền sửa bài viết này.' });
    return;
  }
  const { content, privacy, feeling, images, video } = req.body;
  if (content !== undefined) post.content = content;
  if (privacy !== undefined) post.privacy = privacy;
  if (feeling !== undefined) post.feeling = feeling;
  if (images !== undefined) post.images = images;
  if (video !== undefined) post.video = video;
  post.editedAt = new Date();
  await post.save();
  await post.populate(POPULATE);
  res.json({ post: serializePost(post, req.userId) });
});

postsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const post = await PostModel.findById(req.params.id);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  const isOwnPost = post.author.toString() === req.userId;
  if (!isOwnPost) {
    const me = await UserModel.findById(req.userId);
    if (!me || me.role !== 'admin') {
      res.status(403).json({ error: 'Bạn không có quyền xóa bài viết này.' });
      return;
    }
    await createNotification({
      user: post.author,
      actor: req.userId,
      type: 'system',
      content: 'Bài viết của bạn đã bị quản trị viên gỡ bỏ do vi phạm chính sách cộng đồng.',
      targetType: 'system',
    });
  }
  await post.deleteOne();
  res.json({ ok: true });
});

postsRouter.post('/:id/react', validateBody(reactPostSchema), async (req: AuthedRequest, res) => {
  const { type } = req.body;
  const post = await PostModel.findById(req.params.id).populate(POPULATE);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  const friendIds = await getFriendIds(req.userId);
  if (!isPostVisible(post, req.userId, friendIds)) {
    res.status(403).json({ error: 'Bạn không có quyền tương tác với bài viết này.' });
    return;
  }
  const existingIndex = post.reactions.findIndex((r: any) => r.userId.toString() === req.userId);
  if (existingIndex > -1) {
    if (post.reactions[existingIndex].type === type) {
      post.reactions.splice(existingIndex, 1);
    } else {
      post.reactions[existingIndex].type = type;
    }
  } else {
    post.reactions.push({ type, userId: req.userId } as any);
    if (post.author.toString() !== req.userId) {
      await createNotification({
        user: post.author,
        actor: req.userId,
        type: 'like',
        content: `đã thả cảm xúc (${type}) về bài viết của bạn`,
        targetId: post._id.toString(),
        targetType: 'post',
      });
    }
  }
  await post.save();
  await post.populate(POPULATE);
  res.json({ post: serializePost(post, req.userId) });
});

postsRouter.post('/:id/save', async (req: AuthedRequest, res) => {
  const post = await PostModel.findById(req.params.id).populate(POPULATE);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  const friendIds = await getFriendIds(req.userId);
  if (!isPostVisible(post, req.userId, friendIds)) {
    res.status(403).json({ error: 'Bạn không có quyền tương tác với bài viết này.' });
    return;
  }
  const idx = post.savedBy.findIndex((u: any) => u.toString() === req.userId);
  if (idx > -1) post.savedBy.splice(idx, 1);
  else post.savedBy.push(req.userId as any);
  await post.save();
  await post.populate(POPULATE);
  res.json({ post: serializePost(post, req.userId) });
});

postsRouter.post('/:id/share', validateBody(sharePostSchema), async (req: AuthedRequest, res) => {
  const original = await PostModel.findById(req.params.id).populate(POPULATE);
  if (!original) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  const friendIds = await getFriendIds(req.userId);
  if (!isPostVisible(original, req.userId, friendIds)) {
    res.status(403).json({ error: 'Bạn không có quyền chia sẻ bài viết này.' });
    return;
  }
  original.sharesCount = (original.sharesCount || 0) + 1;
  await original.save();

  const { message } = req.body;
  const shared = await PostModel.create({
    author: req.userId,
    content: message
      ? `${message}\n\n[Chia sẻ từ @${(original.author as any).name}]:\n${original.content}`
      : `[Chia sẻ từ @${(original.author as any).name}]:\n${original.content}`,
    images: original.images,
    privacy: 'public',
  });
  await shared.populate(POPULATE);
  res.json({ post: serializePost(shared, req.userId) });
});
