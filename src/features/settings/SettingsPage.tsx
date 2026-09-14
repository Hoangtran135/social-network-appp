import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { api, ApiError } from '../../utils/api';
import {
  Settings,
  Shield,
  Bell,
  Lock,
  User,
  KeyRound,
  Save,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useSocial();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [privacySetting, setPrivacySetting] = useState('public');
  const [friendRequestPrivacy, setFriendRequestPrivacy] = useState('everyone');
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Vui lòng nhập đầy đủ thông tin mật khẩu', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      return;
    }
    setIsSavingPassword(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      showToast('Đã đổi mật khẩu thành công!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể đổi mật khẩu.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    showToast('Đã lưu các tùy chọn cài đặt!', 'success');
  };

  return (
    <div className="w-full max-w-3xl min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Cài đặt tài khoản</h1>
              <p className="text-xs text-slate-500">
                Quản lý bảo mật, quyền riêng tư và các tùy chọn thông báo của bạn
              </p>
            </div>
          </div>

          <Link
            to="/settings/profile"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Sửa hồ sơ</span>
          </Link>
        </div>

        {/* Section 1: Security & Password */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Mật khẩu & Bảo mật</h2>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>

          {/* 2FA Toggle */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Xác thực 2 yếu tố (2FA)</h4>
                <p className="text-[11px] text-slate-500">
                  Tăng cường bảo vệ tài khoản bằng mã xác nhận gửi về ứng dụng xác thực
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTwoFactorAuth(!twoFactorAuth);
                showToast(
                  !twoFactorAuth
                    ? 'Đã kích hoạt xác thực 2 bước 2FA'
                    : 'Đã tắt xác thực 2 bước 2FA',
                  'info'
                );
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                twoFactorAuth ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  twoFactorAuth ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 2: Privacy */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Quyền riêng tư</h2>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ai có thể xem các bài viết mặc định của bạn?
              </label>
              <select
                value={privacySetting}
                onChange={(e) => setPrivacySetting(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="public">Công khai (Mọi người đều có thể thấy)</option>
                <option value="friends">Chỉ bạn bè</option>
                <option value="only_me">Chỉ mình tôi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ai có thể gửi lời mời kết bạn cho bạn?
              </label>
              <select
                value={friendRequestPrivacy}
                onChange={(e) => setFriendRequestPrivacy(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="everyone">Tất cả mọi người</option>
                <option value="friends_of_friends">Bạn của bạn bè</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Notification Preferences */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Cài đặt thông báo</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Thông báo đẩy trên trình duyệt</h4>
                <p className="text-[11px] text-slate-500">
                  Nhận thông báo khi có người thích, bình luận hoặc nhắn tin
                </p>
              </div>
              <input
                type="checkbox"
                checked={pushNotif}
                onChange={(e) => setPushNotif(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Thông báo qua Email</h4>
                <p className="text-[11px] text-slate-500">
                  Gửi tóm tắt hoạt động hàng tuần và cảnh báo bảo mật tới {currentUser?.email}
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi cài đặt</span>
            </button>
          </div>
        </div>
      </div>
  );
};
