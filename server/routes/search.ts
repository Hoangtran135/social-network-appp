import { Router } from 'express';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { GroupModel } from '../models/Group';
import { FriendshipModel } from '../models/FriendRequest';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { serializeUser, serializePost, serializeGroup } from '../serialize';

export const searchRouter = Router();
searchRouter.use(requireAuth);

const RESULT_LIMIT = 20;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

searchRouter.get('/', async (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json({ users: [], posts: [], groups: [] });
    return;
  }
  const pattern = new RegExp(escapeRegex(q), 'i');

  const [users, friendEdges] = await Promise.all([
    UserModel.find({ $or: [{ name: pattern }, { username: pattern }, { bio: pattern }] })
      .limit(RESULT_LIMIT)
      .select('-passwordHash -resetTokenHash -resetTokenExpires'),
    FriendshipModel.find({ $or: [{ userA: req.userId }, { userB: req.userId }] }),
  ]);
  const friendIds = new Set(
    friendEdges.map((e: any) => (e.userA.toString() === req.userId ? e.userB.toString() : e.userA.toString()))
  );

  const groups = await GroupModel.find({ $or: [{ name: pattern }, { description: pattern }] })
    .limit(RESULT_LIMIT)
    .populate('members.user creator');

  // Same visibility rule as GET /posts, just narrowed to a text match up front so we don't
  // have to pull and filter the entire collection for every search.
  const candidatePosts = await PostModel.find({ content: pattern })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate(['author', 'wallOwner', 'group', 'reactions.userId', 'savedBy', 'taggedUsers']);
  const visiblePosts = candidatePosts
    .filter((p: any) => {
      if (p.group && p.group.privacy === 'private') {
        if (!p.group.members.some((m: any) => m.user.toString() === req.userId)) return false;
      }
      const authorId = p.author._id ? p.author._id.toString() : p.author.toString();
      if (authorId === req.userId) return true;
      if (p.privacy === 'only_me') return false;
      if (p.privacy === 'friends') return friendIds.has(authorId);
      return true;
    })
    .slice(0, RESULT_LIMIT);

  res.json({
    users: users.map((u) => serializeUser(u)).filter(Boolean),
    posts: visiblePosts.map((p) => serializePost(p, req.userId)),
    groups: groups.map((g) => serializeGroup(g, req.userId)),
  });
});
