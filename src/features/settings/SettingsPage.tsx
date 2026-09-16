import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { api, ApiError } from '../../utils/api';
import {
  Settings,
  User,
  KeyRound,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useSocial();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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
                Quản lý mật khẩu và bảo mật tài khoản của bạn
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
        </div>
      </div>
  );
};
