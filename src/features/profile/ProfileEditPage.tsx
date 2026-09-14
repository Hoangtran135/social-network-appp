import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { uploadImageFile } from '../../utils/upload';
import {
  Camera,
  Save,
  ArrowLeft,
  User,
  Briefcase,
  Loader2,
} from 'lucide-react';

export const ProfileEditPage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useSocial();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name || '');
  const [username] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [workplace, setWorkplace] = useState(currentUser?.workplace || '');
  const [education, setEducation] = useState(currentUser?.education || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [coverImage, setCoverImage] = useState(currentUser?.coverImage || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

    await updateProfile({
      name: name.trim(),
      bio: bio.trim(),
      workplace: workplace.trim(),
      education: education.trim(),
      location: location.trim(),
      website: website.trim(),
      avatar: avatar.trim(),
      coverImage: coverImage.trim(),
    });

    showToast('Đã lưu thông tin trang cá nhân thành công!', 'success');
    navigate(`/profile/${currentUser?.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <Link
          to={`/profile/${currentUser?.id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang cá nhân</span>
        </Link>
        <h1 className="text-xl font-black text-slate-800">Chỉnh sửa hồ sơ</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visual Images Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Hình ảnh đại diện & Ảnh bìa</span>
          </h3>

          {/* Cover Preview & Upload */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Ảnh bìa (Cover Image)
            </label>
            {coverImage && (
              <div className="h-32 rounded-xl overflow-hidden border border-slate-200 mb-2">
                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              </div>
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
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
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

          {/* Avatar Preview & Upload */}
          <div className="pt-3 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Ảnh đại diện (Avatar)
            </label>
            <div className="flex items-center gap-4">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shrink-0"
              />
              <div className="flex-1">
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
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải ảnh lên...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chọn ảnh đại diện từ thiết bị</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Thông tin cá nhân</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Tên người dùng (@username)
              </label>
              <input
                type="text"
                required
                disabled
                value={username}
                title="Không thể thay đổi tên người dùng"
                className="w-full text-xs p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Tiểu sử (Bio)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Giới thiệu đôi nét về bản thân, sở thích..."
              className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Work & Details Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>Công việc & Học vấn & Nơi ở</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Nơi làm việc
              </label>
              <input
                type="text"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                placeholder="VD: Senior Frontend tại TechVN"
                className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Trường học / Học vấn
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="VD: Đại học Bách Khoa TP.HCM"
                className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Tỉnh / Thành phố sinh sống
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="VD: Thành phố Hồ Chí Minh, Việt Nam"
                className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Website cá nhân / Portfolio
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://mywebsite.com"
                className="w-full text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <Link
            to={`/profile/${currentUser?.id}`}
            className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>
    </div>
  );
};
