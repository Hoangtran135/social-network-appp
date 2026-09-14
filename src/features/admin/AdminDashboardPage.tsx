import React, { useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import {
  Users,
  FileText,
  MessageSquare,
  Users2,
  AlertTriangle,
  ShieldCheck,
  BellRing,
  CheckCircle,
  Send,
  Radio,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/time';

export const AdminDashboardPage: React.FC = () => {
  const { allUsers } = useAuth();
  const { posts, comments, groups, reports, systemAnnouncements, createAnnouncement } = useSocial();

  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'alert'>('info');

  const totalComments = Object.values(comments).reduce((acc, cList) => acc + cList.length, 0);
  const pendingReports = reports.filter((r) => r.status === 'pending');
  const onlineUsers = allUsers.filter((u) => u.isOnline);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annMessage) return;
    createAnnouncement(annTitle, annMessage, annType);
    setAnnTitle('');
    setAnnMessage('');
  };

  const statCards = [
    {
      label: 'Tổng người dùng',
      value: allUsers.length,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      link: '/admin/users',
    },
    {
      label: 'Tổng bài viết',
      value: posts.length,
      icon: FileText,
      color: 'from-emerald-600 to-teal-600',
      link: '/admin/posts',
    },
    {
      label: 'Bình luận & Thảo luận',
      value: totalComments,
      icon: MessageSquare,
      color: 'from-violet-600 to-purple-600',
      link: '/admin/comments',
    },
    {
      label: 'Nhóm cộng đồng',
      value: groups.length,
      icon: Users2,
      color: 'from-amber-600 to-orange-600',
      link: '/admin/groups',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-800/40 rounded-3xl p-6 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black tracking-tight">Hệ Thống Quản Trị SocialNet</h1>
            </div>
            <p className="text-slate-300 text-xs">
              Theo dõi tình trạng hoạt động, kiểm duyệt bài viết, giải quyết báo cáo và phát sóng thông báo toàn hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold">Hệ thống: Bình thường</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link
              key={idx}
              to={stat.link}
              className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 hover:border-purple-500/50 transition-all group block shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
            </Link>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Reports & System Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Reports Widget */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-slate-200 text-sm">
                  Báo cáo vi phạm đang chờ xử lý ({pendingReports.length})
                </h3>
              </div>
              <Link
                to="/admin/reports"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold hover:underline"
              >
                Xem tất cả báo cáo →
              </Link>
            </div>

            {pendingReports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                Hiện không có báo cáo vi phạm nào đang chờ xử lý.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReports.slice(0, 3).map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          {rep.targetType.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-300 truncate">
                          {rep.targetName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        <span className="text-rose-400 font-semibold">Lý do:</span> {rep.reason}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Bởi {rep.reporter.name} • {timeAgo(rep.createdAt)}
                      </span>
                    </div>

                    <Link
                      to="/admin/reports"
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 transition-colors"
                    >
                      Xử lý
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Online Users Widget */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-200 text-sm">
                  Đang trực tuyến ({onlineUsers.length}/{allUsers.length})
                </h3>
              </div>
              <Link
                to="/admin/users"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold hover:underline"
              >
                Xem tất cả người dùng →
              </Link>
            </div>

            {onlineUsers.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">Hiện không có ai đang online.</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {onlineUsers.map((u) => (
                  <Link
                    key={u.id}
                    to={`/profile/${u.id}`}
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-emerald-700 transition-colors"
                  >
                    <span className="relative shrink-0">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{u.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick System Announcements Log */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-200 text-sm">Thông báo hệ thống đã phát</h3>
              </div>
              <Link
                to="/admin/notifications"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold hover:underline"
              >
                Quản lý thông báo →
              </Link>
            </div>

            <div className="space-y-3">
              {systemAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ann.type === 'alert'
                            ? 'bg-rose-500'
                            : ann.type === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <h4 className="font-bold text-xs text-slate-200">{ann.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{ann.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {timeAgo(ann.createdAt)} • {ann.createdBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Broadcast Tool */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Send className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-slate-200 text-sm">Phát thông báo tức thì</h3>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tiêu đề thông báo
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bảo trì hệ thống định kỳ..."
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mức độ thông báo
                </label>
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as 'info' | 'warning' | 'alert')}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                >
                  <option value="info">Thông tin (Info - Xanh dương)</option>
                  <option value="warning">Cảnh báo (Warning - Vàng cam)</option>
                  <option value="alert">Khẩn cấp (Alert - Đỏ)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nội dung chi tiết
                </label>
                <textarea
                  rows={4}
                  placeholder="Nội dung sẽ hiển thị cho toàn thể người dùng..."
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Phát sóng ngay</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
            💡 Lưu ý: Thông báo phát sóng sẽ xuất hiện ngay lập tức trong bảng tin và mục thông báo của mọi người dùng.
          </div>
        </div>
      </div>
    </div>
  );
};
