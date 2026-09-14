import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { timeAgo } from '../../utils/time';
import {
  Users2,
  Search,
  Lock,
  Globe,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const AdminGroupsPage: React.FC = () => {
  const { groups, deleteGroupAdmin } = useSocial();
  const [search, setSearch] = useState('');

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteGroup = (groupId: string, name: string) => {
    if (window.confirm(`Giải tán nhóm "${name}"? Toàn bộ bài viết trong nhóm sẽ bị xóa vĩnh viễn.`)) {
      deleteGroupAdmin(groupId, name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users2 className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Quản lý Nhóm Cộng Đồng</h1>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi tất cả các nhóm trên nền tảng, số lượng thành viên và trạng thái bảo mật.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold font-mono">
            Tổng: {groups.length} nhóm
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhóm, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Groups Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Tên nhóm</th>
                <th className="py-3.5 px-4">Quyền riêng tư</th>
                <th className="py-3.5 px-4">Thành viên</th>
                <th className="py-3.5 px-4">Bài viết</th>
                <th className="py-3.5 px-4">Ngày tạo</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Users2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">Không tìm thấy nhóm nào.</p>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 truncate">{group.name}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                            {group.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          group.privacy === 'public'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {group.privacy === 'public' ? (
                          <>
                            <Globe className="w-3 h-3 text-blue-400" />
                            <span>Công khai</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>Riêng tư</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {group.membersCount} người
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {group.postsCount} bài
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">{timeAgo(group.createdAt)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/groups/${group.id}`}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                          title="Xem chi tiết nhóm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                          title="Xóa nhóm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
