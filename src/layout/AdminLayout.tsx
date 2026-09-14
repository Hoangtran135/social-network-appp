import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useSocial } from '../context/SocialContext';
import { Toast } from '../common/Toast';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Users2,
  AlertTriangle,
  BellRing,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { reports } = useSocial();
  const location = useLocation();

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const adminNavItems = [
    { label: 'Tổng quan Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Quản lý người dùng', path: '/admin/users', icon: Users },
    { label: 'Quản lý bài viết', path: '/admin/posts', icon: FileText },
    { label: 'Quản lý bình luận', path: '/admin/comments', icon: MessageSquare },
    { label: 'Quản lý nhóm', path: '/admin/groups', icon: Users2 },
    { label: 'Báo cáo & Vi phạm', path: '/admin/reports', icon: AlertTriangle, badge: pendingReportsCount > 0 ? pendingReportsCount : undefined },
    { label: 'Thông báo hệ thống', path: '/admin/notifications', icon: BellRing },
  ];

  const isActive = (item: typeof adminNavItems[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 h-16 px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                SocialNet Admin Portal
              </span>
              <span className="text-[10px] block text-purple-400 font-mono">BẢNG QUẢN TRỊ HỆ THỐNG</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Mạng xã hội</span>
          </Link>

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full object-cover border border-purple-500"
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-200">{currentUser?.name}</div>
              <div className="text-[10px] text-purple-400 font-semibold">Super Admin</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 lg:px-6 py-6 gap-6">
        {/* Admin Navigation Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-3 sticky top-24 space-y-1 shadow-xl">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Menu Quản Trị
            </div>

            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Admin Content View */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <Toast />
    </div>
  );
};
