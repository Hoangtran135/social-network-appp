import React, { useState, useRef } from 'react';
import { useSocial } from '../../context/SocialContext';
import { X, Users2, Globe, Lock, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadImageFile } from '../../utils/upload';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { createGroup, showToast } = useSocial();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [avatar, setAvatar] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingAvatar(true);
    try {
      setAvatar(await uploadImageFile(files[0]));
    } catch {
      showToast('Tải ảnh lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingCover(true);
    try {
      setCoverImage(await uploadImageFile(files[0]));
    } catch {
      showToast('Tải ảnh lên thất bại, vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup = await createGroup(
      name.trim(),
      description.trim(),
      privacy,
      avatar.trim() || undefined,
      coverImage.trim() || undefined
    );

    setName('');
    setDescription('');
    setCoverImage('');
    onClose();
    navigate(`/groups/${newGroup.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Users2 className="w-5 h-5" />
            <h3 className="font-bold text-slate-800 text-base">Tạo nhóm mới</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Tên nhóm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Hội Lập Trình Viên ReactJS, Yêu Thích Du Lịch..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Quyền riêng tư
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  privacy === 'public'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>Công khai</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Bất kỳ ai cũng có thể xem thành viên và bài viết.</p>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  privacy === 'private'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <span>Riêng tư</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Chỉ thành viên mới xem được bài viết trong nhóm.</p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Mô tả nhóm
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu mục tiêu và quy định của nhóm..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Ảnh đại diện nhóm
            </label>
            <div className="flex items-center gap-3">
              {avatar && (
                <img src={avatar} alt="Group avatar" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarSelected(e.target.files)}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải ảnh lên...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Chọn ảnh từ thiết bị</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Ảnh bìa nhóm
            </label>
            {coverImage && (
              <img src={coverImage} alt="Group cover" className="h-20 w-full rounded-xl object-cover border border-slate-200 mb-1.5" />
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleCoverSelected(e.target.files)}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isUploadingCover ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải ảnh lên...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Chọn ảnh bìa từ thiết bị</span>
                </>
              )}
            </button>
          </div>

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
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors"
            >
              Tạo nhóm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
