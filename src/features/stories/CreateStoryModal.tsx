import React, { useState, useRef } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { X, Image as ImageIcon, Type, Sparkles, Loader2 } from 'lucide-react';
import { uploadImageFile } from '../../utils/upload';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GRADIENTS = [
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-amber-500 via-rose-500 to-purple-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-blue-600 via-indigo-600 to-violet-800',
  'from-rose-500 via-red-500 to-orange-500',
  'from-slate-900 via-purple-900 to-slate-900',
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose }) => {
  const { createStory, showToast } = useSocial();
  const { currentUser } = useAuth();

  const [storyType, setStoryType] = useState<'image' | 'text'>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const handleFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      setMediaUrl(await uploadImageFile(files[0]));
    } catch {
      showToast('Tải ảnh lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storyType === 'text' && !textContent.trim()) return;
    if (storyType === 'image' && !mediaUrl.trim()) return;

    createStory(
      storyType,
      storyType === 'image' ? mediaUrl.trim() : undefined,
      storyType === 'text' ? textContent.trim() : undefined,
      selectedGradient
    );

    // Reset
    setTextContent('');
    setMediaUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">Tạo tin / Story mới</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setStoryType('text')}
            className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              storyType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Tin dạng chữ</span>
          </button>

          <button
            type="button"
            onClick={() => setStoryType('image')}
            className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              storyType === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Tin dạng ảnh</span>
          </button>
        </div>

        {/* Preview Frame */}
        <div className="mt-4 flex justify-center">
          <div
            className={`w-64 h-80 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-lg transition-all relative overflow-hidden ${
              storyType === 'text'
                ? `bg-gradient-to-br ${selectedGradient} text-white`
                : 'bg-slate-900 text-white'
            }`}
          >
            {storyType === 'text' ? (
              <p className="font-bold text-base sm:text-lg leading-relaxed break-words">
                {textContent || 'Nội dung tin của bạn sẽ hiển thị tại đây...'}
              </p>
            ) : mediaUrl ? (
              <img src={mediaUrl} alt="Story Preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-2 text-xs">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span>Chưa chọn hình ảnh</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {storyType === 'text' ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Nội dung văn bản
                </label>
                <textarea
                  rows={3}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Gõ suy nghĩ, câu nói hoặc cảm xúc của bạn..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Chọn màu nền
                </label>
                <div className="flex gap-2 justify-center">
                  {GRADIENTS.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedGradient(grad)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} transition-transform ${
                        selectedGradient === grad ? 'scale-125 ring-2 ring-indigo-600 ring-offset-2' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Hình ảnh
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải ảnh lên...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Chọn ảnh từ thiết bị</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={storyType === 'text' ? !textContent.trim() : !mediaUrl.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors"
            >
              Chia sẻ lên Tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
