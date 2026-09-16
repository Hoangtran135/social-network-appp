import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Post,
  Comment,
  Story,
  Conversation,
  Message,
  Group,
  GroupJoinRequestItem,
  FriendRequest,
  NotificationItem,
  ReportItem,
  SystemAnnouncement,
  ReactionType,
  User,
} from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { api, ApiError } from '../utils/api';
import { getSocket, refreshSocketAuth } from '../utils/socket';

interface SocialContextType {
  // Posts
  posts: Post[];
  hasMorePosts: boolean;
  isLoadingMorePosts: boolean;
  loadMorePosts: () => Promise<void>;
  createPost: (content: string, images?: string[], privacy?: Post['privacy'], feeling?: string, groupId?: string, groupName?: string, wallOwner?: User, taggedUserIds?: string[], video?: string) => Promise<void>;
  updatePost: (postId: string, content: string, privacy?: Post['privacy'], feeling?: string, images?: string[], video?: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleReaction: (postId: string, type: ReactionType) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<void>;
  togglePinPost: (postId: string) => Promise<void>;
  sharePost: (postId: string, message?: string) => Promise<void>;

  // Comments
  comments: Record<string, Comment[]>;
  addComment: (postId: string, content: string, image?: string, parentId?: string, taggedUserIds?: string[]) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  toggleLikeComment: (postId: string, commentId: string) => Promise<void>;

  // Stories
  stories: Story[];
  createStory: (
    type: 'image' | 'text',
    mediaUrl?: string,
    textContent?: string,
    backgroundGradient?: string,
    privacy?: 'public' | 'friends'
  ) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;

  // Friends
  friends: User[];
  friendRequests: FriendRequest[];
  sentFriendRequests: FriendRequest[];
  sendFriendRequest: (targetUser: User) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  getUserFriends: (userId: string) => Promise<User[]>;

  // Messages
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, attachments?: Message['attachments']) => Promise<void>;
  sharePostToConversation: (conversationId: string, postId: string, caption?: string) => Promise<void>;
  logCallMessage: (
    toUserId: string,
    callType: 'audio' | 'video',
    status: 'completed' | 'missed' | 'rejected',
    durationSec: number
  ) => Promise<void>;
  getOrCreateConversation: (participant: User) => Promise<string>;
  setConversationNickname: (conversationId: string, userId: string, nickname: string) => Promise<void>;
  createGroupChat: (participants: User[], name: string) => Promise<string>;
  renameGroupChat: (conversationId: string, name: string) => Promise<void>;
  updateGroupChatAvatar: (conversationId: string, avatar: string) => Promise<void>;
  recallMessage: (conversationId: string, messageId: string) => Promise<void>;
  clearConversation: (conversationId: string) => Promise<void>;
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  addConversationMember: (conversationId: string, userId: string) => Promise<void>;
  removeConversationMember: (conversationId: string, userId: string) => Promise<void>;
  promoteConversationAdmin: (conversationId: string, userId: string) => Promise<void>;

  // Groups
  groups: Group[];
  createGroup: (name: string, description: string, privacy: 'public' | 'private', avatar?: string, coverImage?: string) => Promise<Group>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  fetchGroupJoinRequests: (groupId: string) => Promise<GroupJoinRequestItem[]>;
  approveGroupJoinRequest: (groupId: string, userId: string, name: string) => Promise<void>;
  rejectGroupJoinRequest: (groupId: string, userId: string, name: string) => Promise<void>;
  acceptGroupInvite: (groupId: string) => Promise<void>;
  declineGroupInvite: (groupId: string) => Promise<void>;
  inviteToGroup: (groupId: string, user: User) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  promoteGroupMember: (groupId: string, userId: string, role: 'admin' | 'moderator') => Promise<void>;
  updateGroupRules: (groupId: string, rules: string[]) => Promise<void>;
  deleteGroupAdmin: (groupId: string, name: string) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  hasMoreNotifications: boolean;
  isLoadingMoreNotifications: boolean;
  loadMoreNotifications: () => Promise<void>;
  markNotificationAsRead: (notifId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Reports
  reports: ReportItem[];
  createReport: (targetType: ReportItem['targetType'], targetId: string, reason: string, description?: string, targetName?: string) => Promise<void>;
  resolveReport: (reportId: string, note?: string) => Promise<void>;
  dismissReport: (reportId: string) => Promise<void>;

  // Admin
  systemAnnouncements: SystemAnnouncement[];
  createAnnouncement: (title: string, message: string, type?: SystemAnnouncement['type']) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  deletePostAdmin: (postId: string) => Promise<void>;
  deleteCommentAdmin: (postId: string, commentId: string) => Promise<void>;

  // Toast / Alert helpers
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

function groupCommentsByPost(comments: Comment[]): Record<string, Comment[]> {
  const grouped: Record<string, Comment[]> = {};
  for (const c of comments) {
    if (!grouped[c.postId]) grouped[c.postId] = [];
    grouped[c.postId].push(c);
  }
  return grouped;
}

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [stories, setStories] = useState<Story[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [systemAnnouncements, setSystemAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);

  const POSTS_PAGE_SIZE = 20;
  const NOTIFS_PAGE_SIZE = 30;

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      const message = err instanceof ApiError ? err.message : fallback;
      showToast(message, 'error');
    },
    [showToast]
  );

  // Load everything once a user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setComments({});
      setStories([]);
      setFriends([]);
      setFriendRequests([]);
      setSentFriendRequests([]);
      setConversations([]);
      setMessages({});
      setGroups([]);
      setNotifications([]);
      setReports([]);
      setSystemAnnouncements([]);
      return;
    }

    (async () => {
      const [postsRes, commentsRes, storiesRes, friendsRes, reqRes, sentReqRes, convRes, groupsRes, notifRes, annRes] =
        await Promise.allSettled([
          api.get<{ posts: Post[] }>(`/posts?limit=${POSTS_PAGE_SIZE}&skip=0`),
          api.get<{ comments: Comment[] }>('/comments'),
          api.get<{ stories: Story[] }>('/stories'),
          api.get<{ friends: User[] }>('/friends'),
          api.get<{ requests: FriendRequest[] }>('/friends/requests'),
          api.get<{ requests: FriendRequest[] }>('/friends/requests/sent'),
          api.get<{ conversations: Conversation[] }>('/messages/conversations'),
          api.get<{ groups: Group[] }>('/groups'),
          api.get<{ notifications: NotificationItem[] }>(`/notifications?limit=${NOTIFS_PAGE_SIZE}&skip=0`),
          api.get<{ announcements: SystemAnnouncement[] }>('/reports/announcements'),
        ]);

      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value.posts);
        setHasMorePosts(postsRes.value.posts.length === POSTS_PAGE_SIZE);
      }
      if (commentsRes.status === 'fulfilled') setComments(groupCommentsByPost(commentsRes.value.comments));
      if (storiesRes.status === 'fulfilled') setStories(storiesRes.value.stories);
      if (friendsRes.status === 'fulfilled') setFriends(friendsRes.value.friends);
      if (reqRes.status === 'fulfilled') setFriendRequests(reqRes.value.requests);
      if (sentReqRes.status === 'fulfilled') setSentFriendRequests(sentReqRes.value.requests);
      if (convRes.status === 'fulfilled') setConversations(convRes.value.conversations);
      if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value.groups);
      if (notifRes.status === 'fulfilled') {
        setNotifications(notifRes.value.notifications);
        setHasMoreNotifications(notifRes.value.notifications.length === NOTIFS_PAGE_SIZE);
      }
      if (annRes.status === 'fulfilled') setSystemAnnouncements(annRes.value.announcements);

      // Admin-only, fails silently for regular users
      try {
        const { reports } = await api.get<{ reports: ReportItem[] }>('/reports');
        setReports(reports);
      } catch {
        setReports([]);
      }
    })();
    // Re-run only when the logged-in user actually changes (login/logout), not on every profile field edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Live push over Socket.io — new/recalled/reacted-to messages and new notifications show up
  // instantly instead of requiring a manual refresh. Reuses the same socket connection the
  // calling feature already opened.
  useEffect(() => {
    if (!currentUser) return;
    refreshSocketAuth();
    const socket = getSocket();

    const onNewMessage = (data: { conversationId: string; message: Message }) => {
      setMessages((prev) => {
        const existing = prev[data.conversationId];
        if (!existing) return prev; // thread not open/loaded yet — conversation list update below still applies
        const idx = existing.findIndex((m) => m.id === data.message.id);
        const nextThread = idx > -1 ? existing.map((m) => (m.id === data.message.id ? data.message : m)) : [...existing, data.message];
        return { ...prev, [data.conversationId]: nextThread };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? {
                ...c,
                lastMessage: data.message,
                updatedAt: data.message.createdAt,
                unreadCount: data.message.senderId === currentUser.id ? c.unreadCount : c.unreadCount + 1,
              }
            : c
        )
      );
      // Toast unless the user is already looking at this conversation's thread.
      const isViewingThisThread = window.location.pathname === `/messages/${data.conversationId}`;
      if (data.message.senderId !== currentUser.id && !isViewingThisThread) {
        const preview = data.message.content?.trim() || (data.message.attachments?.length ? 'Đã gửi một tệp đính kèm' : 'Đã gửi một tin nhắn');
        showToast(`${data.message.senderName}: ${preview}`, 'info');
      }
    };

    const onNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      showToast(`${notif.actor.name} ${notif.content}`, 'info');

      // The recipient of a friend_accept notification is the original sender of the request —
      // their sentFriendRequests entry never resolves on its own without this, so the profile
      // button stays stuck on "Hủy lời mời" until a manual refresh.
      if (notif.type === 'friend_accept') {
        setSentFriendRequests((prev) => prev.filter((r) => r.receiverId !== notif.actor.id));
        setFriends((prev) => (prev.some((f) => f.id === notif.actor.id) ? prev : [notif.actor, ...prev]));
      }

      // A brand-new incoming request isn't in `friendRequests` yet and the notification payload
      // doesn't carry the request id needed to accept/reject it — refetch just that list.
      if (notif.type === 'friend_request') {
        api
          .get<{ requests: FriendRequest[] }>('/friends/requests')
          .then(({ requests }) => setFriendRequests(requests))
          .catch(() => {});
      }
    };

    const onConversationCleared = (data: { conversationId: string }) => {
      setMessages((prev) => ({ ...prev, [data.conversationId]: [] }));
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, lastMessage: undefined } : c))
      );
    };

    socket.on('message:new', onNewMessage);
    socket.on('notification:new', onNewNotification);
    socket.on('conversation:cleared', onConversationCleared);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('notification:new', onNewNotification);
      socket.off('conversation:cleared', onConversationCleared);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // --- POSTS ---
  const loadMorePosts = async () => {
    if (isLoadingMorePosts || !hasMorePosts) return;
    setIsLoadingMorePosts(true);
    try {
      const { posts: more } = await api.get<{ posts: Post[] }>(
        `/posts?limit=${POSTS_PAGE_SIZE}&skip=${posts.length}`
      );
      setPosts((prev) => [...prev, ...more]);
      setHasMorePosts(more.length === POSTS_PAGE_SIZE);
    } catch {
      // silent — user can retry by scrolling again
    } finally {
      setIsLoadingMorePosts(false);
    }
  };

  const createPost = async (
    content: string,
    images?: string[],
    privacy: Post['privacy'] = 'public',
    feeling?: string,
    groupId?: string,
    _groupName?: string,
    wallOwner?: User,
    taggedUserIds?: string[],
    video?: string
  ) => {
    try {
      const { post } = await api.post<{ post: Post }>('/posts', {
        content,
        images,
        video,
        privacy,
        feeling,
        groupId,
        wallOwnerId: wallOwner?.id,
        taggedUserIds,
      });
      setPosts((prev) => [post, ...prev]);
      showToast(
        wallOwner && wallOwner.id !== currentUser?.id
          ? `Đã đăng bài lên tường của ${wallOwner.name}!`
          : 'Đã đăng bài viết thành công!',
        'success'
      );
    } catch (err) {
      handleError(err, 'Không thể đăng bài viết.');
    }
  };

  const updatePost = async (postId: string, content: string, privacy?: Post['privacy'], feeling?: string, images?: string[], video?: string) => {
    try {
      const { post } = await api.patch<{ post: Post }>(`/posts/${postId}`, { content, privacy, feeling, images, video });
      setPosts((prev) => prev.map((p) => (p.id === postId ? post : p)));
      showToast('Đã cập nhật bài viết!', 'success');
    } catch (err) {
      handleError(err, 'Không thể cập nhật bài viết.');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('Đã xóa bài viết!', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa bài viết.');
    }
  };

  const toggleReaction = async (postId: string, type: ReactionType) => {
    try {
      const { post } = await api.post<{ post: Post }>(`/posts/${postId}/react`, { type });
      setPosts((prev) => prev.map((p) => (p.id === postId ? post : p)));
    } catch (err) {
      handleError(err, 'Không thể thả cảm xúc.');
    }
  };

  const toggleSavePost = async (postId: string) => {
    try {
      const { post } = await api.post<{ post: Post }>(`/posts/${postId}/save`);
      setPosts((prev) => prev.map((p) => (p.id === postId ? post : p)));
      showToast(post.isSaved ? 'Đã lưu bài viết vào mục đã lưu' : 'Đã bỏ lưu bài viết', 'info');
    } catch (err) {
      handleError(err, 'Không thể lưu bài viết.');
    }
  };

  const togglePinPost = async (postId: string) => {
    try {
      const { post } = await api.post<{ post: Post }>(`/posts/${postId}/pin`);
      setPosts((prev) => prev.map((p) => (p.id === postId ? post : p)));
      showToast(post.pinned ? 'Đã ghim bài viết' : 'Đã bỏ ghim bài viết', 'info');
    } catch (err) {
      handleError(err, 'Không thể ghim bài viết.');
    }
  };

  const sharePost = async (postId: string, message?: string) => {
    try {
      const { post } = await api.post<{ post: Post }>(`/posts/${postId}/share`, { message });
      setPosts((prev) => [
        post,
        ...prev.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p)),
      ]);
      showToast('Đã chia sẻ bài viết lên dòng thời gian của bạn!', 'success');
    } catch (err) {
      handleError(err, 'Không thể chia sẻ bài viết.');
    }
  };

  // --- COMMENTS ---
  const addComment = async (postId: string, content: string, image?: string, parentId?: string, taggedUserIds?: string[]) => {
    if (!content.trim() && !image) return;
    try {
      const { comment } = await api.post<{ comment: Comment }>('/comments', {
        postId,
        content,
        image,
        parentId,
        taggedUserIds,
      });
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)));
    } catch (err) {
      handleError(err, 'Không thể gửi bình luận.');
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).filter((c) => c.id !== commentId) }));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p)));
      showToast('Đã xóa bình luận', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa bình luận.');
    }
  };

  const toggleLikeComment = async (postId: string, commentId: string) => {
    try {
      const { comment } = await api.post<{ comment: Comment }>(`/comments/${commentId}/like`);
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? comment : c)),
      }));
    } catch (err) {
      handleError(err, 'Không thể thích bình luận.');
    }
  };

  // --- STORIES ---
  const createStory = async (
    type: 'image' | 'text',
    mediaUrl?: string,
    textContent?: string,
    backgroundGradient?: string,
    privacy?: 'public' | 'friends'
  ) => {
    try {
      const { story } = await api.post<{ story: Story }>('/stories', {
        type,
        mediaUrl,
        textContent,
        backgroundGradient,
        privacy,
      });
      setStories((prev) => [story, ...prev]);
      showToast('Đã đăng Story mới!', 'success');
    } catch (err) {
      handleError(err, 'Không thể đăng Story.');
    }
  };

  const viewStory = async (storyId: string) => {
    try {
      const { story } = await api.post<{ story: Story }>(`/stories/${storyId}/view`);
      setStories((prev) => prev.map((s) => (s.id === storyId ? story : s)));
    } catch {
      // silent: viewing is best-effort
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      await api.delete(`/stories/${storyId}`);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      showToast('Đã xóa Story!', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa Story.');
    }
  };

  // --- FRIENDS ---
  const sendFriendRequest = async (targetUser: User) => {
    try {
      const { request } = await api.post<{ request: FriendRequest }>('/friends/requests', { targetUserId: targetUser.id });
      setSentFriendRequests((prev) => [request, ...prev]);
      showToast(`Đã gửi lời mời kết bạn tới ${targetUser.name}`, 'success');
    } catch (err) {
      handleError(err, 'Không thể gửi lời mời kết bạn.');
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    try {
      await api.post(`/friends/requests/${requestId}/accept`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (req) setFriends((prev) => [req.sender, ...prev]);
      showToast(req ? `Bạn và ${req.sender.name} đã trở thành bạn bè!` : 'Đã chấp nhận lời mời kết bạn!', 'success');
    } catch (err) {
      handleError(err, 'Không thể chấp nhận lời mời.');
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/requests/${requestId}/reject`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast('Đã từ chối lời mời kết bạn', 'info');
    } catch (err) {
      handleError(err, 'Không thể từ chối lời mời.');
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      await api.delete(`/friends/requests/${requestId}`);
      setSentFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast('Đã hủy lời mời kết bạn', 'info');
    } catch (err) {
      handleError(err, 'Không thể hủy lời mời.');
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      showToast('Đã hủy kết bạn', 'info');
    } catch (err) {
      handleError(err, 'Không thể hủy kết bạn.');
    }
  };

  const getUserFriends = async (userId: string): Promise<User[]> => {
    try {
      const { friends: theirFriends } = await api.get<{ friends: User[] }>(`/friends/of/${userId}`);
      return theirFriends;
    } catch {
      return [];
    }
  };

  // --- MESSAGES ---
  const loadMessages = async (conversationId: string) => {
    try {
      const { messages: msgs } = await api.get<{ messages: Message[] }>(`/messages/conversations/${conversationId}/messages`);
      setMessages((prev) => ({ ...prev, [conversationId]: msgs }));
      // The GET above also marks every message as read server-side — mirror that here so the
      // unread badge clears immediately instead of waiting for the next full conversations fetch.
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      // silent
    }
  };

  const sendMessage = async (conversationId: string, content: string, attachments?: Message['attachments']) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    try {
      const { message } = await api.post<{ message: Message }>(`/messages/conversations/${conversationId}/messages`, {
        content,
        attachments,
      });
      setMessages((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), message] }));
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c))
      );
    } catch (err) {
      handleError(err, 'Không thể gửi tin nhắn.');
    }
  };

  const sharePostToConversation = async (conversationId: string, postId: string, caption?: string) => {
    try {
      const { message } = await api.post<{ message: Message }>(
        `/messages/conversations/${conversationId}/share-post`,
        { postId, message: caption }
      );
      setMessages((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), message] }));
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c))
      );
      showToast('Đã chia sẻ bài viết qua tin nhắn!', 'success');
    } catch (err) {
      handleError(err, 'Không thể chia sẻ bài viết.');
    }
  };

  const logCallMessage = async (
    toUserId: string,
    callType: 'audio' | 'video',
    status: 'completed' | 'missed' | 'rejected',
    durationSec: number
  ) => {
    try {
      const { conversationId, message } = await api.post<{ conversationId: string; message: Message }>(
        '/messages/call-log',
        { toUserId, callType, status, durationSec }
      );
      setMessages((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), message] }));
      setConversations((prev) =>
        prev.some((c) => c.id === conversationId)
          ? prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c))
          : prev
      );
    } catch {
      // silent — a missing call-log entry isn't worth interrupting the user over
    }
  };

  const getOrCreateConversation = async (participant: User): Promise<string> => {
    const existing = conversations.find((c) => !c.isGroup && c.participants.some((p) => p.id === participant.id));
    if (existing) return existing.id;
    const { conversation } = await api.post<{ conversation: Conversation }>('/messages/conversations', {
      participantId: participant.id,
    });
    setConversations((prev) => [conversation, ...prev]);
    return conversation.id;
  };

  // Appends a system message (e.g. "X added Y") to local state immediately, so the
  // chat reflects group actions in real time without waiting for a reload/refetch.
  const appendSystemMessage = (conversationId: string, systemMessage?: Message) => {
    if (!systemMessage) return;
    setMessages((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), systemMessage] }));
  };

  const setConversationNickname = async (conversationId: string, userId: string, nickname: string) => {
    try {
      const { conversation, systemMessage } = await api.patch<{ conversation: Conversation; systemMessage?: Message }>(
        `/messages/conversations/${conversationId}/nickname`,
        { userId, nickname }
      );
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? conversation : c)));
      appendSystemMessage(conversationId, systemMessage);
      showToast(nickname.trim() ? 'Đã cập nhật biệt danh!' : 'Đã xóa biệt danh', 'success');
    } catch (err) {
      handleError(err, 'Không thể cập nhật biệt danh.');
    }
  };

  const createGroupChat = async (participants: User[], name: string): Promise<string> => {
    const { conversation } = await api.post<{ conversation: Conversation }>('/messages/conversations', {
      participantIds: participants.map((p) => p.id),
      name,
    });
    setConversations((prev) => [conversation, ...prev]);
    return conversation.id;
  };

  const renameGroupChat = async (conversationId: string, name: string) => {
    try {
      const { conversation, systemMessage } = await api.patch<{ conversation: Conversation; systemMessage?: Message }>(
        `/messages/conversations/${conversationId}`,
        { name }
      );
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? conversation : c)));
      appendSystemMessage(conversationId, systemMessage);
      showToast('Đã đổi tên nhóm chat!', 'success');
    } catch (err) {
      handleError(err, 'Không thể đổi tên nhóm.');
    }
  };

  const updateGroupChatAvatar = async (conversationId: string, avatar: string) => {
    try {
      const { conversation, systemMessage } = await api.patch<{ conversation: Conversation; systemMessage?: Message }>(
        `/messages/conversations/${conversationId}`,
        { avatar }
      );
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? conversation : c)));
      appendSystemMessage(conversationId, systemMessage);
      showToast('Đã đổi ảnh đại diện nhóm!', 'success');
    } catch (err) {
      handleError(err, 'Không thể đổi ảnh đại diện nhóm.');
    }
  };

  const recallMessage = async (conversationId: string, messageId: string) => {
    try {
      const { message } = await api.delete<{ message: Message }>(
        `/messages/conversations/${conversationId}/messages/${messageId}`
      );
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) => (m.id === messageId ? message : m)),
      }));
    } catch (err) {
      handleError(err, 'Không thể thu hồi tin nhắn.');
    }
  };

  const clearConversation = async (conversationId: string) => {
    try {
      await api.delete(`/messages/conversations/${conversationId}/messages`);
      setMessages((prev) => ({ ...prev, [conversationId]: [] }));
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: undefined } : c))
      );
      showToast('Đã xóa toàn bộ cuộc trò chuyện.', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa cuộc trò chuyện.');
    }
  };

  const reactToMessage = async (conversationId: string, messageId: string, emoji: string) => {
    try {
      const { message } = await api.post<{ message: Message }>(
        `/messages/conversations/${conversationId}/messages/${messageId}/react`,
        { emoji }
      );
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) => (m.id === messageId ? message : m)),
      }));
    } catch (err) {
      handleError(err, 'Không thể thả cảm xúc.');
    }
  };

  const addConversationMember = async (conversationId: string, userId: string) => {
    try {
      const { conversation, systemMessage } = await api.post<{ conversation: Conversation; systemMessage?: Message }>(
        `/messages/conversations/${conversationId}/members`,
        { userId }
      );
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? conversation : c)));
      appendSystemMessage(conversationId, systemMessage);
      showToast('Đã thêm thành viên vào nhóm chat!', 'success');
    } catch (err) {
      handleError(err, 'Không thể thêm thành viên.');
    }
  };

  const removeConversationMember = async (conversationId: string, userId: string) => {
    try {
      const { conversation, systemMessage } = await api.delete<{ conversation: Conversation; systemMessage?: Message }>(
        `/messages/conversations/${conversationId}/members/${userId}`
      );
      // If I'm the one who left/was removed, the conversation no longer belongs in my list at all.
      const stillIn = conversation.participants.some((p) => p.id === currentUser?.id);
      setConversations((prev) =>
        stillIn ? prev.map((c) => (c.id === conversationId ? conversation : c)) : prev.filter((c) => c.id !== conversationId)
      );
      if (!stillIn) {
        setMessages((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
      } else {
        appendSystemMessage(conversationId, systemMessage);
      }
      showToast('Đã cập nhật nhóm chat.', 'info');
    } catch (err) {
      handleError(err, 'Không thể thực hiện.');
    }
  };

  const promoteConversationAdmin = async (conversationId: string, userId: string) => {
    try {
      const { conversation, systemMessage } = await api.post<{ conversation: Conversation; systemMessage?: Message }>(
        `/messages/conversations/${conversationId}/members/${userId}/promote`
      );
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? conversation : c)));
      appendSystemMessage(conversationId, systemMessage);
      showToast('Đã bổ nhiệm quản trị viên nhóm chat!', 'success');
    } catch (err) {
      handleError(err, 'Không thể bổ nhiệm.');
    }
  };

  // --- GROUPS ---
  const createGroup = async (
    name: string,
    description: string,
    privacy: 'public' | 'private',
    avatar?: string,
    coverImage?: string
  ): Promise<Group> => {
    const { group } = await api.post<{ group: Group }>('/groups', { name, description, privacy, avatar, coverImage });
    setGroups((prev) => [group, ...prev]);
    showToast(`Đã tạo nhóm "${name}" thành công!`, 'success');
    return group;
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/join`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast(
        group.isMember ? 'Đã tham gia nhóm!' : 'Đã gửi yêu cầu tham gia, chờ trưởng nhóm duyệt.',
        group.isMember ? 'success' : 'info'
      );
    } catch (err) {
      handleError(err, 'Không thể tham gia nhóm.');
    }
  };

  const fetchGroupJoinRequests = async (groupId: string) => {
    try {
      const { requests } = await api.get<{ requests: GroupJoinRequestItem[] }>(`/groups/${groupId}/join-requests`);
      return requests;
    } catch (err) {
      handleError(err, 'Không thể tải danh sách yêu cầu tham gia.');
      return [];
    }
  };

  const approveGroupJoinRequest = async (groupId: string, userId: string, name: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/join-requests/${userId}/approve`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast(`Đã chấp nhận ${name} vào nhóm!`, 'success');
    } catch (err) {
      handleError(err, 'Không thể duyệt yêu cầu tham gia.');
    }
  };

  const rejectGroupJoinRequest = async (groupId: string, userId: string, name: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/join-requests/${userId}/reject`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast(`Đã từ chối yêu cầu tham gia của ${name}.`, 'info');
    } catch (err) {
      handleError(err, 'Không thể từ chối yêu cầu tham gia.');
    }
  };

  const acceptGroupInvite = async (groupId: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/invites/accept`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast(`Đã tham gia nhóm "${group.name}"!`, 'success');
    } catch (err) {
      handleError(err, 'Không thể chấp nhận lời mời.');
    }
  };

  const declineGroupInvite = async (groupId: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/invites/decline`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast('Đã từ chối lời mời tham gia nhóm.', 'info');
    } catch (err) {
      handleError(err, 'Không thể từ chối lời mời.');
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/leave`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast('Đã rời khỏi nhóm', 'info');
    } catch (err) {
      handleError(err, 'Không thể rời nhóm.');
    }
  };

  const inviteToGroup = async (groupId: string, user: User) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/invite`, { userId: user.id });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast(`Đã mời ${user.name} vào nhóm!`, 'success');
    } catch (err) {
      handleError(err, 'Không thể mời thành viên.');
    }
  };

  const removeGroupMember = async (groupId: string, userId: string) => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/members/${userId}/remove`);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast('Đã xóa thành viên khỏi nhóm.', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa thành viên.');
    }
  };

  const promoteGroupMember = async (groupId: string, userId: string, role: 'admin' | 'moderator') => {
    try {
      const { group } = await api.post<{ group: Group }>(`/groups/${groupId}/members/${userId}/promote`, { role });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast(role === 'admin' ? 'Đã bổ nhiệm trưởng nhóm mới!' : 'Đã bổ nhiệm phó nhóm!', 'success');
    } catch (err) {
      handleError(err, 'Không thể bổ nhiệm.');
    }
  };

  const updateGroupRules = async (groupId: string, rules: string[]) => {
    try {
      const { group } = await api.patch<{ group: Group }>(`/groups/${groupId}/rules`, { rules });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
      showToast('Đã cập nhật quy tắc nhóm.', 'success');
    } catch (err) {
      handleError(err, 'Không thể cập nhật quy tắc nhóm.');
    }
  };

  const deleteGroupAdmin = async (groupId: string, name: string) => {
    try {
      await api.delete(`/groups/${groupId}`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setPosts((prev) => prev.filter((p) => p.groupId !== groupId));
      showToast(`Admin đã giải tán nhóm "${name}"`, 'info');
    } catch (err) {
      handleError(err, 'Không thể giải tán nhóm.');
    }
  };

  // --- NOTIFICATIONS ---
  const loadMoreNotifications = async () => {
    if (isLoadingMoreNotifications || !hasMoreNotifications) return;
    setIsLoadingMoreNotifications(true);
    try {
      const { notifications: more } = await api.get<{ notifications: NotificationItem[] }>(
        `/notifications?limit=${NOTIFS_PAGE_SIZE}&skip=${notifications.length}`
      );
      setNotifications((prev) => [...prev, ...more]);
      setHasMoreNotifications(more.length === NOTIFS_PAGE_SIZE);
    } catch {
      // silent — user can retry
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  };

  const markNotificationAsRead = async (notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    try {
      await api.patch(`/notifications/${notifId}/read`);
    } catch {
      // silent
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch('/notifications/read-all');
      showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'info');
    } catch (err) {
      handleError(err, 'Không thể cập nhật thông báo.');
    }
  };

  // --- REPORTS & ADMIN ---
  const createReport = async (
    targetType: ReportItem['targetType'],
    targetId: string,
    reason: string,
    description?: string,
    targetName?: string
  ) => {
    try {
      await api.post('/reports', { targetType, targetId, targetName, reason, description });
      showToast('Đã gửi báo cáo vi phạm tới ban quản trị!', 'success');
    } catch (err) {
      handleError(err, 'Không thể gửi báo cáo.');
    }
  };

  const resolveReport = async (reportId: string, note?: string) => {
    try {
      const { report } = await api.patch<{ report: ReportItem }>(`/reports/${reportId}/resolve`, { note });
      setReports((prev) => prev.map((r) => (r.id === reportId ? report : r)));
      showToast('Đã xử lý xong báo cáo!', 'success');
    } catch (err) {
      handleError(err, 'Không thể xử lý báo cáo.');
    }
  };

  const dismissReport = async (reportId: string) => {
    try {
      const { report } = await api.patch<{ report: ReportItem }>(`/reports/${reportId}/dismiss`);
      setReports((prev) => prev.map((r) => (r.id === reportId ? report : r)));
      showToast('Đã bỏ qua báo cáo', 'info');
    } catch (err) {
      handleError(err, 'Không thể bỏ qua báo cáo.');
    }
  };

  const createAnnouncement = async (title: string, message: string, type: SystemAnnouncement['type'] = 'info') => {
    try {
      const { announcement } = await api.post<{ announcement: SystemAnnouncement }>('/reports/announcements', {
        title,
        message,
        type,
      });
      setSystemAnnouncements((prev) => [announcement, ...prev]);
      showToast('Đã gửi thông báo hệ thống tới toàn bộ người dùng!', 'success');
    } catch (err) {
      handleError(err, 'Không thể tạo thông báo.');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await api.delete(`/reports/announcements/${id}`);
      setSystemAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Đã xóa thông báo hệ thống', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa thông báo.');
    }
  };

  const deletePostAdmin = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast(`Admin đã gỡ bài viết do vi phạm chính sách`, 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa bài viết.');
    }
  };

  const deleteCommentAdmin = async (postId: string, commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).filter((c) => c.id !== commentId) }));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p)));
      showToast('Admin đã xóa bình luận vi phạm', 'info');
    } catch (err) {
      handleError(err, 'Không thể xóa bình luận.');
    }
  };

  return (
    <SocialContext.Provider
      value={{
        posts,
        hasMorePosts,
        isLoadingMorePosts,
        loadMorePosts,
        createPost,
        updatePost,
        deletePost,
        toggleReaction,
        toggleSavePost,
        togglePinPost,
        sharePost,
        comments,
        addComment,
        deleteComment,
        toggleLikeComment,
        stories,
        createStory,
        viewStory,
        deleteStory,
        friends,
        friendRequests,
        sentFriendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        removeFriend,
        getUserFriends,
        conversations,
        messages,
        loadMessages,
        sendMessage,
        sharePostToConversation,
        logCallMessage,
        getOrCreateConversation,
        setConversationNickname,
        createGroupChat,
        renameGroupChat,
        updateGroupChatAvatar,
        recallMessage,
        clearConversation,
        reactToMessage,
        addConversationMember,
        removeConversationMember,
        promoteConversationAdmin,
        groups,
        createGroup,
        joinGroup,
        leaveGroup,
        fetchGroupJoinRequests,
        approveGroupJoinRequest,
        rejectGroupJoinRequest,
        acceptGroupInvite,
        declineGroupInvite,
        inviteToGroup,
        removeGroupMember,
        promoteGroupMember,
        updateGroupRules,
        deleteGroupAdmin,
        notifications,
        hasMoreNotifications,
        isLoadingMoreNotifications,
        loadMoreNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        reports,
        createReport,
        resolveReport,
        dismissReport,
        systemAnnouncements,
        createAnnouncement,
        deleteAnnouncement,
        deletePostAdmin,
        deleteCommentAdmin,
        toast,
        showToast,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used within a SocialProvider');
  return context;
};
