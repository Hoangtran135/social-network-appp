import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post, ReactionType, Comment } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { EditPostModal } from './EditPostModal';
import { ReportModal } from '../moderation/ReportModal';
import { formatFeelingPhrase } from '../../utils/feeling';
import { detectMentionTrigger, insertMention } from '../../utils/mention';
import {
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Globe,
  Users,
  Lock,
  Edit2,
  Trash2,
  AlertTriangle,
  Send,
  Image as ImageIcon,
  Copy,
  Loader2,
  UserPlus,
  Check,
  Pin,
} from 'lucide-react';
import { timeAgo } from '../../utils/time';
import { uploadImageFile } from '../../utils/upload';
import { useConfirm } from '../../common/ConfirmDialogProvider';

interface PostCardProps {
  post: Post;
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  like: { emoji: '👍', label: 'Thích', color: 'text-blue-600' },
  love: { emoji: '❤️', label: 'Yêu thích', color: 'text-rose-500' },
  haha: { emoji: '😄', label: 'Haha', color: 'text-amber-500' },
  wow: { emoji: '😮', label: 'Wow', color: 'text-amber-500' },
  sad: { emoji: '😢', label: 'Buồn', color: 'text-yellow-600' },
  angry: { emoji: '😡', label: 'Phẫn nộ', color: 'text-orange-600' },
};

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { currentUser, isAdmin } = useAuth();
  const confirm = useConfirm();
  const {
    toggleReaction,
    toggleSavePost,
    togglePinPost,
    sharePost,
    sharePostToConversation,
    getOrCreateConversation,
    deletePost,
    comments,
    addComment,
    deleteComment,
    toggleLikeComment,
    showToast,
    friends,
    groups,
  } = useSocial();

  const [showOptions, setShowOptions] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState('');
  const [isUploadingCommentImage, setIsUploadingCommentImage] = useState(false);
  const [showCommentTagPicker, setShowCommentTagPicker] = useState(false);
  const [commentTaggedUserIds, setCommentTaggedUserIds] = useState<string[]>([]);
  const [commentMentionState, setCommentMentionState] = useState<{ anchorIndex: number; query: string } | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showShareToChat, setShowShareToChat] = useState(false);
  const [isSharingToChat, setIsSharingToChat] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const optionsRef = useRef<HTMLDivElement>(null);
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const postComments: Comment[] = comments[post.id] || [];
  const isOwner = currentUser?.id === post.author.id;
  const userReaction = post.reactions.find((r) => r.userId === currentUser?.id);
  const groupMembership = post.groupId
    ? groups.find((g) => g.id === post.groupId)?.members.find((m) => m.userId === currentUser?.id)
    : undefined;
  const canPin = isOwner || groupMembership?.role === 'admin' || groupMembership?.role === 'moderator';

  // Close options menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !commentImage) return;
    addComment(post.id, commentText, commentImage || undefined, undefined, commentTaggedUserIds);
    setCommentText('');
    setCommentImage('');
    setCommentTaggedUserIds([]);
    setShowCommentTagPicker(false);
    setCommentMentionState(null);
  };

  const toggleCommentTaggedUser = (userId: string) => {
    setCommentTaggedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleReplySubmit = (parentId: string) => {
    const text = (replyTexts[parentId] || '').trim();
    if (!text) return;
    addComment(post.id, text, undefined, parentId);
    setReplyTexts((prev) => ({ ...prev, [parentId]: '' }));
    setReplyingToId(null);
  };

  const topLevelComments = postComments.filter((c) => !c.parentId);
  const repliesByParent = postComments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const commentTaggedUsers = friends.filter((f) => commentTaggedUserIds.includes(f.id));

  const handleCommentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);
    setCommentMentionState(detectMentionTrigger(value, e.target.selectionStart));
  };

  const commentMentionMatches = commentMentionState
    ? friends.filter((f) => f.name.toLowerCase().includes(commentMentionState.query.toLowerCase()))
    : [];

  const handleSelectCommentMention = (friend: (typeof friends)[number]) => {
    if (!commentMentionState || !commentTextareaRef.current) return;
    const cursorPos = commentTextareaRef.current.selectionStart;
    const { text, cursorPos: nextCursor } = insertMention(commentText, commentMentionState.anchorIndex, cursorPos, friend.name);
    setCommentText(text);
    setCommentMentionState(null);
    if (!commentTaggedUserIds.includes(friend.id)) setCommentTaggedUserIds((prev) => [...prev, friend.id]);
    requestAnimationFrame(() => {
      commentTextareaRef.current?.focus();
      commentTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleShareToFriend = async (friendId: string) => {
    const friend = friends.find((f) => f.id === friendId);
    if (!friend || isSharingToChat) return;
    setIsSharingToChat(true);
    try {
      const convId = await getOrCreateConversation(friend);
      await sharePostToConversation(convId, post.id);
    } finally {
      setIsSharingToChat(false);
      setShowShareToChat(false);
    }
  };

  const handleCommentFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingCommentImage(true);
    try {
      const url = await uploadImageFile(files[0]);
      setCommentImage(url);
    } catch {
      showToast('Tải ảnh lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingCommentImage(false);
      if (commentFileInputRef.current) commentFileInputRef.current.value = '';
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/#post-${post.id}`);
    showToast('Đã sao chép liên kết bài viết!', 'success');
    setShowOptions(false);
  };

  // Top reaction counts
  const reactionTypes = Array.from(new Set(post.reactions.map((r) => r.type)));

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-xs mb-5 overflow-hidden transition-all hover:border-slate-300/80">
      {/* Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/profile/${post.author.id}`} className="shrink-0 group">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-11 h-11 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-blue-400 transition-all"
            />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1 text-sm">
              <Link
                to={`/profile/${post.author.id}`}
                className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
              >
                {post.author.name}
              </Link>
              {post.wallOwnerId && post.wallOwnerName && (
                <span className="text-xs text-slate-500 font-normal flex items-center gap-1">
                  ➜ <Link to={`/profile/${post.wallOwnerId}`} className="font-bold text-blue-600 hover:underline">{post.wallOwnerName}</Link>
                </span>
              )}
              {post.taggedUsers && post.taggedUsers.length > 0 && (
                <span className="text-xs text-slate-500 font-normal">
                  cùng với{' '}
                  {post.taggedUsers.map((u, i) => (
                    <React.Fragment key={u.id}>
                      <Link to={`/profile/${u.id}`} className="font-bold text-blue-600 hover:underline">
                        {u.name}
                      </Link>
                      {i < post.taggedUsers!.length - 1 && ', '}
                    </React.Fragment>
                  ))}
                </span>
              )}
              {post.feeling && (
                <span className="text-xs text-slate-500 font-normal">
                  {formatFeelingPhrase(post.feeling)}
                </span>
              )}
              {post.groupId && post.groupName && (
                <span className="text-xs text-slate-500 font-normal flex items-center gap-1">
                  ▶ trong <Link to={`/groups/${post.groupId}`} className="font-bold text-blue-600 hover:underline">{post.groupName}</Link>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              {post.pinned && (
                <span className="flex items-center gap-1 text-blue-600 font-semibold">
                  <Pin className="w-3 h-3 fill-blue-600" /> Đã ghim
                </span>
              )}
              <span>{timeAgo(post.createdAt)}</span>
              {post.updatedAt && <span className="text-[11px] italic">(đã chỉnh sửa {timeAgo(post.updatedAt)})</span>}
              <span>·</span>
              {post.privacy === 'public' && <span title="Công khai"><Globe className="w-3.5 h-3.5" /></span>}
              {post.privacy === 'friends' && <span title="Bạn bè"><Users className="w-3.5 h-3.5" /></span>}
              {post.privacy === 'only_me' && <span title="Chỉ mình tôi"><Lock className="w-3.5 h-3.5" /></span>}
              {post.location && (
                <>
                  <span>·</span>
                  <span className="truncate">📍 {post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3-Dots Options Menu */}
        <div className="relative shrink-0" ref={optionsRef}>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showOptions && (
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs font-semibold">
              <button
                onClick={() => {
                  toggleSavePost(post.id);
                  setShowOptions(false);
                }}
                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
              >
                <Bookmark className={`w-4 h-4 ${post.isSaved ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>{post.isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
              >
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Sao chép liên kết</span>
              </button>

              {canPin && (
                <button
                  onClick={() => {
                    togglePinPost(post.id);
                    setShowOptions(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
                >
                  <Pin className={`w-4 h-4 ${post.pinned ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                  <span>{post.pinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}</span>
                </button>
              )}

              {(isOwner || isAdmin) && (
                <button
                  onClick={() => {
                    setIsEditOpen(true);
                    setShowOptions(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
                >
                  <Edit2 className="w-4 h-4 text-slate-400" />
                  <span>Chỉnh sửa bài viết</span>
                </button>
              )}

              {(isOwner || isAdmin) && (
                <button
                  onClick={async () => {
                    setShowOptions(false);
                    if (await confirm('Bạn có chắc muốn xóa bài viết này? Hành động này không thể hoàn tác.')) {
                      deletePost(post.id);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-rose-50 text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa bài viết</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsReportOpen(true);
                  setShowOptions(false);
                }}
                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-600 border-t border-slate-100"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Báo cáo bài viết</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-sm sm:text-base text-slate-800 whitespace-pre-line leading-relaxed font-normal">
          {post.content}
        </p>
      </div>

      {/* Post Video */}
      {post.video && (
        <div className="bg-black">
          <video src={post.video} controls className="w-full max-h-[32rem]" />
        </div>
      )}

      {/* Post Images Layout */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-1 bg-slate-100 ${
            post.images.length === 1
              ? 'grid-cols-1'
              : post.images.length === 2
              ? 'grid-cols-2'
              : post.images.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          {post.images.map((img, index) => (
            <div
              key={index}
              onClick={() => setSelectedPreviewImage(img)}
              className="relative aspect-video max-h-96 overflow-hidden cursor-pointer group bg-slate-200"
            >
              <img
                src={img}
                alt="Post Media"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          {post.reactions.length > 0 && (
            <div className="flex items-center -space-x-1">
              {reactionTypes.slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs shadow-xs"
                >
                  {REACTION_EMOJIS[r].emoji}
                </span>
              ))}
            </div>
          )}
          <span className="font-semibold text-slate-700">{post.reactions.length} lượt thích</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:underline hover:text-slate-700 font-medium"
          >
            {postComments.length} bình luận
          </button>
          <span>·</span>
          <span>{post.sharesCount} lượt chia sẻ</span>
        </div>
      </div>

      {/* Interactive Action Bar with Floating Reactions Menu */}
      <div className="px-2 py-1 flex items-center justify-between text-slate-600 font-semibold text-xs sm:text-sm relative">
        {/* Like / Reaction Button Container */}
        <div
          className="flex-1 relative"
          onMouseEnter={() => {
            reactionTimerRef.current = setTimeout(() => setShowReactionsMenu(true), 300);
          }}
          onMouseLeave={() => {
            if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
            setShowReactionsMenu(false);
          }}
        >
          {/* Reaction Popper Bar */}
          {showReactionsMenu && (
            <div className="absolute -top-12 left-2 bg-white rounded-full px-2.5 py-1.5 shadow-2xl border border-slate-200 flex items-center gap-2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    toggleReaction(post.id, type);
                    setShowReactionsMenu(false);
                  }}
                  className="text-xl hover:scale-135 transform transition-transform duration-150"
                  title={REACTION_EMOJIS[type].label}
                >
                  {REACTION_EMOJIS[type].emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => toggleReaction(post.id, userReaction ? userReaction.type : 'like')}
            className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors ${
              userReaction ? REACTION_EMOJIS[userReaction.type].color : 'text-slate-600'
            }`}
          >
            {userReaction ? (
              <>
                <span className="text-base">{REACTION_EMOJIS[userReaction.type].emoji}</span>
                <span>{REACTION_EMOJIS[userReaction.type].label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                <span>Thích</span>
              </>
            )}
          </button>
        </div>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Bình luận</span>
        </button>

        {/* Share Button */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="w-full py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Chia sẻ</span>
          </button>

          {showShareMenu && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20">
              <button
                onClick={() => {
                  sharePost(post.id);
                  setShowShareMenu(false);
                }}
                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Chia sẻ lên trang cá nhân</span>
              </button>
              <button
                onClick={() => {
                  setShowShareMenu(false);
                  setShowShareToChat(true);
                }}
                className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span>Gửi qua tin nhắn</span>
              </button>
            </div>
          )}
        </div>

        {/* Share to chat: friend picker */}
        {showShareToChat && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowShareToChat(false)}>
            <div
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-slate-800 text-sm mb-3">Gửi bài viết cho bạn bè</h3>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {friends.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Bạn chưa có bạn bè nào.</p>
                ) : (
                  friends.map((f) => (
                    <button
                      key={f.id}
                      disabled={isSharingToChat}
                      onClick={() => handleShareToFriend(f.id)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 text-left"
                    >
                      <img src={f.avatar} alt={f.name} className="w-9 h-9 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{f.name}</span>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowShareToChat(false)}
                className="w-full mt-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={() => toggleSavePost(post.id)}
          className={`px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors ${
            post.isSaved ? 'text-amber-500' : 'text-slate-600'
          }`}
          title={post.isSaved ? 'Đã lưu' : 'Lưu'}
        >
          <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-100 space-y-3">
          {/* Write comment input */}
          <form onSubmit={handleCommentSubmit} className="flex items-start gap-2.5">
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl border border-slate-200 p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400">
                <div className="relative">
                  <textarea
                    ref={commentTextareaRef}
                    rows={2}
                    value={commentText}
                    onChange={handleCommentTextChange}
                    placeholder="Viết bình luận của bạn... (gõ @ để gắn thẻ)"
                    className="w-full text-xs text-slate-800 placeholder-slate-400 resize-none focus:outline-none border-none p-1"
                  />

                  {commentMentionState && commentMentionMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-20">
                      {commentMentionMatches.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => handleSelectCommentMention(f)}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 cursor-pointer"
                        >
                          <img src={f.avatar} alt={f.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">{f.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">Bạn bè</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {commentImage && (
                  <div className="relative inline-block mt-2 rounded-lg overflow-hidden border border-slate-200">
                    <img src={commentImage} alt="Comment Attachment" className="h-16 object-cover" />
                    <button
                      type="button"
                      onClick={() => setCommentImage('')}
                      className="absolute top-1 right-1 p-0.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {commentTaggedUsers.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    cùng với{' '}
                    <span className="font-bold text-slate-700">
                      {commentTaggedUsers.map((u) => u.name).join(', ')}
                    </span>
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                  <div className="flex items-center gap-1">
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCommentFileSelected(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={isUploadingCommentImage}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 disabled:opacity-50"
                      title="Đính kèm ảnh"
                    >
                      {isUploadingCommentImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCommentTagPicker(!showCommentTagPicker)}
                      className={`p-1 rounded-md hover:bg-slate-100 ${
                        showCommentTagPicker || commentTaggedUserIds.length > 0 ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
                      }`}
                      title="Gắn thẻ bạn bè"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!commentText.trim() && !commentImage}
                    className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showCommentTagPicker && (
                  <div className="mt-2 max-h-32 overflow-y-auto border-t border-slate-100 pt-2 divide-y divide-slate-100">
                    {friends.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">Bạn chưa có bạn bè nào để gắn thẻ.</p>
                    ) : (
                      friends.map((f) => {
                        const isSelected = commentTaggedUserIds.includes(f.id);
                        return (
                          <div
                            key={f.id}
                            onClick={() => toggleCommentTaggedUser(f.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <img src={f.avatar} alt={f.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-[11px] font-semibold text-slate-700 flex-1 truncate">{f.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Comment List */}
          <div className="space-y-2.5 pt-2">
            {topLevelComments.map((c) => {
              const isCommentOwner = currentUser?.id === c.author.id;
              const hasLiked = c.likes.includes(currentUser?.id || '');
              const replies = repliesByParent[c.id] || [];
              return (
                <div key={c.id} className="group/comm">
                  <div className="flex items-start gap-2.5">
                    <Link to={`/profile/${c.author.id}`} className="shrink-0">
                      <img
                        src={c.author.avatar}
                        alt={c.author.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="bg-white rounded-2xl p-3 border border-slate-200 inline-block max-w-full">
                        <Link
                          to={`/profile/${c.author.id}`}
                          className="font-bold text-xs text-slate-900 hover:underline block"
                        >
                          {c.author.name}
                        </Link>
                        <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{c.content}</p>
                        {c.taggedUsers && c.taggedUsers.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            cùng với{' '}
                            {c.taggedUsers.map((u, i) => (
                              <React.Fragment key={u.id}>
                                <Link to={`/profile/${u.id}`} className="font-bold text-blue-600 hover:underline">
                                  {u.name}
                                </Link>
                                {i < c.taggedUsers!.length - 1 && ', '}
                              </React.Fragment>
                            ))}
                          </p>
                        )}
                        {c.image && (
                          <img
                            src={c.image}
                            alt="Comment Media"
                            className="mt-2 rounded-lg max-h-40 object-cover border border-slate-100"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 mt-1 pl-2">
                        <span>{timeAgo(c.createdAt)}</span>
                        <button
                          onClick={() => toggleLikeComment(post.id, c.id)}
                          className={`hover:underline ${hasLiked ? 'text-blue-600 font-bold' : ''}`}
                        >
                          Thích {c.likes.length > 0 && `(${c.likes.length})`}
                        </button>
                        <button
                          onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                          className="hover:underline"
                        >
                          Trả lời
                        </button>
                        {(isCommentOwner || isAdmin) && (
                          <button
                            onClick={async () => {
                              if (await confirm('Xóa bình luận này?')) deleteComment(post.id, c.id);
                            }}
                            className="text-rose-500 hover:underline"
                          >
                            Xóa
                          </button>
                        )}
                      </div>

                      {/* Reply input */}
                      {replyingToId === c.id && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleReplySubmit(c.id);
                          }}
                          className="flex items-center gap-2 mt-2 pl-2"
                        >
                          <img
                            src={currentUser?.avatar}
                            alt={currentUser?.name}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                          <input
                            autoFocus
                            value={replyTexts[c.id] || ''}
                            onChange={(e) => setReplyTexts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            placeholder={`Trả lời ${c.author.name}...`}
                            className="flex-1 min-w-0 text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={!(replyTexts[c.id] || '').trim()}
                            className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}

                      {/* Nested replies */}
                      {replies.length > 0 && (
                        <div className="mt-2.5 pl-2 space-y-2.5 border-l-2 border-slate-100">
                          {replies.map((r) => {
                            const isReplyOwner = currentUser?.id === r.author.id;
                            const replyHasLiked = r.likes.includes(currentUser?.id || '');
                            return (
                              <div key={r.id} className="flex items-start gap-2.5 pl-2">
                                <Link to={`/profile/${r.author.id}`} className="shrink-0">
                                  <img
                                    src={r.author.avatar}
                                    alt={r.author.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <div className="bg-white rounded-2xl p-2.5 border border-slate-200 inline-block max-w-full">
                                    <Link
                                      to={`/profile/${r.author.id}`}
                                      className="font-bold text-xs text-slate-900 hover:underline block"
                                    >
                                      {r.author.name}
                                    </Link>
                                    <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{r.content}</p>
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 mt-1 pl-2">
                                    <span>{timeAgo(r.createdAt)}</span>
                                    <button
                                      onClick={() => toggleLikeComment(post.id, r.id)}
                                      className={`hover:underline ${replyHasLiked ? 'text-blue-600 font-bold' : ''}`}
                                    >
                                      Thích {r.likes.length > 0 && `(${r.likes.length})`}
                                    </button>
                                    {(isReplyOwner || isAdmin) && (
                                      <button
                                        onClick={async () => {
                                          if (await confirm('Xóa bình luận này?')) deleteComment(post.id, r.id);
                                        }}
                                        className="text-rose-500 hover:underline"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        post={post}
      />

      {/* Report Post Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="post"
        targetId={post.id}
        targetName={`Bài viết của ${post.author.name}`}
      />

      {/* Image Fullscreen Preview */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={selectedPreviewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </article>
  );
};
