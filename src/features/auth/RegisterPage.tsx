import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Sparkles, Lock, Mail, User, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    const success = await register(name, username, email, password);
    setIsSubmitting(false);
    if (success) {
      navigate('/');
    } else {
      setError('Email hoặc tên người dùng đã tồn tại.');
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
          <p className="text-sm text-slate-500 mt-1">Tạo tài khoản mới và kết nối với bạn bè</p>
        </div>

        {/* Register Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          <h2 className="text-xl font-black text-slate-800 mb-5">Đăng ký tài khoản</h2>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Họ và tên
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Tên người dùng (@username)
              </label>
              <div className="relative">
                <span className="text-sm text-slate-400 font-semibold absolute left-3.5 top-1/2 -translate-y-1/2">
                  @
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="nguyenvana"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Email
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

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-colors"
            >
              <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-bold">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
