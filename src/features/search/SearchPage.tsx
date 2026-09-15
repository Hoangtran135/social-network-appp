import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { PostCard } from '../posts/PostCard';
import {
  Search,
  Users,
  FileText,
  Users2,
  Sparkles,
  UserPlus,
  MessageCircle,
} from 'lucide-react';

type SearchTab = 'all' | 'users' | 'posts' | 'groups';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  const { allUsers, currentUser } = useAuth();
  const { posts, groups, friends, sendFriendRequest, getOrCreateConversation, joinGroup } = useSocial();
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  const friendIds = friends.map((f) => f.id);

  // Search Results
  const matchingUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.bio?.toLowerCase().includes(query.toLowerCase())
  );

  const matchingPosts = posts.filter(
    (p) =>
      p.content.toLowerCase().includes(query.toLowerCase()) ||
      p.author.name.toLowerCase().includes(query.toLowerCase())
  );

  const matchingGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.description.toLowerCase().includes(query.toLowerCase())
  );

  const totalResults = matchingUsers.length + matchingPosts.length + matchingGroups.length;

  return (
    <div className="w-full max-w-3xl min-w-0">
        {/* Search Header Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs mb-6">
          <h1 className="text-xl font-black text-slate-900 tracking-tight mb-4">
            Khám phá & Tìm kiếm
          </h1>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng, bài viết, nhóm thảo luận..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-28 py-3 bg-slate-100 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Tất cả ({totalResults})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mọi người ({matchingUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'posts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bài viết ({matchingPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'groups'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>Nhóm ({matchingGroups.length})</span>
          </button>
        </div>

        {/* Results Stream */}
        {!query.trim() ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Nhập từ khóa để tìm kiếm</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tìm người dùng, bài viết hoặc nhóm thảo luận theo tên hoặc nội dung.
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy kết quả phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Không có người dùng, bài viết hay nhóm nào khớp với từ khóa "{query}". Thử tìm kiếm với từ khóa khác nhé.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section: Matching Users */}
            {(activeTab === 'all' || activeTab === 'users') && matchingUsers.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Mọi người ({matchingUsers.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchingUsers.map((user) => {
                    const isFriend = friendIds.includes(user.id);
                    const isSelf = user.id === currentUser?.id;

                    return (
                      <div
                        key={user.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors flex items-center justify-between gap-3"
                      >
                        {user.isBot ? (
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{user.name}</div>
                              <div className="text-[11px] text-slate-400 truncate">@{user.username}</div>
                            </div>
                          </div>
                        ) : (
                          <Link to={`/profile/${user.id}`} className="flex items-center gap-3 min-w-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate hover:text-blue-600">
                                {user.name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">@{user.username}</div>
                            </div>
                          </Link>
                        )}

                        {!isSelf && (
                          <div className="shrink-0">
                            {isFriend || user.isBot ? (
                              <button
                                onClick={async () => {
                                  const convId = await getOrCreateConversation(user);
                                  navigate(`/messages/${convId}`);
                                }}
                                className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Nhắn tin"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => sendFriendRequest(user)}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Kết bạn</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section: Matching Groups */}
            {(activeTab === 'all' || activeTab === 'groups') && matchingGroups.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-blue-600" />
                  <span>Nhóm cộng đồng ({matchingGroups.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchingGroups.map((group) => (
                    <div
                      key={group.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors flex items-center justify-between gap-3"
                    >
                      <Link to={`/groups/${group.id}`} className="flex items-center gap-3 min-w-0">
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 truncate hover:text-blue-600">
                            {group.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {group.membersCount} thành viên • {group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}
                          </div>
                        </div>
                      </Link>

                      <div className="shrink-0">
                        {group.isMember ? (
                          <Link
                            to={`/groups/${group.id}`}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition-colors"
                          >
                            Đã vào
                          </Link>
                        ) : (
                          <button
                            onClick={() => joinGroup(group.id)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            Tham gia
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: Matching Posts */}
            {(activeTab === 'all' || activeTab === 'posts') && matchingPosts.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3 px-1 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Bài viết ({matchingPosts.length})</span>
                </h3>
                {matchingPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
};
