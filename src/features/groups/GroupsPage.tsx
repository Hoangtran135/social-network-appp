import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { CreateGroupModal } from './CreateGroupModal';
import {
  Users2,
  Plus,
  Search,
  Lock,
  Globe,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

type GroupTab = 'my_groups' | 'discover';

export const GroupsPage: React.FC = () => {
  const { groups, joinGroup, leaveGroup } = useSocial();
  const [activeTab, setActiveTab] = useState<GroupTab>('my_groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const myGroups = groups.filter((g) => g.isMember);
  const discoverGroups = groups.filter((g) => !g.isMember);

  const displayedGroups = (activeTab === 'my_groups' ? myGroups : discoverGroups).filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl min-w-0">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                  <Users2 className="w-6 h-6 text-white" />
                </span>
                <h1 className="text-2xl font-black tracking-tight">Cộng đồng & Nhóm</h1>
              </div>
              <p className="text-blue-100 text-sm">
                Khám phá và tham gia các hội đồng cùng sở thích, trao đổi kiến thức và kết nối.
              </p>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition-colors shadow-md shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo nhóm mới</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('my_groups')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'my_groups'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>Nhóm của bạn ({myGroups.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'discover'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Khám phá nhóm ({discoverGroups.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Groups Grid */}
        {displayedGroups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery
                ? 'Không tìm thấy nhóm nào phù hợp'
                : activeTab === 'my_groups'
                ? 'Bạn chưa tham gia nhóm nào'
                : 'Không có nhóm nào để khám phá'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {activeTab === 'my_groups'
                ? 'Hãy khám phá các nhóm cộng đồng hoặc tự tạo nhóm của riêng bạn ngay hôm nay.'
                : 'Thử tìm kiếm với từ khóa khác.'}
            </p>
            {activeTab === 'my_groups' && (
              <button
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Khám phá ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Cover & Avatar Header */}
                <div className="relative h-28 bg-slate-100">
                  <img
                    src={group.coverImage}
                    alt={group.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  <div className="absolute top-2.5 right-2.5">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-slate-700 backdrop-blur-xs shadow-xs">
                      {group.privacy === 'public' ? (
                        <>
                          <Globe className="w-3 h-3 text-blue-600" />
                          <span>Công khai</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Riêng tư</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="absolute -bottom-4 left-4">
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md"
                    />
                  </div>
                </div>

                {/* Body Content */}
                <div className="pt-6 px-4 pb-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/groups/${group.id}`}
                      className="font-bold text-base text-slate-900 hover:text-blue-600 transition-colors block mb-1"
                    >
                      {group.name}
                    </Link>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {group.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                      <span>{group.membersCount} thành viên</span>
                      <span>•</span>
                      <span>{group.postsCount} bài viết</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/groups/${group.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <span>Xem nhóm</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {group.isMember ? (
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn rời khỏi nhóm "${group.name}"?`)) leaveGroup(group.id);
                        }}
                        className="group/leave px-3 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors"
                      >
                        <span className="group-hover/leave:hidden">Đã tham gia</span>
                        <span className="hidden group-hover/leave:inline">Rời nhóm</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => joinGroup(group.id)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        Tham gia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        <CreateGroupModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
