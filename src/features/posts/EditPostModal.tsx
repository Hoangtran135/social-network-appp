import React, { useState, useRef } from 'react';
import { Post } from '../../types';
import { useSocial } from '../../context/SocialContext';
import { X, Smile, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { uploadImageFile } from '../../utils/upload';
import { formatFeelingPhrase } from '../../utils/feeling';

interface EditPostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

const FEELINGS = [
  'hạnh phúc 😊',
  'hào hứng 🌟',
  'thư giãn ☕',
  'tuyệt vời 🌄',
  'đang ăn 🍕',
  'đang du lịch ✈️',
  'đang code 💻',
];

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, isOpen, onClose }) => {
  const { updatePost, showToast } = useSocial();
  const [content, setContent] = useState(post?.content || '');
  const [privacy, setPrivacy] = useState<Post['privacy']>(post?.privacy || 'public');
  const [feeling, setFeeling] = useState<string | undefined>(post?.feeling);
  const [images, setImages] = useState<string[]>(post?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [showFeelings, setShowFeelings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    updatePost(post.id, content, privacy, feeling, images);
    onClose();
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">Chỉnh sửa bài viết</h3>
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
              src={post.author.avatar}
              alt={post.author.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <div>
              <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <span>{post.author.name}</span>
                {feeling && <span className="font-normal text-slate-500">{formatFeelingPhrase(feeling)}</span>}
              </div>
              
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as Post['privacy'])}
                className="mt-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border-none rounded-lg px-2 py-0.5 cursor-pointer focus:outline-none"
              >
                <option value="public">🌐 Công khai</option>
                <option value="friends">👥 Bạn bè</option>
                <option value="only_me">🔒 Chỉ mình tôi</option>
              </select>
            </div>
          </div>

          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none border-none p-0"
          />

          {/* Current Images Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
              {images.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-slate-200">
                  <img src={img} alt="Post media" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Image from device */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Đang tải ảnh lên...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Thêm ảnh từ thiết bị</span>
              </>
            )}
          </button>

          {/* Feeling toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFeelings(!showFeelings)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-amber-600 font-semibold"
            >
              <Smile className="w-4 h-4 text-amber-500" />
              <span>{feeling ? `Cảm xúc: ${feeling}` : 'Thêm cảm xúc'}</span>
            </button>
            {feeling && (
              <button
                type="button"
                onClick={() => setFeeling(undefined)}
                className="text-[11px] text-rose-500 hover:underline"
              >
                Xóa cảm xúc
              </button>
            )}
          </div>

          {showFeelings && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFeeling(f);
                    setShowFeelings(false);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    feeling === f ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!content.trim() && images.length === 0}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
