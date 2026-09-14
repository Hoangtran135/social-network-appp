import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useSocial } from '../context/SocialContext';
import {
  Home,
  Users,
  Users2,
  MessageCircle,
  Bookmark,
  Settings,
  ShieldCheck,
  Compass,
  Bell,
} from 'lucide-react';

export const SidebarLeft: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { groups, notifications } = useSocial();
  const location = useLocation();

  const myGroups = groups.filter((g) => g.isMember);
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { label: 'Bảng tin', path: '/', icon: Home },
    { label: 'Bạn bè & Lời mời', path: '/friends', icon: Users },
    { label: 'Nhóm cộng đồng', path: '/groups', icon: Users2 },
    { label: 'Hộp thư tin nhắn', path: '/messages', icon: MessageCircle },
    { label: 'Thông báo', path: '/notifications', icon: Bell, badge: unreadNotifs > 0 ? unreadNotifs : undefined },
    { label: 'Bài viết đã lưu', path: '/saved', icon: Bookmark },
    { label: 'Khám phá / Tìm kiếm', path: '/search', icon: Compass },
    { label: 'Cài đặt tài khoản', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:block sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pr-2 pb-8">
      {/* Current User Card */}
      <Link
        to={`/profile/${currentUser?.id}`}
        className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-sm transition-all mb-4 group"
      >
        <img
          src={currentUser?.avatar}
          alt={currentUser?.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
        />
        <div className="min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
            {currentUser?.name}
          </h4>
          <p className="text-xs text-slate-400 truncate">@{currentUser?.username}</p>
        </div>
      </Link>

      {/* Main Navigation List */}
      <div className="space-y-1 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isActive('/admin')
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-purple-700 hover:bg-purple-100/70'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <span>Quản trị viên (Admin)</span>
          </Link>
        )}
      </div>

      {/* Shortcuts: My Groups */}
      {myGroups.length > 0 && (
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhóm của bạn</span>
            <Link to="/groups" className="text-xs text-blue-600 hover:underline font-semibold">
              Tất cả
            </Link>
          </div>
          <div className="space-y-1">
            {myGroups.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <img src={g.avatar} alt={g.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                <span className="truncate">{g.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 px-3 text-[11px] text-slate-400 space-y-1 leading-relaxed">
        <p>Quyền riêng tư · Điều khoản · Quảng cáo · Cookies</p>
        <p>© 2026 SocialNet Vietnam Inc.</p>
      </div>
    </aside>
  );
};
