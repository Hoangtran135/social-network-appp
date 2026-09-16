export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  role: 'admin' | 'user';
  isBanned?: boolean;
  workplace?: string;
  education?: string;
  location?: string;
  website?: string;
  joinDate: string;
  friendsCount: number;
  isOnline?: boolean;
  lastActive?: string;
  blockedUserIds?: string[]; // only present on the currently logged-in user's own object
  isBot?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  content: string;
  image?: string;
  taggedUsers?: User[];
  createdAt: string;
  likes: string[]; // userIds
  parentId?: string; // for nested replies
}

export interface Post {
  id: string;
  author: User;
  wallOwnerId?: string; // when set, this post was published on someone else's profile wall
  wallOwnerName?: string;
  content: string;
  images?: string[];
  video?: string;
  privacy: 'public' | 'friends' | 'only_me';
  feeling?: string; // e.g. "hạnh phúc", "hào hứng"
  location?: string;
  groupId?: string;
  groupName?: string;
  taggedUsers?: User[];
  createdAt: string;
  updatedAt?: string;
  reactions: {
    type: ReactionType;
    userId: string;
    userName: string;
  }[];
  commentsCount: number;
  sharesCount: number;
  isSaved?: boolean;
  pinned?: boolean;
}

export interface Story {
  id: string;
  user: User;
  type: 'image' | 'text';
  privacy: 'public' | 'friends';
  mediaUrl?: string;
  textContent?: string;
  backgroundGradient?: string;
  createdAt: string;
  expiresAt: string;
  viewers: {
    userId: string;
    userName: string;
    avatar: string;
    viewedAt: string;
  }[];
}

export interface MessageAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  kind?: 'text' | 'system' | 'call';
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  attachments?: MessageAttachment[];
  sharedPostId?: string;
  callType?: 'audio' | 'video';
  callStatus?: 'completed' | 'missed' | 'rejected';
  callDurationSec?: number;
  createdAt: string;
  isRead: boolean;
  isRecalled?: boolean;
  reactions?: Record<string, string>; // userId -> emoji
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  participants: User[];
  adminIds?: string[];
  nicknames?: Record<string, string>;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  avatar: string;
  coverImage: string;
  creatorId: string;
  membersCount: number;
  postsCount: number;
  members: {
    userId: string;
    user: User;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
  }[];
  isMember?: boolean;
  isAdmin?: boolean;
  hasPendingJoinRequest?: boolean;
  joinRequestsCount?: number;
  hasPendingInvite?: boolean;
  rules?: string[];
  createdAt: string;
}

export interface GroupJoinRequestItem {
  id: string;
  groupId: string;
  user: User;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  sender: User;
  receiverId: string;
  receiver?: User; // only present on "requests I sent"
  createdAt: string;
  mutualFriendsCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string; // target user
  actor: User;
  type: 'like' | 'comment' | 'share' | 'friend_request' | 'friend_accept' | 'group_invite' | 'system' | 'moderation';
  content: string;
  targetId?: string; // postId, groupId, etc.
  targetType?: 'post' | 'group' | 'profile' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporter: User;
  targetType: 'post' | 'user' | 'comment' | 'group';
  targetId: string;
  targetName?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolutionNote?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  createdAt: string;
  createdBy: string;
}
