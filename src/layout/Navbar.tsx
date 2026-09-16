import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useSocial } from '../context/SocialContext';
import {
  Search,
  Home,
  Users,
  Users2,
  MessageCircle,
  Bell,
  Plus,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Settings,
  Bookmark,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { timeAgo } from '../utils/time';

interface NavbarProps {
  onOpenCreatePost?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreatePost }) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const { notifications, conversations, posts, markNotificationAsRead } = useSocial();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Retries a few times since the target post's page may still be rendering right after navigation.
  const scrollToPost = (postId: string, attempt = 0) => {
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 2000);
    } else if (attempt < 20) {
      setTimeout(() => scrollToPost(postId, attempt + 1), 100);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Search */}
        <div className="flex items-center gap-3 lg:gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                SocialNet
              </span>
            </div>
          </Link>

          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-48 lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm trên SocialNet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-full focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </form>
        </div>

        {/* Center: Main Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            title="Trang chủ"
            className={`p-2.5 sm:px-5 sm:py-2.5 rounded-xl flex items-center justify-center transition-all ${
              isActive('/')
                ? 'text-blue-600 bg-blue-50/80 font-bold border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-5 h-5" />
          </Link>

          <Link
            to="/friends"
            title="Bạn bè"
            className={`p-2.5 sm:px-5 sm:py-2.5 rounded-xl flex items-center justify-center transition-all ${
              isActive('/friends')
                ? 'text-blue-600 bg-blue-50/80 font-bold border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-5 h-5" />
          </Link>

          <Link
            to="/groups"
            title="Nhóm"
            className={`p-2.5 sm:px-5 sm:py-2.5 rounded-xl flex items-center justify-center transition-all ${
              isActive('/groups')
                ? 'text-blue-600 bg-blue-50/80 font-bold border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users2 className="w-5 h-5" />
          </Link>

          <Link
            to="/messages"
            title="Tin nhắn"
            className={`relative p-2.5 sm:px-5 sm:py-2.5 rounded-xl flex items-center justify-center transition-all ${
              isActive('/messages')
                ? 'text-blue-600 bg-blue-50/80 font-bold border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-1.5 right-1.5 sm:right-3.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadMessages}
              </span>
            )}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Create Post button */}
          {onOpenCreatePost && (
            <button
              onClick={onOpenCreatePost}
              className="hidden lg:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-full text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng bài</span>
            </button>
          )}

          {/* Admin link */}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-xs"
              title="Trang quản trị Admin"
            >
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-full text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Thông báo"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-base">Thông báo</h3>
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Xem tất cả
                  </Link>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Không có thông báo mới</div>
                  ) : (
                    notifications.slice(0, 5).map((n) => {
                      const isSystemActor = n.type === 'moderation';
                      const displayName = isSystemActor ? 'Quản trị viên' : n.actor.name;
                      return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          setShowNotifMenu(false);
                          if (n.targetType === 'post' && n.targetId) {
                            const targetPost = posts.find((p) => p.id === n.targetId);
                            const path = targetPost?.wallOwnerId ? `/profile/${targetPost.wallOwnerId}` : '/';
                            if (window.location.pathname === path) {
                              scrollToPost(n.targetId);
                            } else {
                              navigate(path);
                              setTimeout(() => scrollToPost(n.targetId!), 150);
                            }
                          } else if (n.targetType === 'profile') {
                            navigate(`/profile/${n.actor.id}`);
                          } else if (n.targetType === 'group' && n.targetId) {
                            navigate(`/groups/${n.targetId}`);
                          }
                        }}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.isRead ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {isSystemActor ? (
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                        ) : (
                          <img
                            src={n.actor.avatar}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="text-slate-800 leading-snug">
                            <span className="font-bold">{displayName}</span> {n.content}
                          </p>
                          <span className="text-[11px] text-slate-400 mt-1 block">{timeAgo(n.createdAt)}</span>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>


          {/* Current User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-blue-400 transition-all"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <Link
                  to={`/profile/${currentUser?.id}`}
                  onClick={() => setShowUserMenu(false)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100"
                >
                  <img
                    src={currentUser?.avatar}
                    alt={currentUser?.name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{currentUser?.name}</div>
                    <div className="text-xs text-slate-400 truncate">@{currentUser?.username}</div>
                  </div>
                </Link>

                <div className="py-1">
                  <Link
                    to={`/profile/${currentUser?.id}`}
                    onClick={() => setShowUserMenu(false)}
                    className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Trang cá nhân</span>
                  </Link>

                  <Link
                    to="/saved"
                    onClick={() => setShowUserMenu(false)}
                    className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                  >
                    <Bookmark className="w-4 h-4 text-slate-400" />
                    <span>Đã lưu</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Cài đặt tài khoản</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setShowUserMenu(false)}
                      className="px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 font-bold"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Trang quản trị (Admin)</span>
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      navigate('/login');
                    }}
                    className="w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
