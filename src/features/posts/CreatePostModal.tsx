import React, { useState, useRef } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import {
  X,
  Image as ImageIcon,
  Smile,
  Trash2,
  Sparkles,
  Loader2,
  UserPlus,
  Video as VideoIcon,
} from 'lucide-react';
import { Post, User } from '../../types';
import { uploadImageFile, uploadVideoFile } from '../../utils/upload';
import { formatFeelingPhrase } from '../../utils/feeling';
import { detectMentionTrigger, insertMention } from '../../utils/mention';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string;
  defaultGroupName?: string;
  wallOwner?: User;
}

const FEELINGS = [
  'hạnh phúc 😊',
  'hào hứng 🌟',
  'thư giãn ☕',
  'tuyệt vời 🌄',
  'đang ăn 🍕',
  'đang du lịch ✈️',
  'đang code 💻',
  'yêu đời ❤️',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  defaultGroupId,
  defaultGroupName,
  wallOwner,
}) => {
  const { createPost, showToast, friends } = useSocial();
  const { currentUser } = useAuth();

  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<Post['privacy']>('public');
  const [feeling, setFeeling] = useState<string | undefined>(undefined);
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [showFeelings, setShowFeelings] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [mentionState, setMentionState] = useState<{ anchorIndex: number; query: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen || !currentUser) return null;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadImageFile(file)));
      setImages((prev) => [...prev, ...uploaded]);
    } catch {
      showToast('Tải ảnh lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleVideoSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingVideo(true);
    try {
      const uploaded = await uploadVideoFile(files[0]);
      setVideo(uploaded);
    } catch {
      showToast('Tải video lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const toggleTaggedUser = (userId: string) => {
    setTaggedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const taggedUsers = friends.filter((f) => taggedUserIds.includes(f.id));

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    setMentionState(detectMentionTrigger(value, e.target.selectionStart));
  };

  const mentionMatches = mentionState
    ? friends.filter((f) => f.name.toLowerCase().includes(mentionState.query.toLowerCase()))
    : [];

  const handleSelectMention = (friend: User) => {
    if (!mentionState || !contentTextareaRef.current) return;
    const cursorPos = contentTextareaRef.current.selectionStart;
    const { text, cursorPos: nextCursor } = insertMention(content, mentionState.anchorIndex, cursorPos, friend.name);
    setContent(text);
    setMentionState(null);
    if (!taggedUserIds.includes(friend.id)) setTaggedUserIds((prev) => [...prev, friend.id]);
    requestAnimationFrame(() => {
      contentTextareaRef.current?.focus();
      contentTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && !video) return;

    createPost(
      content,
      images,
      privacy,
      feeling,
      wallOwner ? undefined : defaultGroupId,
      wallOwner ? undefined : defaultGroupName,
      wallOwner,
      taggedUserIds,
      video
    );

    // Reset and close
    setContent('');
    setImages([]);
    setVideo(undefined);
    setFeeling(undefined);
    setTaggedUserIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">
              {wallOwner ? `Đăng lên tường của ${wallOwner.name}` : 'Tạo bài viết mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <div>
              <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5 flex-wrap">
                <span>{currentUser.name}</span>
                {feeling && <span className="font-normal text-slate-500 text-xs">{formatFeelingPhrase(feeling)}</span>}
                {taggedUsers.length > 0 && (
                  <span className="font-normal text-slate-500 text-xs">
                    cùng với{' '}
                    <span className="font-bold text-slate-700">
                      {taggedUsers.map((u) => u.name).join(', ')}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                {/* Privacy */}
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as Post['privacy'])}
                  className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border-none rounded-lg px-2 py-0.5 cursor-pointer focus:outline-none"
                >
                  <option value="public">🌐 Công khai</option>
                  <option value="friends">👥 Bạn bè</option>
                  <option value="only_me">🔒 Chỉ mình tôi</option>
                </select>

                {/* Post destination: only shown/switchable when opened from inside a group.
                    Outside a group, posts always go to the personal wall automatically. */}
                {defaultGroupId ? (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5">
                    👥 {defaultGroupName}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">
                    👤 Trang cá nhân
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={contentTextareaRef}
              rows={4}
              value={content}
              onChange={handleContentChange}
              placeholder={
                wallOwner
                  ? `Viết gì đó cho ${wallOwner.name}...`
                  : `${currentUser.name} ơi, bạn đang nghĩ gì thế? (gõ @ để gắn thẻ bạn bè)`
              }
              className="w-full text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none border-none p-0"
              autoFocus
            />

            {mentionState && mentionMatches.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20">
                {mentionMatches.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectMention(f)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 cursor-pointer"
                  >
                    <img src={f.avatar} alt={f.name} className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attached Images */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
              {images.map((img, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden aspect-square group bg-slate-200">
                  <img src={img} alt="Uploaded" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Attached Video */}
          {video && (
            <div className="relative rounded-xl overflow-hidden bg-slate-900">
              <video src={video} controls className="w-full max-h-64" />
              <button
                type="button"
                onClick={() => setVideo(undefined)}
                className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Hidden file inputs, triggered by the buttons below */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleVideoSelected(e.target.files)}
          />

          {isUploading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải ảnh lên...</span>
            </div>
          )}
          {isUploadingVideo && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải video lên...</span>
            </div>
          )}

          {/* Feelings List */}
          {showFeelings && (
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFeeling(f);
                    setShowFeelings(false);
                  }}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    feeling === f ? 'bg-amber-500 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Add-ons bar */}
          <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Thêm vào bài viết</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !!video}
                className="p-2 rounded-lg hover:bg-slate-100 text-emerald-600 transition-colors disabled:opacity-50"
                title={video ? 'Không thể thêm ảnh khi đã có video' : 'Ảnh'}
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingVideo || images.length > 0 || !!video}
                className="p-2 rounded-lg hover:bg-slate-100 text-rose-500 transition-colors disabled:opacity-50"
                title={images.length > 0 ? 'Không thể thêm video khi đã có ảnh' : 'Video'}
              >
                <VideoIcon className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowFeelings(!showFeelings)}
                className={`p-2 rounded-lg transition-colors ${
                  showFeelings ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-100 text-amber-500'
                }`}
                title="Cảm xúc / Hoạt động"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className={`p-2 rounded-lg transition-colors ${
                  showTagPicker ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-blue-600'
                }`}
                title="Gắn thẻ bạn bè"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tag Friends Picker */}
          {showTagPicker && (
            <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
              {friends.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Bạn chưa có bạn bè nào để gắn thẻ.</p>
              ) : (
                friends.map((f) => {
                  const isSelected = taggedUserIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleTaggedUser(f.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-white'
                      }`}
                    >
                      <img src={f.avatar} alt={f.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{f.name}</span>
                      <div
                        className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <span className="text-white text-[10px]">✓</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!content.trim() && images.length === 0 && !video}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-colors"
          >
            {wallOwner ? 'Đăng lên tường' : 'Đăng bài viết'}
          </button>
        </form>
      </div>
    </div>
  );
};
