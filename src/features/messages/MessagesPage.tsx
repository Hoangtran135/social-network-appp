import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { timeAgo } from '../../utils/time';
import {
  MessageCircle,
  Search,
  Send,
  Image as ImageIcon,
  Paperclip,
  Smile,
  X,
  Phone,
  Video,
  Info,
  CheckCheck,
  Plus,
  ArrowLeft,
  FileText,
  Pencil,
  Check,
  Images,
  Loader2,
  Users,
  UserPlus,
  Shield,
  UserMinus,
  LogOut,
  SmilePlus,
  RotateCcw,
  Camera,
  PhoneMissed,
  PhoneOff,
} from 'lucide-react';
import { MessageAttachment, Post, User } from '../../types';
import { uploadFile, formatFileSize, uploadImageFile } from '../../utils/upload';
import { useCall } from '../calls/CallContext';
import { api, ApiError } from '../../utils/api';
import { useConfirm } from '../../common/ConfirmDialogProvider';

const MESSAGE_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

// Fetches the shared post live (via the same access-controlled endpoint the feed uses) so a
// private/group post shared into a chat is only visible to recipients who are actually allowed
// to see it — e.g. a private group's post still requires group membership to open.
const SharedPostPreview: React.FC<{ postId: string; isMine: boolean }> = ({ postId, isMine }) => {
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'denied' | 'gone'; post?: Post }>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ post: Post }>(`/posts/${postId}`)
      .then(({ post }) => {
        if (!cancelled) setState({ status: 'ok', post });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: err instanceof ApiError && err.status === 403 ? 'denied' : 'gone' });
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const boxClass = `mt-2 rounded-xl border overflow-hidden ${
    isMine ? 'bg-blue-700/40 border-blue-400/60' : 'bg-slate-50 border-slate-200'
  }`;

  if (state.status === 'loading') {
    return (
      <div className={boxClass}>
        <div className="p-3 text-[11px] opacity-70">Đang tải bài viết...</div>
      </div>
    );
  }
  if (state.status === 'denied') {
    return (
      <div className={boxClass}>
        <div className="p-3 text-[11px] opacity-90">
          🔒 Đây là bài viết riêng tư. Bạn cần tham gia nhóm hoặc là bạn bè để xem.
        </div>
      </div>
    );
  }
  if (state.status === 'gone' || !state.post) {
    return (
      <div className={boxClass}>
        <div className="p-3 text-[11px] opacity-70">Bài viết không còn tồn tại.</div>
      </div>
    );
  }

  const post = state.post;
  return (
    <Link to={`/profile/${post.author.id}`} className={`${boxClass} block hover:opacity-90 transition-opacity`}>
      {post.images && post.images[0] && (
        <img src={post.images[0]} alt="" className="w-full max-h-40 object-cover" />
      )}
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <img src={post.author.avatar} alt={post.author.name} className="w-4 h-4 rounded-full object-cover" />
          <span className="text-[11px] font-bold">{post.author.name}</span>
        </div>
        {post.content && <p className="text-[11px] opacity-90 line-clamp-2">{post.content}</p>}
      </div>
    </Link>
  );
};

export const MessagesPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { startCall } = useCall();
  const {
    conversations,
    messages,
    friends,
    sendMessage,
    getOrCreateConversation,
    loadMessages,
    setConversationNickname,
    createGroupChat,
    addConversationMember,
    removeConversationMember,
    promoteConversationAdmin,
    updateGroupChatAvatar,
    recallMessage,
    reactToMessage,
    clearConversation,
    showToast,
  } = useSocial();
  const { currentUser, allUsers } = useAuth();
  const [fetchedBot, setFetchedBot] = useState<User | undefined>(undefined);
  const aiBot = allUsers.find((u) => u.isBot) || fetchedBot;

  // The bot is a fixed system account that may not fall within the now-bounded `allUsers`
  // page (it's an early account, and that list is sorted newest-first) — fetch it directly
  // instead of just hiding the AI chatbot entry point when it doesn't happen to be loaded.
  useEffect(() => {
    if (allUsers.some((u) => u.isBot)) return;
    api
      .get<{ users: User[] }>('/users?bot=true&limit=1')
      .then(({ users }) => setFetchedBot(users[0]))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<MessageAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSelectedIds, setNewChatSelectedIds] = useState<string[]>([]);
  const [newChatGroupName, setNewChatGroupName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showAddMemberPicker, setShowAddMemberPicker] = useState(false);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [openReactionPickerFor, setOpenReactionPickerFor] = useState<string | null>(null);
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const imageAttachInputRef = useRef<HTMLInputElement>(null);
  const fileAttachInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active conversation
  const activeConversation = conversations.find((c) => c.id === conversationId) || conversations[0];

  // Current conversation's messages
  const currentMessages = useMemo(() => {
    return activeConversation ? messages[activeConversation.id] || [] : [];
  }, [activeConversation, messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeConversation]);

  // Lazily load messages for whichever conversation is active
  useEffect(() => {
    if (activeConversation) loadMessages(activeConversation.id);
  }, [activeConversation?.id]);

  // Partner user for direct chats
  const getChatPartner = () => {
    if (!activeConversation || !currentUser) return null;
    return activeConversation.participants.find((p) => p.id !== currentUser.id) || activeConversation.participants[0];
  };

  const partner = getChatPartner();

  const partnerNickname = partner && activeConversation?.nicknames?.[partner.id];
  const myNickname = currentUser && activeConversation?.nicknames?.[currentUser.id];

  const sharedPhotos = currentMessages
    .flatMap((m) => m.attachments || [])
    .filter((a) => a.type === 'image')
    .map((a) => a.url)
    .reverse();

  // Reset side panel state whenever the active conversation changes
  useEffect(() => {
    setShowInfoPanel(false);
    setEditingNickname(null);
  }, [activeConversation?.id]);

  const handleSaveNickname = (targetUserId: string) => {
    if (!activeConversation) return;
    setConversationNickname(activeConversation.id, targetUserId, nicknameInput);
    setEditingNickname(null);
  };

  const handleGroupAvatarSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeConversation) return;
    setIsUploadingGroupAvatar(true);
    try {
      const url = await uploadImageFile(files[0]);
      await updateGroupChatAvatar(activeConversation.id, url);
    } catch {
      showToast('Tải ảnh lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingGroupAvatar(false);
      if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = '';
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    if (!activeConversation) return;
    if (await confirm('Thu hồi tin nhắn này? Mọi người trong cuộc trò chuyện sẽ không còn thấy nội dung.')) {
      recallMessage(activeConversation.id, messageId);
    }
  };

  const handleClearConversation = async () => {
    if (!activeConversation) return;
    if (
      await confirm('Bắt đầu cuộc trò chuyện mới? Toàn bộ tin nhắn cũ sẽ bị xóa và không thể khôi phục.')
    ) {
      clearConversation(activeConversation.id);
    }
  };

  const handleReactMessage = (messageId: string, emoji: string) => {
    if (!activeConversation) return;
    reactToMessage(activeConversation.id, messageId, emoji);
    setOpenReactionPickerFor(null);
  };

  // Filter + sort conversations: most recent activity (last message, or conversation
  // creation if it has none yet) always shows first.
  const filteredConversations = conversations
    .filter((c) => {
      const title = c.isGroup
        ? c.name
        : c.participants.map((p) => p.name).join(' ');
      return title?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt).getTime();
      return bTime - aTime;
    });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation) return;
    if (!inputText.trim() && selectedAttachments.length === 0) return;

    sendMessage(
      activeConversation.id,
      inputText.trim(),
      selectedAttachments.length > 0 ? selectedAttachments : undefined
    );

    setInputText('');
    setSelectedAttachments([]);
    setShowEmojiPicker(false);
  };

  const handleAttachFileSelected = async (files: FileList | null, kind: 'image' | 'file') => {
    if (!files || files.length === 0) return;
    setIsUploadingAttachment(true);
    setShowAttachMenu(false);
    try {
      const result = await uploadFile(files[0]);
      setSelectedAttachments((prev) => [
        ...prev,
        { type: kind, url: result.url, name: result.name, size: formatFileSize(result.size) },
      ]);
    } catch {
      showToast('Tải tệp lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingAttachment(false);
      if (imageAttachInputRef.current) imageAttachInputRef.current.value = '';
      if (fileAttachInputRef.current) fileAttachInputRef.current.value = '';
    }
  };

  const emojis = ['👍', '❤️', '😂', '🔥', '🎉', '🚀', '😍', '👏', '✨', '🙌', '💯', '🤔'];

  const handleStartChatWithUser = async (user: User) => {
    const newConvId = await getOrCreateConversation(user);
    setShowNewChatModal(false);
    navigate(`/messages/${newConvId}`);
  };

  const toggleNewChatSelection = (userId: string) => {
    setNewChatSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const closeNewChatModal = () => {
    setShowNewChatModal(false);
    setNewChatSelectedIds([]);
    setNewChatGroupName('');
  };

  // Selecting exactly 1 person creates/opens a normal 1-1 chat. Selecting 2+ requires
  // a group name and creates a real group chat (server falls back to 1-1 if <3 total members).
  const handleConfirmNewChat = async () => {
    if (newChatSelectedIds.length === 0 || isCreatingChat) return;
    setIsCreatingChat(true);
    try {
      if (newChatSelectedIds.length === 1) {
        const user = friends.find((f) => f.id === newChatSelectedIds[0]);
        if (user) await handleStartChatWithUser(user);
        return;
      }
      if (!newChatGroupName.trim()) {
        showToast('Vui lòng đặt tên cho nhóm chat.', 'error');
        return;
      }
      const participants = friends.filter((f) => newChatSelectedIds.includes(f.id));
      const newConvId = await createGroupChat(participants, newChatGroupName.trim());
      closeNewChatModal();
      navigate(`/messages/${newConvId}`);
    } catch {
      showToast('Không thể tạo cuộc trò chuyện.', 'error');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const myMembership = activeConversation?.isGroup
    ? (activeConversation.adminIds?.includes(currentUser?.id || '') ? 'admin' : 'member')
    : null;
  const isSoleAdmin =
    myMembership === 'admin' && (activeConversation?.adminIds?.length || 0) <= 1;

  const handleAddMember = async (user: User) => {
    if (!activeConversation) return;
    await addConversationMember(activeConversation.id, user.id);
    setShowAddMemberPicker(false);
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!activeConversation) return;
    if (await confirm(`Xóa ${name} khỏi nhóm chat?`)) {
      removeConversationMember(activeConversation.id, userId);
    }
  };

  const handlePromoteMember = async (userId: string, name: string) => {
    if (!activeConversation) return;
    if (await confirm({ message: `Bổ nhiệm ${name} làm quản trị viên nhóm chat?`, danger: false })) {
      promoteConversationAdmin(activeConversation.id, userId);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConversation || !currentUser) return;
    if (isSoleAdmin && activeConversation.participants.length > 1) {
      showToast('Bạn là quản trị viên duy nhất — hãy bổ nhiệm người khác trước khi rời nhóm.', 'error');
      return;
    }
    if (await confirm(`Bạn có chắc muốn rời khỏi nhóm "${activeConversation.name}"?`)) {
      removeConversationMember(activeConversation.id, currentUser.id).then(() => navigate('/messages'));
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-7rem)] flex">
      {/* LEFT: Conversation List Panel */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
          conversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">Tin nhắn</h2>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            title="Tạo cuộc trò chuyện mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* AI Assistant quick-access */}
        {aiBot && (
          <button
            onClick={() => handleStartChatWithUser(aiBot)}
            className="mx-3 mt-3 flex items-center gap-2.5 p-2.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-100 transition-colors text-left"
          >
            <img src={aiBot.avatar} alt={aiBot.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-indigo-700 truncate">{aiBot.name}</p>
              <p className="text-[11px] text-indigo-500 truncate">Trợ lý AI · Hỏi gì cũng được</p>
            </div>
          </button>
        )}

        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Không tìm thấy cuộc trò chuyện nào
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUser = conv.participants.find((p) => p.id !== currentUser?.id) || conv.participants[0];
              const isSelected = activeConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/messages/${conv.id}`)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/80 border-r-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.isGroup ? conv.avatar : otherUser?.avatar}
                      alt={otherUser?.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                    />
                    {!conv.isGroup && otherUser?.isOnline && (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {conv.isGroup ? conv.name : (otherUser && conv.nicknames?.[otherUser.id]) || otherUser?.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {timeAgo(conv.lastMessage?.createdAt || conv.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate">
                        {conv.lastMessage
                          ? `${conv.lastMessage.senderId === currentUser?.id ? 'Bạn: ' : ''}${
                              conv.lastMessage.content ||
                              (conv.lastMessage.attachments?.[0]?.type === 'image'
                                ? 'Đã gửi một hình ảnh'
                                : 'Đã gửi một tệp đính kèm')
                            }`
                          : 'Bắt đầu cuộc trò chuyện'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Active Chat View */}
      {activeConversation ? (
        <div
          className={`flex-1 flex flex-col bg-slate-50/60 ${
            !conversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Active Chat Header */}
          <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/messages')}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative">
                <img
                  src={activeConversation.isGroup ? activeConversation.avatar : partner?.avatar}
                  alt={partner?.name}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                />
                {!activeConversation.isGroup && partner?.isOnline && (
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                  <span>{activeConversation.isGroup ? activeConversation.name : partnerNickname || partner?.name}</span>
                  {partner?.isBot && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold uppercase tracking-wide shrink-0">
                      AI
                    </span>
                  )}
                </h3>
                {!activeConversation.isGroup && !partner?.isBot && (
                  <span className={`text-[11px] font-medium ${partner?.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {partner?.isOnline
                      ? 'Đang hoạt động'
                      : partner?.lastActive
                      ? `Hoạt động ${timeAgo(partner.lastActive)}`
                      : 'Không hoạt động'}
                  </span>
                )}
                {partner?.isBot && (
                  <span className="text-[11px] font-medium text-indigo-500">Luôn sẵn sàng trả lời</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-600">
              {!activeConversation.isGroup && partner && !partner.isBot && (
                <>
                  <button
                    onClick={() => startCall(partner, 'audio', activeConversation.id)}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    title="Gọi thoại"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCall(partner, 'video', activeConversation.id)}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    title="Gọi video"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </>
              )}
              {partner?.isBot && (
                <button
                  onClick={handleClearConversation}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors"
                  title="Cuộc trò chuyện mới (xóa toàn bộ tin nhắn cũ)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`p-2 rounded-full transition-colors ${
                  showInfoPanel ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100'
                }`}
                title="Thông tin cuộc trò chuyện"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Chưa có tin nhắn nào</h4>
                <p className="text-xs max-w-xs mt-1">
                  Hãy gửi lời chào đến {partner?.name || 'cuộc trò chuyện'} để bắt đầu tương tác!
                </p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                if (msg.kind === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full text-center">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                if (msg.kind === 'call') {
                  const isMineCall = msg.senderId === currentUser?.id;
                  const isVideoCall = msg.callType === 'video';
                  const mins = Math.floor((msg.callDurationSec || 0) / 60);
                  const secs = (msg.callDurationSec || 0) % 60;
                  const duration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                  const label =
                    msg.callStatus === 'completed'
                      ? `${isVideoCall ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} · ${duration}`
                      : msg.callStatus === 'missed'
                      ? `${isMineCall ? 'Cuộc gọi nhỡ' : 'Bạn đã bỏ lỡ cuộc gọi'} ${isVideoCall ? 'video' : 'thoại'}`
                      : `${isMineCall ? 'Đã hủy cuộc gọi' : 'Cuộc gọi bị từ chối'} ${isVideoCall ? 'video' : 'thoại'}`;
                  const Icon = msg.callStatus === 'completed' ? (isVideoCall ? Video : Phone) : msg.callStatus === 'missed' ? PhoneMissed : PhoneOff;
                  const isDanger = msg.callStatus !== 'completed';
                  return (
                    <div key={msg.id} className={`flex ${isMineCall ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-2xl border text-xs font-medium max-w-[75%] ${
                          isDanger
                            ? 'bg-rose-50 border-rose-100 text-rose-600'
                            : 'bg-white border-slate-200 text-slate-600 shadow-sm'
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                            isDanger ? 'bg-rose-100' : 'bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{label}</span>
                      </div>
                    </div>
                  );
                }

                const isMine = msg.senderId === currentUser?.id;
                const reactionEntries = Object.entries(msg.reactions || {});
                const myReaction = currentUser ? msg.reactions?.[currentUser.id] : undefined;

                return (
                  <div
                    key={msg.id}
                    className={`group/msg flex items-end gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMine && (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-slate-200"
                      />
                    )}

                    {/* Hover action bar: react + (own messages) recall */}
                    {!msg.isRecalled && (
                      <div
                        className={`relative flex items-center gap-0.5 pb-1 opacity-0 group-hover/msg:opacity-100 transition-opacity ${
                          isMine ? 'order-first' : ''
                        }`}
                      >
                        <button
                          onClick={() => setOpenReactionPickerFor(openReactionPickerFor === msg.id ? null : msg.id)}
                          className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-amber-500 shadow-xs"
                          title="Thả cảm xúc"
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </button>
                        {isMine && (
                          <button
                            onClick={() => handleRecallMessage(msg.id)}
                            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-rose-600 shadow-xs"
                            title="Thu hồi tin nhắn"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {openReactionPickerFor === msg.id && (
                          <div
                            className={`absolute bottom-full mb-1 flex items-center gap-0.5 bg-white border border-slate-200 rounded-full shadow-lg p-1 z-20 ${
                              isMine ? 'right-0' : 'left-0'
                            }`}
                          >
                            {MESSAGE_REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReactMessage(msg.id, emoji)}
                                className="p-1 rounded-full hover:bg-slate-100 hover:scale-125 transition-transform text-base"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col" style={{ maxWidth: '20rem' }}>
                      <div
                        className={`sm:max-w-md rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs ${
                          msg.isRecalled
                            ? 'bg-slate-100 text-slate-400 italic border border-slate-200'
                            : isMine
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                        }`}
                      >
                        {msg.isRecalled ? (
                          <p className="leading-relaxed">Tin nhắn đã được thu hồi</p>
                        ) : (
                          <>
                            {/* Message Text */}
                            {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                            {/* Shared post reference */}
                            {msg.sharedPostId && <SharedPostPreview postId={msg.sharedPostId} isMine={isMine} />}

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {msg.attachments.map((att, idx) => (
                                  <div key={idx}>
                                    {att.type === 'image' ? (
                                      <img
                                        src={att.url}
                                        alt="Attachment"
                                        className="rounded-xl max-h-56 w-full object-cover border border-white/20"
                                      />
                                    ) : (
                                      <div
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                                          isMine
                                            ? 'bg-blue-700/60 border-blue-500 text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}
                                      >
                                        <FileText className="w-5 h-5 shrink-0 text-blue-300" />
                                        <div className="min-w-0 flex-1">
                                          <div className="font-bold truncate text-xs">{att.name}</div>
                                          {att.size && (
                                            <div className="text-[10px] opacity-80">{att.size}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div
                              className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                                isMine ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              <span>{timeAgo(msg.createdAt)}</span>
                              {isMine && <CheckCheck className="w-3 h-3 text-blue-200" />}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Reaction badges */}
                      {reactionEntries.length > 0 && (
                        <button
                          onClick={() => handleReactMessage(msg.id, myReaction || '👍')}
                          className={`mt-1 self-start flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-xs shadow-xs ${
                            isMine ? 'self-end' : 'self-start'
                          }`}
                          title="Bấm để đổi/xóa cảm xúc của bạn"
                        >
                          {Array.from(new Set(reactionEntries.map(([, emoji]) => emoji))).map((emoji) => (
                            <span key={emoji}>{emoji}</span>
                          ))}
                          {reactionEntries.length > 1 && (
                            <span className="text-[10px] text-slate-500 ml-0.5">{reactionEntries.length}</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachments Preview Bar */}
          {selectedAttachments.length > 0 && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
              {selectedAttachments.map((att, index) => (
                <div
                  key={index}
                  className="relative group shrink-0 bg-white p-1.5 rounded-xl border border-slate-300 shadow-xs flex items-center gap-2"
                >
                  {att.type === 'image' ? (
                    <img src={att.url} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <FileText className="w-6 h-6 text-blue-600" />
                  )}
                  <span className="text-[11px] font-medium text-slate-700 max-w-[100px] truncate">
                    {att.name}
                  </span>
                  <button
                    onClick={() =>
                      setSelectedAttachments((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="p-1 rounded-full bg-slate-200 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Emoji Bar */}
          {showEmojiPicker && (
            <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-lg transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Box */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="relative">
                <input
                  ref={imageAttachInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAttachFileSelected(e.target.files, 'image')}
                />
                <input
                  ref={fileAttachInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleAttachFileSelected(e.target.files, 'file')}
                />
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={isUploadingAttachment}
                  className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  title="Đính kèm tệp / ảnh"
                >
                  {isUploadingAttachment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 space-y-1">
                    <button
                      type="button"
                      onClick={() => imageAttachInputRef.current?.click()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span>Đính kèm hình ảnh từ thiết bị</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileAttachInputRef.current?.click()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Đính kèm tệp từ thiết bị</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-xl transition-colors ${
                  showEmojiPicker
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="Biểu tượng cảm xúc"
              >
                <Smile className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && selectedAttachments.length === 0}
                className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-blue-500/20 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Group Chat Info Panel */}
      {activeConversation && showInfoPanel && activeConversation.isGroup && (
        <div className="hidden xl:flex w-80 border-l border-slate-200 flex-col shrink-0 bg-white overflow-y-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
              />
              {myMembership === 'admin' && (
                <>
                  <input
                    ref={groupAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleGroupAvatarSelected(e.target.files)}
                  />
                  <button
                    onClick={() => groupAvatarInputRef.current?.click()}
                    disabled={isUploadingGroupAvatar}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-white shadow-xs disabled:opacity-60"
                    title="Đổi ảnh đại diện nhóm"
                  >
                    {isUploadingGroupAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-900">{activeConversation.name}</h3>
            <span className="text-xs text-slate-400">{activeConversation.participants.length} thành viên</span>
          </div>

          {/* Members */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Thành viên
              </h4>
              {myMembership === 'admin' && (
                <button
                  onClick={() => setShowAddMemberPicker(!showAddMemberPicker)}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                  title="Thêm thành viên"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>

            {showAddMemberPicker && (
              <div className="mb-3 max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {friends
                  .filter((f) => !activeConversation.participants.some((p) => p.id === f.id))
                  .map((f) => (
                    <div
                      key={f.id}
                      onClick={() => handleAddMember(f)}
                      className="p-2 flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
                    >
                      <img src={f.avatar} alt={f.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-slate-700 truncate">{f.name}</span>
                    </div>
                  ))}
                {friends.every((f) => activeConversation.participants.some((p) => p.id === f.id)) && (
                  <p className="text-[11px] text-slate-400 text-center py-3">Không còn bạn bè nào để thêm.</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              {activeConversation.participants.map((p) => {
                const isAdmin = activeConversation.adminIds?.includes(p.id);
                const isMe = p.id === currentUser?.id;
                return (
                  <div key={p.id} className="flex items-center gap-2.5 py-1.5 group">
                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {activeConversation.nicknames?.[p.id] || p.name}
                          {isMe ? ' (Bạn)' : ''}
                        </span>
                        {isAdmin && <Shield className="w-3 h-3 text-blue-500 shrink-0" aria-label="Quản trị viên" />}
                      </div>
                    </div>
                    {myMembership === 'admin' && !isMe && (
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                        {!isAdmin && (
                          <button
                            onClick={() => handlePromoteMember(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Bổ nhiệm làm quản trị viên"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(p.id, p.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xóa khỏi nhóm"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Photos */}
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5" />
              Ảnh đã chia sẻ ({sharedPhotos.length})
            </h4>
            {sharedPhotos.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có ảnh nào được chia sẻ.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {sharedPhotos.slice(0, 9).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img src={url} alt="Shared" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="p-5">
            <button
              onClick={handleLeaveGroup}
              className="btn-danger-ghost w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Rời khỏi nhóm</span>
            </button>
          </div>
        </div>
      )}

      {/* Conversation Info Panel */}
      {activeConversation && showInfoPanel && !activeConversation.isGroup && partner && (
        <div className="hidden xl:flex w-80 border-l border-slate-200 flex-col shrink-0 bg-white overflow-y-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col items-center text-center">
            <img
              src={partner.avatar}
              alt={partner.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md mb-3"
            />
            {partner.isBot ? (
              <span className="font-bold text-sm text-slate-900">{partnerNickname || partner.name}</span>
            ) : (
              <Link to={`/profile/${partner.id}`} className="font-bold text-sm text-slate-900 hover:text-blue-600">
                {partnerNickname || partner.name}
              </Link>
            )}
            <span className="text-xs text-slate-400">@{partner.username}</span>
            {!partner.isBot && (
              <Link
                to={`/profile/${partner.id}`}
                className="mt-3 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Xem trang cá nhân
              </Link>
            )}
          </div>

          {/* Nicknames */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            {/* Partner's nickname */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Biệt danh của {partner.name}
              </h4>
              {editingNickname === partner.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder={partner.name}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveNickname(partner.id)}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNicknameInput(partnerNickname || '');
                    setEditingNickname(partner.id);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                >
                  <span>{partnerNickname || 'Chưa đặt biệt danh'}</span>
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>

            {/* My own nickname in this conversation */}
            {currentUser && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Biệt danh của bạn
                </h4>
                {editingNickname === currentUser.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      placeholder={currentUser.name}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleSaveNickname(currentUser.id)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNicknameInput(myNickname || '');
                      setEditingNickname(currentUser.id);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                  >
                    <span>{myNickname || 'Chưa đặt biệt danh'}</span>
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Shared Photos */}
          <div className="p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5" />
              Ảnh đã chia sẻ ({sharedPhotos.length})
            </h4>
            {sharedPhotos.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có ảnh nào được chia sẻ.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {sharedPhotos.slice(0, 9).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img src={url} alt="Shared" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!activeConversation && (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 bg-slate-50 text-slate-400">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chọn cuộc trò chuyện</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
            Chọn một người bạn hoặc tạo cuộc trò chuyện mới để bắt đầu gửi tin nhắn, hình ảnh và tài liệu.
          </p>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
          >
            Tạo cuộc trò chuyện mới
          </button>
        </div>
      )}

      {/* New Chat User Selector Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Tin nhắn mới</h3>
              <button onClick={closeNewChatModal} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Chọn 1 người để nhắn tin trực tiếp, hoặc từ 2 người trở lên để tạo nhóm chat:
            </p>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
              {friends.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  Bạn chưa có bạn bè nào để bắt đầu trò chuyện.
                </p>
              )}
              {friends
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => {
                  const isSelected = newChatSelectedIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleNewChatSelection(u.id)}
                      className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{u.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })}
            </div>

            {newChatSelectedIds.length >= 2 && (
              <input
                type="text"
                autoFocus
                value={newChatGroupName}
                onChange={(e) => setNewChatGroupName(e.target.value)}
                placeholder="Đặt tên nhóm chat..."
                className="input mt-3"
              />
            )}

            <button
              onClick={handleConfirmNewChat}
              disabled={newChatSelectedIds.length === 0 || isCreatingChat}
              className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreatingChat ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : newChatSelectedIds.length >= 2 ? (
                <Users className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {newChatSelectedIds.length >= 2
                  ? `Tạo nhóm chat (${newChatSelectedIds.length} thành viên)`
                  : 'Bắt đầu trò chuyện'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
