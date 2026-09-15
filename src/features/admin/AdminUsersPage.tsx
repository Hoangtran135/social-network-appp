import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { timeAgo } from '../../utils/time';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  Lock,
  Unlock,
  ExternalLink,
  Radio,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { allUsers, currentUser, toggleBanUser, toggleUserRole } = useAuth();
  const { showToast } = useSocial();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'online'>('all');

  const onlineCount = allUsers.filter((u) => u.isOnline).length;

  const filteredUsers = allUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'online' ? !!u.isOnline : u.role === roleFilter);
    return matchSearch && matchRole;
  });

  const handleToggleBan = (userId: string, userName: string, isBanned?: boolean) => {
    if (!isBanned && !window.confirm(`Khóa tài khoản của ${userName}? Người dùng này sẽ không thể đăng nhập.`)) {
      return;
    }
    toggleBanUser(userId);
    showToast(
      isBanned ? `Đã mở khóa tài khoản của ${userName}` : `Đã khóa tài khoản của ${userName}`,
      isBanned ? 'success' : 'info'
    );
  };

  const handleToggleRole = (userId: string, userName: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'Thành viên' : 'Quản trị viên';
    if (currentRole !== 'admin' && !window.confirm(`Cấp quyền Quản trị viên cho ${userName}? Họ sẽ có toàn quyền quản lý hệ thống.`)) {
      return;
    }
    toggleUserRole(userId);
    showToast(`Đã chuyển quyền của ${userName} thành ${nextRole}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Quản lý Người Dùng</h1>
          </div>
          <p className="text-xs text-slate-400">
            Xem danh sách tất cả thành viên, kiểm tra vai trò và quản lý quyền truy cập.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold font-mono">
            Tổng: {allUsers.length} tài khoản
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {onlineCount} đang online
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({allUsers.length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'admin'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Quản trị viên ({allUsers.filter((u) => u.role === 'admin').length})
          </button>
          <button
            onClick={() => setRoleFilter('user')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Người dùng ({allUsers.filter((u) => u.role === 'user').length})
          </button>
          <button
            onClick={() => setRoleFilter('online')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'online'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            Đang online ({onlineCount})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Email</th>
                <th className="py-3.5 px-4">Vai trò</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Ngày tham gia</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Live</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Tài khoản</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUser?.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">@{user.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono hidden sm:table-cell">{user.email}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          user.role === 'admin'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 text-purple-400" />
                            <span>Quản trị viên</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span>Thành viên</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 hidden md:table-cell">{timeAgo(user.joinDate)}</td>

                    <td className="py-3.5 px-4 hidden md:table-cell">
                      {user.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-slate-500 border border-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <span>{user.lastActive ? timeAgo(user.lastActive) : 'Ngoại tuyến'}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 hidden sm:table-cell">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>Đã khóa</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                          <span>Bình thường</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/profile/${user.id}`}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                          title="Xem trang cá nhân"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {!isSelf && (
                          <>
                            <button
                              onClick={() => handleToggleRole(user.id, user.name, user.role)}
                              className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800/60 transition-colors text-[11px] font-bold px-2"
                              title="Thay đổi vai trò"
                            >
                              {user.role === 'admin' ? 'Hạ quyền' : 'Thăng Admin'}
                            </button>

                            <button
                              onClick={() => handleToggleBan(user.id, user.name, user.isBanned)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                user.isBanned
                                  ? 'bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border-emerald-800/60'
                                  : 'bg-rose-950/50 hover:bg-rose-900 text-rose-300 border-rose-800/60'
                              }`}
                              title={user.isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            >
                              {user.isBanned ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
