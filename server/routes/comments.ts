import { Router } from 'express';
import { CommentModel } from '../models/Comment';
import { PostModel } from '../models/Post';
import { createNotification } from '../notify';
import { UserModel } from '../models/User';
import { FriendshipModel } from '../models/FriendRequest';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createCommentSchema } from '../schemas';
import { serializeComment } from '../serialize';
import { emitToUser, emitToUsers, broadcastToAll } from '../realtime';

export const commentsRouter = Router();
commentsRouter.use(requireAuth);

async function getFriendIds(userId: string | undefined): Promise<string[]> {
  const friendEdges = await FriendshipModel.find({ $or: [{ userA: userId }, { userB: userId }] });
  return friendEdges.map((e: any) => (e.userA.toString() === userId ? e.userB.toString() : e.userA.toString()));
}

// Mirrors posts.ts's visibility rules so a deleted comment disappears live for exactly the
// people who could see the post it was on, not everyone or no one.
async function broadcastCommentDeleted(post: any, authorId: string, postId: string, commentId: string, excludeUserId: string) {
  const payload = { postId, commentId };
  if (post.group && post.group.privacy === 'private') {
    const memberIds = (post.group.members || [])
      .map((m: any) => (m.user?._id ? m.user._id.toString() : m.user.toString()))
      .filter((uid: string) => uid !== excludeUserId);
    emitToUsers(memberIds, 'comment:delete', payload);
    return;
  }
  if (post.privacy === 'only_me') return;
  if (post.privacy === 'friends') {
    const friendIds = await getFriendIds(authorId);
    const recipients = [...new Set([...friendIds, authorId])].filter((uid) => uid !== excludeUserId);
    emitToUsers(recipients, 'comment:delete', payload);
    return;
  }
  broadcastToAll('comment:delete', payload, excludeUserId);
}

commentsRouter.get('/stats', async (_req, res) => {
  const total = await CommentModel.countDocuments({});
  res.json({ total });
});

commentsRouter.get('/', async (req: AuthedRequest, res) => {
  // Comments for one specific post — this is the actual hot path (a post card expanding
  // its comment thread). Indexed on { post, createdAt } so it stays fast at any scale.
  if (typeof req.query.postId === 'string') {
    const post = await PostModel.findById(req.query.postId).select('author group privacy').populate('group');
    if (!post) {
      res.json({ comments: [] });
      return;
    }
    const friendEdges = await FriendshipModel.find({ $or: [{ userA: req.userId }, { userB: req.userId }] });
    const friendIds = new Set(
      friendEdges.map((e: any) => (e.userA.toString() === req.userId ? e.userB.toString() : e.userA.toString()))
    );
    const authorId = post.author.toString();
    const groupDoc: any = post.group;
    const visible =
      authorId === req.userId ||
      (groupDoc && groupDoc.privacy === 'private'
        ? groupDoc.members.some((m: any) => m.user.toString() === req.userId)
        : post.privacy === 'only_me'
        ? false
        : post.privacy === 'friends'
        ? friendIds.has(authorId)
        : true);
    if (!visible) {
      res.status(403).json({ error: 'Bạn không có quyền xem bình luận của bài viết này.' });
      return;
    }
    const comments = await CommentModel.find({ post: req.query.postId })
      .sort({ createdAt: 1 })
      .limit(500)
      .populate('author');
    res.json({ comments: comments.map(serializeComment) });
    return;
  }

  // Legacy unscoped fetch — kept only as a bounded fallback for any caller that hasn't
  // moved to per-post loading yet; capped hard so it can never turn into an unbounded scan.
  // Only return comments on posts this user is actually allowed to see —
  // previously returned every comment in the DB regardless of post privacy.
  // Projected to just the fields the visibility check needs — this used to pull full
  // post documents (images, reactions, etc.) only to throw almost all of it away.
  const visiblePosts = await PostModel.find()
    .select('author group privacy')
    .populate([{ path: 'author', select: '_id' }, { path: 'group', select: 'privacy members' }]);
  const friendEdges = await FriendshipModel.find({ $or: [{ userA: req.userId }, { userB: req.userId }] });
  const friendIds = new Set(
    friendEdges.map((e: any) => (e.userA.toString() === req.userId ? e.userB.toString() : e.userA.toString()))
  );
  const visiblePostIds = visiblePosts
    .filter((p: any) => {
      if (p.group && p.group.privacy === 'private') {
        if (!p.group.members.some((m: any) => m.user.toString() === req.userId)) return false;
      }
      const authorId = p.author._id.toString();
      if (authorId === req.userId) return true;
      if (p.privacy === 'only_me') return false;
      if (p.privacy === 'friends') return friendIds.has(authorId);
      return true;
    })
    .map((p) => p._id);

  const comments = await CommentModel.find({ post: { $in: visiblePostIds } })
    .sort({ createdAt: 1 })
    .limit(2000)
    .populate('author');
  res.json({ comments: comments.map(serializeComment) });
});

commentsRouter.post('/', validateBody(createCommentSchema), async (req: AuthedRequest, res) => {
  const { postId, content, image, parentId, taggedUserIds } = req.body;
  const post = await PostModel.findById(postId);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  const taggedIds: string[] = Array.isArray(taggedUserIds)
    ? Array.from(new Set(taggedUserIds.filter((id: string) => id !== req.userId)))
    : [];
  const comment = await CommentModel.create({
    post: postId,
    author: req.userId,
    content,
    image,
    parent: parentId || undefined,
    taggedUsers: taggedIds,
  });
  await comment.populate(['author', 'taggedUsers']);

  post.commentsCount = (post.commentsCount || 0) + 1;
  await post.save();

  const serialized = serializeComment(comment);
  // Push the comment itself live — not just the notification — to everyone who'll be
  // notified about it. Without this, clicking the "X commented" notification lands on
  // a post whose comments list doesn't include the new comment until a manual refetch.
  const pushRecipients = new Set<string>();

  if (post.author.toString() !== req.userId) {
    await createNotification({
      user: post.author,
      actor: req.userId,
      type: 'comment',
      content: `đã bình luận về bài viết của bạn: "${String(content).slice(0, 30)}..."`,
      targetId: postId,
      targetType: 'post',
    });
    pushRecipients.add(post.author.toString());
  }

  if (taggedIds.length > 0) {
    await Promise.all(
      taggedIds
        .filter((userId) => userId !== post.author.toString())
        .map((userId) =>
          createNotification({
            user: userId,
            actor: req.userId,
            type: 'system',
            content: 'đã gắn thẻ bạn trong một bình luận.',
            targetId: postId,
            targetType: 'post',
          })
        )
    );
    taggedIds.forEach((userId) => pushRecipients.add(userId));
  }

  pushRecipients.forEach((userId) => emitToUser(userId, 'comment:new', { postId, comment: serialized }));

  res.json({ comment: serialized });
});

commentsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const comment = await CommentModel.findById(req.params.id);
  if (!comment) {
    res.status(404).json({ error: 'Không tìm thấy bình luận.' });
    return;
  }
  const post = await PostModel.findById(comment.post).populate('group');
  const isAuthor = comment.author.toString() === req.userId;
  const isPostOwner = post && post.author.toString() === req.userId;
  if (!isAuthor && isPostOwner) {
    await createNotification({
      user: comment.author,
      actor: req.userId,
      type: 'system',
      content: 'đã xóa bình luận của bạn khỏi bài viết của họ.',
      targetId: post!._id.toString(),
      targetType: 'post',
    });
  } else if (!isAuthor && !isPostOwner) {
    const me = await UserModel.findById(req.userId);
    if (!me || me.role !== 'admin') {
      res.status(403).json({ error: 'Bạn không có quyền xóa bình luận này.' });
      return;
    }
    await createNotification({
      user: comment.author,
      actor: req.userId,
      type: 'moderation',
      content: 'Bình luận của bạn đã bị quản trị viên gỡ bỏ do vi phạm chính sách cộng đồng.',
      targetType: 'system',
    });
  }
  const commentId = comment.id;
  const postId = comment.post.toString();
  await comment.deleteOne();
  if (post) {
    post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
    await post.save();
  }
  res.json({ ok: true });
  if (post) broadcastCommentDeleted(post, post.author.toString(), postId, commentId, req.userId!);
});

commentsRouter.post('/:id/like', async (req: AuthedRequest, res) => {
  const commentId = req.params.id;
  const exists = await CommentModel.exists({ _id: commentId });
  if (!exists) {
    res.status(404).json({ error: 'Không tìm thấy bình luận.' });
    return;
  }

  // Atomic pull-or-push so a user can never end up with two like entries from a double-click/race.
  const removed = await CommentModel.findOneAndUpdate(
    { _id: commentId, likes: req.userId },
    { $pull: { likes: req.userId } }
  );
  if (!removed) {
    await CommentModel.findOneAndUpdate(
      { _id: commentId, likes: { $ne: req.userId } },
      { $push: { likes: req.userId } }
    );
  }

  const comment = await CommentModel.findById(commentId).populate('author');
  res.json({ comment: serializeComment(comment) });
});
