import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../../utils/api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const invalidLink = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { email, token, password });
      setIsDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/20 mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SocialNet
          </h1>
          <p className="text-sm text-slate-500 mt-1">Đặt lại mật khẩu</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          {invalidLink ? (
            <div className="text-center py-4 space-y-3">
              <h3 className="text-lg font-bold text-slate-800">Liên kết không hợp lệ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Liên kết đặt lại mật khẩu bị thiếu thông tin. Vui lòng yêu cầu lại.
              </p>
              <Link to="/forgot-password" className="inline-block text-xs font-bold text-blue-600">
                Yêu cầu liên kết mới
              </Link>
            </div>
          ) : isDone ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Đã đặt lại mật khẩu!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-colors"
              >
                Đến trang đăng nhập
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black text-slate-800 mb-2">Mật khẩu mới</h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Đặt mật khẩu mới cho tài khoản <span className="font-bold text-slate-700">{email}</span>.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-colors"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
