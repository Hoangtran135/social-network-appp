import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../../utils/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
    } catch {
      // Intentionally ignored — the endpoint always responds ok to avoid leaking which emails exist.
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/20 mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SocialNet
          </h1>
          <p className="text-sm text-slate-500 mt-1">Khôi phục quyền truy cập tài khoản</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          {!isSubmitted ? (
            <>
              <h2 className="text-xl font-black text-slate-800 mb-2">Quên mật khẩu?</h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Nhập địa chỉ email đăng ký của bạn. Chúng tôi sẽ gửi liên kết để đặt lại mật khẩu mới.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Email tài khoản
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-colors"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu khôi phục'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Đã gửi hướng dẫn!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vui lòng kiểm tra hòm thư <span className="font-bold text-slate-800">{email}</span> để làm theo các bước đặt lại mật khẩu.
              </p>
            </div>
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
