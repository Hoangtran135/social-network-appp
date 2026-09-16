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

export const commentsRouter = Router();
commentsRouter.use(requireAuth);

commentsRouter.get('/', async (req: AuthedRequest, res) => {
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

  if (post.author.toString() !== req.userId) {
    await createNotification({
      user: post.author,
      actor: req.userId,
      type: 'comment',
      content: `đã bình luận về bài viết của bạn: "${String(content).slice(0, 30)}..."`,
      targetId: postId,
      targetType: 'post',
    });
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
  }

  res.json({ comment: serializeComment(comment) });
});

commentsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const comment = await CommentModel.findById(req.params.id);
  if (!comment) {
    res.status(404).json({ error: 'Không tìm thấy bình luận.' });
    return;
  }
  const post = await PostModel.findById(comment.post);
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
  await comment.deleteOne();
  if (post) {
    post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
    await post.save();
  }
  res.json({ ok: true });
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
