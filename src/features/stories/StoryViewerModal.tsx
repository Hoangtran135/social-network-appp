import React, { useState, useEffect } from 'react';
import { Story } from '../../types';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { X, ChevronLeft, ChevronRight, Send, Eye, Trash2 } from 'lucide-react';
import { timeAgo } from '../../utils/time';
import { useConfirm } from '../../common/ConfirmDialogProvider';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  isOpen,
  onClose,
}) => {
  const { viewStory, deleteStory, sendMessage, getOrCreateConversation, showToast } = useSocial();
  const { currentUser } = useAuth();
  const confirm = useConfirm();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex]);

  // Mark story as viewed
  useEffect(() => {
    if (isOpen && currentStory) {
      viewStory(currentStory.id);
    }
  }, [isOpen, currentIndex, currentStory, viewStory]);

  // Timer loop
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // ~5 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, currentIndex, stories.length, onClose]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  const handleSendReaction = async (emoji: string) => {
    const convId = await getOrCreateConversation(currentStory.user);
    await sendMessage(convId, `Đã phản hồi Story của bạn: ${emoji}`);
    showToast(`Đã gửi phản hồi ${emoji} tới ${currentStory.user.name}`, 'success');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const convId = await getOrCreateConversation(currentStory.user);
    await sendMessage(convId, `Trả lời Story: "${replyText.trim()}"`);
    showToast(`Đã gửi tin nhắn tới ${currentStory.user.name}`, 'success');
    setReplyText('');
  };

  const isOwner = currentUser?.id === currentStory.user.id;

  const handleDeleteStory = async () => {
    if (!(await confirm('Xóa Story này? Hành động này không thể hoàn tác.'))) return;
    await deleteStory(currentStory.id);
    if (stories.length <= 1) {
      onClose();
    } else if (currentIndex >= stories.length - 1) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Delete button (own stories only) */}
      {isOwner && (
        <button
          onClick={handleDeleteStory}
          className="absolute top-4 right-16 p-2.5 rounded-full bg-white/10 hover:bg-rose-500/80 text-white z-50 transition-colors"
          title="Xóa Story"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      {/* Prev Button */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next Button */}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Main Story Container */}
      <div
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="w-full max-w-sm h-[85vh] max-h-[750px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col justify-between"
      >
        {/* Top Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Author Header */}
        <div className="absolute top-7 inset-x-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.user.avatar}
              alt={currentStory.user.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-white"
            />
            <div>
              <h4 className="text-xs font-bold text-white drop-shadow-md">{currentStory.user.name}</h4>
              <span className="text-[10px] text-white/80 drop-shadow-md">{timeAgo(currentStory.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Story Content Canvas */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {currentStory.type === 'text' ? (
            <div
              className={`w-full h-full p-8 flex items-center justify-center text-center bg-gradient-to-br ${currentStory.backgroundGradient} text-white`}
            >
              <p className="font-extrabold text-xl sm:text-2xl leading-relaxed drop-shadow-lg">
                {currentStory.textContent}
              </p>
            </div>
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )}

          {/* Left/Right click zones for quick navigation */}
          <div
            onClick={handlePrev}
            className="absolute left-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 inset-y-0 w-2/3 z-20 cursor-pointer"
          />
        </div>

        {/* Bottom Bar: Quick Reactions or Viewers count */}
        <div className="p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30 space-y-3">
          {isOwner ? (
            <div className="flex items-center justify-between text-white text-xs">
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full font-bold transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>{currentStory.viewers.length} người đã xem</span>
              </button>
            </div>
          ) : (
            <>
              {/* Quick Reactions */}
              <div className="flex items-center justify-around">
                {['❤️', '🔥', '👏', '😮', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-2xl hover:scale-130 transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply message form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Gửi tin nhắn cho ${currentStory.user.name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2 bg-white/20 border border-white/30 rounded-full text-white placeholder-white/60 focus:outline-none focus:bg-white/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}

          {/* Viewers modal popup */}
          {showViewers && (
            <div className="p-3 bg-slate-900/95 rounded-2xl border border-white/20 max-h-48 overflow-y-auto space-y-2">
              <h5 className="text-[11px] font-bold text-slate-300 uppercase">Danh sách người xem</h5>
              {currentStory.viewers.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-3 text-slate-400">
                  <Eye className="w-5 h-5 opacity-50" />
                  <span className="text-xs">Chưa có người xem nào</span>
                </div>
              ) : (
                currentStory.viewers.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg p-1 -mx-1 transition-colors">
                    <img src={v.avatar} alt={v.userName} className="w-6 h-6 rounded-full object-cover" />
                    <span>{v.userName}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(v.viewedAt)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
