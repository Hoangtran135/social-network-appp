import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ.');

// --- Auth ---
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username chỉ được chứa chữ, số, dấu chấm và gạch dưới.'),
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(200),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(200),
  token: z.string().min(1).max(500),
  password: z.string().min(6).max(200),
});

// --- Posts ---
export const createPostSchema = z.object({
  content: z.string().trim().max(10000).default(''),
  images: z.array(z.string().max(2000)).max(20).optional(),
  video: z.string().max(2000).optional(),
  privacy: z.enum(['public', 'friends', 'only_me']).default('public'),
  feeling: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  groupId: objectId.optional(),
  wallOwnerId: objectId.optional(),
  taggedUserIds: z.array(objectId).max(50).optional(),
});

export const updatePostSchema = z.object({
  content: z.string().trim().max(10000).optional(),
  privacy: z.enum(['public', 'friends', 'only_me']).optional(),
  feeling: z.string().trim().max(100).optional(),
  images: z.array(z.string().max(2000)).max(20).optional(),
  video: z.string().max(2000).optional(),
});

export const reactPostSchema = z.object({
  type: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry']),
});

export const sharePostSchema = z.object({
  message: z.string().trim().max(2000).optional(),
});

// --- Comments ---
export const createCommentSchema = z.object({
  postId: objectId,
  content: z.string().trim().max(3000).default(''),
  image: z.string().max(2000).optional(),
  parentId: objectId.optional(),
  taggedUserIds: z.array(objectId).max(50).optional(),
});

// --- Friends ---
export const sendFriendRequestSchema = z.object({
  targetUserId: objectId,
});

// --- Groups ---
export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).default(''),
  privacy: z.enum(['public', 'private']).default('public'),
  avatar: z.string().max(2000).optional(),
  coverImage: z.string().max(2000).optional(),
});

export const groupInviteSchema = z.object({
  userId: objectId,
});

export const groupPromoteSchema = z.object({
  role: z.enum(['admin', 'moderator']).optional(),
});

// --- Messages / Conversations ---
export const createConversationSchema = z.object({
  participantId: objectId.optional(),
  participantIds: z.array(objectId).max(100).optional(),
  name: z.string().trim().max(150).optional(),
});

export const renameConversationSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  avatar: z.string().max(2000).optional(),
});

export const reactMessageSchema = z.object({
  emoji: z.string().min(1).max(8).optional(), // omit/empty to clear my reaction
});

export const addConversationMemberSchema = z.object({
  userId: objectId,
});

export const setNicknameSchema = z.object({
  userId: objectId,
  nickname: z.string().trim().max(60).optional().default(''),
});

const attachmentSchema = z.object({
  type: z.enum(['image', 'file']),
  url: z.string().max(2000),
  name: z.string().max(300),
  size: z.string().max(50).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().max(5000).default(''),
  attachments: z.array(attachmentSchema).max(10).optional(),
});

export const sharePostToConversationSchema = z.object({
  postId: objectId,
  message: z.string().trim().max(2000).optional(),
});

export const logCallSchema = z.object({
  toUserId: objectId,
  callType: z.enum(['audio', 'video']),
  status: z.enum(['completed', 'missed', 'rejected']),
  durationSec: z.number().min(0).max(86400).default(0),
});

// --- Users ---
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  avatar: z.string().max(2000).optional(),
  coverImage: z.string().max(2000).optional(),
  workplace: z.string().trim().max(150).optional(),
  education: z.string().trim().max(150).optional(),
  location: z.string().trim().max(150).optional(),
  website: z.string().trim().max(300).optional(),
});
