import { Router } from 'express';
import { ConversationModel, MessageModel } from '../models/Conversation';
import { UserModel } from '../models/User';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { PostModel } from '../models/Post';
import {
  createConversationSchema,
  renameConversationSchema,
  addConversationMemberSchema,
  setNicknameSchema,
  sendMessageSchema,
  reactMessageSchema,
  sharePostToConversationSchema,
  logCallSchema,
} from '../schemas';
import { serializeConversation, serializeMessage } from '../serialize';
import { emitToUser } from '../realtime';
import { getBotReply } from '../ai';

const DEFAULT_GROUP_AVATARS = [
  'https://api.dicebear.com/7.x/shapes/svg?seed=group1',
  'https://api.dicebear.com/7.x/shapes/svg?seed=group2',
  'https://api.dicebear.com/7.x/shapes/svg?seed=group3',
  'https://api.dicebear.com/7.x/shapes/svg?seed=group4',
  'https://api.dicebear.com/7.x/shapes/svg?seed=group5',
];

function randomDefaultAvatar() {
  return DEFAULT_GROUP_AVATARS[Math.floor(Math.random() * DEFAULT_GROUP_AVATARS.length)];
}

// Pushes a message (new / recalled / reacted-to) live to every other participant's open tabs.
function broadcastMessage(conversationId: string, participantIds: string[], senderId: string | undefined, message: unknown) {
  for (const pid of participantIds) {
    if (pid === senderId) continue;
    emitToUser(pid, 'message:new', { conversationId, message });
  }
}

// Fire-and-forget: if this 1-1 conversation's other participant is the AI bot, ask Gemini
// for a reply using recent chat history, then save + broadcast it just like a normal message.
// Never awaited by the caller — a slow/failed AI call must not delay the user's own send.
async function maybeTriggerBotReply(conversationId: string, participantIds: string[], senderId: string) {
  if (participantIds.length !== 2) return; // bot only replies in 1-1 chats
  const otherId = participantIds.find((p) => p !== senderId);
  if (!otherId) return;
  const otherUser = await UserModel.findById(otherId);
  if (!otherUser?.isBot) return;

  const recent = await MessageModel.find({ conversation: conversationId, kind: 'text' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const history = recent
    .reverse()
    .filter((m) => m.content)
    .map((m) => ({ role: m.sender?.toString() === otherId ? ('model' as const) : ('user' as const), text: m.content as string }));

  const replyText = await getBotReply(history);
  if (!replyText) return;

  const botMessage = await MessageModel.create({
    conversation: conversationId,
    sender: otherId,
    content: replyText,
    readBy: [otherId],
  });
  await botMessage.populate('sender');
  await ConversationModel.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
  const serialized = serializeMessage(botMessage, participantIds);
  broadcastMessage(conversationId, participantIds, otherId, serialized);
}

async function postSystemMessage(conversationId: string, content: string) {
  const msg = await MessageModel.create({ conversation: conversationId, kind: 'system', content, readBy: [] });
  await ConversationModel.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
  await msg.populate('sender');
  return msg;
}

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get('/conversations', async (req: AuthedRequest, res) => {
  const conversations = await ConversationModel.find({ participants: req.userId })
    .sort({ updatedAt: -1 })
    .populate('participants');
  const withLast = await Promise.all(
    conversations.map(async (c) => {
      const [last, unreadCount] = await Promise.all([
        MessageModel.findOne({ conversation: c._id }).sort({ createdAt: -1 }).populate('sender'),
        MessageModel.countDocuments({
          conversation: c._id,
          sender: { $ne: req.userId },
          readBy: { $ne: req.userId },
        }),
      ]);
      return serializeConversation(c, last, unreadCount);
    })
  );
  res.json({ conversations: withLast });
});

messagesRouter.post('/conversations', validateBody(createConversationSchema), async (req: AuthedRequest, res) => {
  const { participantId, participantIds, name } = req.body;
  const ids: string[] = Array.from(
    new Set([...(participantIds || (participantId ? [participantId] : [])), req.userId as string])
  );

  if (ids.length >= 3) {
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nhóm chat cần có tên khi có từ 3 thành viên trở lên.' });
      return;
    }
    const conv = await ConversationModel.create({
      isGroup: true,
      name: name.trim(),
      avatar: randomDefaultAvatar(),
      participants: ids,
      admins: [req.userId],
    });
    await conv.populate('participants');
    const creator = await UserModel.findById(req.userId);
    await postSystemMessage(conv._id.toString(), `${creator?.name || 'Ai đó'} đã tạo nhóm "${name.trim()}".`);
    res.json({ conversation: serializeConversation(conv) });
    return;
  }

  // 2 people total (including me) => plain direct conversation
  const otherId = ids.find((i) => i !== req.userId);
  let conv = await ConversationModel.findOne({
    isGroup: false,
    participants: { $all: [req.userId, otherId], $size: 2 },
  }).populate('participants');
  if (!conv) {
    const [me, other] = await Promise.all([UserModel.findById(req.userId), UserModel.findById(otherId)]);
    const blocked =
      me?.blockedUsers.some((id: any) => id.toString() === otherId) ||
      other?.blockedUsers.some((id: any) => id.toString() === req.userId);
    if (blocked) {
      res.status(403).json({ error: 'Không thể nhắn tin với người dùng này.' });
      return;
    }
    conv = await ConversationModel.create({ isGroup: false, participants: [req.userId, otherId] });
    await conv.populate('participants');
  }
  res.json({ conversation: serializeConversation(conv) });
});

messagesRouter.patch('/conversations/:id', validateBody(renameConversationSchema), async (req: AuthedRequest, res) => {
  const { name, avatar } = req.body;
  const conv = await ConversationModel.findById(req.params.id);
  if (!conv || !conv.isGroup || !conv.participants.some((p: any) => p.toString() === req.userId)) {
    res.status(404).json({ error: 'Không tìm thấy nhóm chat.' });
    return;
  }
  const actor = await UserModel.findById(req.userId);
  let systemMessage;
  if (name && name.trim() && name.trim() !== conv.name) {
    const oldName = conv.name;
    conv.name = name.trim();
    systemMessage = await postSystemMessage(
      req.params.id,
      `${actor?.name || 'Ai đó'} đã đổi tên nhóm từ "${oldName}" thành "${conv.name}".`
    );
  }
  if (avatar && avatar !== conv.avatar) {
    conv.avatar = avatar;
    systemMessage = await postSystemMessage(req.params.id, `${actor?.name || 'Ai đó'} đã đổi ảnh đại diện nhóm.`);
  }
  await conv.save();
  await conv.populate('participants');
  res.json({ conversation: serializeConversation(conv), systemMessage: systemMessage ? serializeMessage(systemMessage) : undefined });
});

messagesRouter.post('/conversations/:id/members', validateBody(addConversationMemberSchema), async (req: AuthedRequest, res) => {
  const { userId } = req.body;
  const conv = await ConversationModel.findById(req.params.id);
  if (!conv || !conv.isGroup || !conv.participants.some((p: any) => p.toString() === req.userId)) {
    res.status(404).json({ error: 'Không tìm thấy nhóm chat.' });
    return;
  }
  let systemMessage;
  if (!conv.participants.some((p: any) => p.toString() === userId)) {
    conv.participants.push(userId);
    await conv.save();
    const [actor, target] = await Promise.all([UserModel.findById(req.userId), UserModel.findById(userId)]);
    systemMessage = await postSystemMessage(
      req.params.id,
      `${actor?.name || 'Ai đó'} đã thêm ${target?.name || 'một người'} vào nhóm.`
    );
  }
  await conv.populate('participants');
  res.json({ conversation: serializeConversation(conv), systemMessage: systemMessage ? serializeMessage(systemMessage) : undefined });
});

messagesRouter.delete('/conversations/:id/members/:userId', async (req: AuthedRequest, res) => {
  const conv = await ConversationModel.findById(req.params.id);
  if (!conv || !conv.isGroup || !conv.participants.some((p: any) => p.toString() === req.userId)) {
    res.status(404).json({ error: 'Không tìm thấy nhóm chat.' });
    return;
  }
  const isSelf = req.params.userId === req.userId;
  const isAdmin = conv.admins.some((a: any) => a.toString() === req.userId);
  if (!isSelf && !isAdmin) {
    res.status(403).json({ error: 'Chỉ quản trị viên nhóm chat mới có thể xóa thành viên khác.' });
    return;
  }
  const remainingAdmins = conv.admins.filter((a: any) => a.toString() !== req.params.userId);
  if (isSelf && isAdmin && remainingAdmins.length === 0 && conv.participants.length > 1) {
    res.status(400).json({
      error: 'Bạn là quản trị viên duy nhất. Hãy bổ nhiệm người khác trước khi rời nhóm.',
    });
    return;
  }
  conv.participants = conv.participants.filter((p: any) => p.toString() !== req.params.userId) as any;
  conv.admins = remainingAdmins as any;
  await conv.save();
  const [actor, target] = await Promise.all([UserModel.findById(req.userId), UserModel.findById(req.params.userId)]);
  const systemMessage = await postSystemMessage(
    req.params.id,
    isSelf
      ? `${actor?.name || 'Ai đó'} đã rời khỏi nhóm.`
      : `${actor?.name || 'Ai đó'} đã xóa ${target?.name || 'một người'} khỏi nhóm.`
  );
  await conv.populate('participants');
  res.json({ conversation: serializeConversation(conv), systemMessage: serializeMessage(systemMessage) });
});

messagesRouter.post('/conversations/:id/members/:userId/promote', async (req: AuthedRequest, res) => {
  const conv = await ConversationModel.findById(req.params.id);
  if (!conv || !conv.isGroup) {
    res.status(404).json({ error: 'Không tìm thấy nhóm chat.' });
    return;
  }
  const isAdmin = conv.admins.some((a: any) => a.toString() === req.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Chỉ quản trị viên nhóm chat mới có thể bổ nhiệm.' });
    return;
  }
  let systemMessage;
  if (!conv.admins.some((a: any) => a.toString() === req.params.userId)) {
    conv.admins.push(req.params.userId as any);
    await conv.save();
    const [actor, target] = await Promise.all([UserModel.findById(req.userId), UserModel.findById(req.params.userId)]);
    systemMessage = await postSystemMessage(
      req.params.id,
      `${actor?.name || 'Ai đó'} đã bổ nhiệm ${target?.name || 'một người'} làm quản trị viên nhóm chat.`
    );
  }
  await conv.populate('participants');
  res.json({ conversation: serializeConversation(conv), systemMessage: systemMessage ? serializeMessage(systemMessage) : undefined });
});

messagesRouter.patch('/conversations/:id/nickname', validateBody(setNicknameSchema), async (req: AuthedRequest, res) => {
  const { userId, nickname } = req.body;
  const conv = await ConversationModel.findById(req.params.id);
  if (!conv || !conv.participants.some((p: any) => p.toString() === req.userId)) {
    res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });
    return;
  }
  if (!conv.nicknames) conv.nicknames = new Map();
  const trimmed = nickname && nickname.trim();
  if (trimmed) {
    conv.nicknames.set(userId, trimmed);
  } else {
    conv.nicknames.delete(userId);
  }
  await conv.save();
  await conv.populate('participants');

  const [actor, target] = await Promise.all([
    UserModel.findById(req.userId),
    UserModel.findById(userId),
  ]);
  const actorName = actor?.name || 'Ai đó';
  const targetName = target?.name || 'thành viên';
  const text = trimmed
    ? userId === req.userId
      ? `${actorName} đã đặt biệt danh của mình là "${trimmed}".`
      : `${actorName} đã đặt biệt danh của ${targetName} thành "${trimmed}".`
    : `${actorName} đã xóa biệt danh của ${userId === req.userId ? 'mình' : targetName}.`;
  const systemMessage = await postSystemMessage(req.params.id, text);

  res.json({ conversation: serializeConversation(conv), systemMessage: serializeMessage(systemMessage) });
});

async function assertParticipant(conversationId: string, userId: string | undefined) {
  const conv = await ConversationModel.findById(conversationId);
  if (!conv) return { ok: false as const, status: 404, error: 'Không tìm thấy cuộc trò chuyện.' };
  if (!conv.participants.some((p: any) => p.toString() === userId)) {
    return { ok: false as const, status: 403, error: 'Bạn không phải là thành viên của cuộc trò chuyện này.' };
  }
  return { ok: true as const, conv };
}

messagesRouter.get('/conversations/:id/messages', async (req: AuthedRequest, res) => {
  const check = await assertParticipant(req.params.id, req.userId);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const messages = await MessageModel.find({ conversation: req.params.id })
    .sort({ createdAt: 1 })
    .limit(500)
    .populate('sender');

  // Viewing the conversation marks every other person's message as read by me
  await MessageModel.updateMany(
    { conversation: req.params.id, sender: { $ne: req.userId } },
    { $addToSet: { readBy: req.userId } }
  );

  const participantIds = check.conv.participants.map((p: any) => p.toString());
  res.json({ messages: messages.map((m) => serializeMessage(m, participantIds)) });
});

messagesRouter.post('/conversations/:id/messages', validateBody(sendMessageSchema), async (req: AuthedRequest, res) => {
  const check = await assertParticipant(req.params.id, req.userId);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }
  const { content, attachments } = req.body;
  const message = await MessageModel.create({
    conversation: req.params.id,
    sender: req.userId,
    content,
    attachments,
    readBy: [req.userId],
  });
  await message.populate('sender');
  await ConversationModel.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });
  const participantIds1 = check.conv.participants.map((p: any) => p.toString());
  const serialized1 = serializeMessage(message, participantIds1);
  broadcastMessage(req.params.id, participantIds1, req.userId, serialized1);
  res.json({ message: serialized1 });
  maybeTriggerBotReply(req.params.id, participantIds1, req.userId!).catch((err) =>
    console.error('[ai] bot reply failed:', err)
  );
});

// Share a post into a conversation — stores only a reference (sharedPostId). The recipient's
// client fetches the actual post via GET /posts/:id at render time, which re-checks that
// specific viewer's access (private group posts still require membership to open).
messagesRouter.post(
  '/conversations/:id/share-post',
  validateBody(sharePostToConversationSchema),
  async (req: AuthedRequest, res) => {
    const check = await assertParticipant(req.params.id, req.userId);
    if (!check.ok) {
      res.status(check.status).json({ error: check.error });
      return;
    }
    const { postId, message: caption } = req.body;
    const post = await PostModel.findById(postId);
    if (!post) {
      res.status(404).json({ error: 'Không tìm thấy bài viết.' });
      return;
    }
    const message = await MessageModel.create({
      conversation: req.params.id,
      sender: req.userId,
      content: caption || '',
      sharedPostId: postId,
      readBy: [req.userId],
    });
    await message.populate('sender');
    await ConversationModel.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });
    const participantIds2 = check.conv.participants.map((p: any) => p.toString());
    const serialized2 = serializeMessage(message, participantIds2);
    broadcastMessage(req.params.id, participantIds2, req.userId, serialized2);
    res.json({ message: serialized2 });
  }
);

// Unsend/recall — only the sender can do this, and only for their own text/system-free messages.
// Content and attachments are cleared but the message stays in place (like Messenger's "Gỡ").
messagesRouter.delete('/conversations/:id/messages/:messageId', async (req: AuthedRequest, res) => {
  const check = await assertParticipant(req.params.id, req.userId);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }
  const message = await MessageModel.findById(req.params.messageId);
  if (!message || message.conversation.toString() !== req.params.id) {
    res.status(404).json({ error: 'Không tìm thấy tin nhắn.' });
    return;
  }
  if (!message.sender || message.sender.toString() !== req.userId) {
    res.status(403).json({ error: 'Bạn chỉ có thể thu hồi tin nhắn của chính mình.' });
    return;
  }
  message.isRecalled = true;
  message.content = '';
  message.attachments = [] as any;
  message.reactions = new Map();
  await message.save();
  await message.populate('sender');
  const participantIds3 = check.conv.participants.map((p: any) => p.toString());
  const serialized3 = serializeMessage(message, participantIds3);
  broadcastMessage(req.params.id, participantIds3, undefined, serialized3);
  res.json({ message: serialized3 });
});

// React with a single emoji per user per message — sending the same emoji again clears it (toggle),
// sending a different one replaces it.
messagesRouter.post(
  '/conversations/:id/messages/:messageId/react',
  validateBody(reactMessageSchema),
  async (req: AuthedRequest, res) => {
    const check = await assertParticipant(req.params.id, req.userId);
    if (!check.ok) {
      res.status(check.status).json({ error: check.error });
      return;
    }
    const message = await MessageModel.findById(req.params.messageId);
    if (!message || message.conversation.toString() !== req.params.id) {
      res.status(404).json({ error: 'Không tìm thấy tin nhắn.' });
      return;
    }
    if (!message.reactions) message.reactions = new Map();
    const { emoji } = req.body;
    const current = message.reactions.get(req.userId!);
    if (!emoji || current === emoji) {
      message.reactions.delete(req.userId!);
    } else {
      message.reactions.set(req.userId!, emoji);
    }
    await message.save();
    await message.populate('sender');
    const participantIds4 = check.conv.participants.map((p: any) => p.toString());
    const serialized4 = serializeMessage(message, participantIds4);
    broadcastMessage(req.params.id, participantIds4, undefined, serialized4);
    res.json({ message: serialized4 });
  }
);

// Logs a finished 1-1 call as a message in that pair's conversation (finding/creating it the
// same way a normal 1-1 chat would) so both sides see a "📞 Cuộc gọi ... đã kết thúc" entry
// with a duration/status icon instead of the call just silently disappearing.
messagesRouter.post('/call-log', validateBody(logCallSchema), async (req: AuthedRequest, res) => {
  const { toUserId, callType, status, durationSec } = req.body;
  let conv = await ConversationModel.findOne({
    isGroup: false,
    participants: { $all: [req.userId, toUserId], $size: 2 },
  });
  if (!conv) {
    conv = await ConversationModel.create({ isGroup: false, participants: [req.userId, toUserId] });
  }
  const message = await MessageModel.create({
    conversation: conv._id,
    sender: req.userId,
    kind: 'call',
    callType,
    callStatus: status,
    callDurationSec: durationSec,
    readBy: [req.userId],
  });
  await message.populate('sender');
  await ConversationModel.findByIdAndUpdate(conv._id, { updatedAt: new Date() });
  const participantIds = [req.userId!, toUserId];
  const serialized = serializeMessage(message, participantIds);
  broadcastMessage(conv._id.toString(), participantIds, req.userId, serialized);
  res.json({ conversationId: conv._id.toString(), message: serialized });
});

// Clears every message in a conversation — for everyone in it, not just the caller
// (matches how the bot-chat "reset" is meant to work: a clean slate for all participants).
// Irreversible; the frontend confirms before calling this.
messagesRouter.delete('/conversations/:id/messages', async (req: AuthedRequest, res) => {
  const check = await assertParticipant(req.params.id, req.userId);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }
  await MessageModel.deleteMany({ conversation: req.params.id });
  await ConversationModel.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });
  const participantIds = check.conv.participants.map((p: any) => p.toString());
  for (const pid of participantIds) {
    if (pid === req.userId) continue;
    emitToUser(pid, 'conversation:cleared', { conversationId: req.params.id });
  }
  res.json({ ok: true });
});
