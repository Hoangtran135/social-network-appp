import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../utils/api';
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Search,
  MessageCircle,
  Clock,
  Sparkles,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { User } from '../../types';
import { useConfirm } from '../../common/ConfirmDialogProvider';

type FriendsTab = 'list' | 'requests' | 'suggestions';

export const FriendsPage: React.FC = () => {
  const {
    friends,
    friendRequests,
    sentFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    sendFriendRequest,
    getOrCreateConversation,
  } = useSocial();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<FriendsTab>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);

  // Requests addressed to the current user
  const incomingRequests = friendRequests;

  // Server already excludes self/friends/pending/blocked/bot — no client-side filtering
  // of a full user list needed (that list doesn't even exist client-side anymore).
  useEffect(() => {
    api
      .get<{ users: User[] }>('/friends/suggestions?limit=24')
      .then(({ users }) => setSuggestions(users))
      .catch(() => setSuggestions([]));
  }, [friends.length, sentFriendRequests.length]);

  // People I've sent a request to, still pending their response
  const pendingOutgoing = sentFriendRequests;

  // Filtered friends
  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = async (user: User) => {
    const convId = await getOrCreateConversation(user);
    navigate(`/messages/${convId}`);
  };

  return (
    <div className="w-full max-w-4xl min-w-0">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                  <Users className="w-6 h-6 text-white" />
                </span>
                <h1 className="text-2xl font-black tracking-tight">Quản lý Bạn bè</h1>
              </div>
              <p className="text-blue-100 text-sm">
                Kết nối với bạn bè, đồng nghiệp và mở rộng mạng lưới quan hệ của bạn.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
              <div className="text-center pr-3 border-r border-white/20">
                <div className="text-xl font-black">{friends.length}</div>
                <div className="text-[11px] text-blue-100">Bạn bè</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{incomingRequests.length}</div>
                <div className="text-[11px] text-blue-100">Lời mời</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Tất cả bạn bè ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Lời mời kết bạn</span>
              {incomingRequests.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'requests' ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                  }`}
                >
                  {incomingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'suggestions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Gợi ý kết bạn ({suggestions.length})</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm bạn bè..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          )}
        </div>

        {/* Tab 1: All Friends List */}
        {activeTab === 'list' && (
          <div>
            {filteredFriends.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery ? 'Không tìm thấy bạn bè nào khớp từ khóa' : 'Bạn chưa có người bạn nào'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Hãy xem các gợi ý kết bạn để kết nối với những người bạn biết!
                </p>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Xem gợi ý kết bạn
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
                  >
                    <div className="p-4 flex items-start gap-3">
                      <Link to={`/profile/${friend.id}`} className="shrink-0 relative">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                        />
                        {friend.isOnline && (
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${friend.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                        >
                          {friend.name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate">@{friend.username}</p>

                        {friend.location && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{friend.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-1 flex items-center gap-2 border-t border-slate-100">
                      <button
                        onClick={() => handleStartChat(friend)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Nhắn tin</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (await confirm(`Hủy kết bạn với ${friend.name}?`)) removeFriend(friend.id);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                        title="Hủy kết bạn"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Incoming Friend Requests */}
        {activeTab === 'requests' && (
          <div>
            {incomingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Không có lời mời kết bạn nào</h3>
                <p className="text-xs text-slate-500 mt-1">Khi có người gửi lời mời kết bạn, bạn sẽ thấy ở đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <Link to={`/profile/${req.sender.id}`} className="shrink-0">
                        <img
                          src={req.sender.avatar}
                          alt={req.sender.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${req.sender.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                        >
                          {req.sender.name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate">@{req.sender.username}</p>
                        <p className="text-[11px] text-blue-600 font-medium mt-1">
                          {req.mutualFriendsCount} bạn chung
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        Chấp nhận
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(req.id)}
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingOutgoing.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Lời mời đã gửi ({pendingOutgoing.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingOutgoing.map((req) => {
                    const target = req.receiver;
                    if (!target) return null;
                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-4 flex flex-col justify-between"
                      >
                        <Link to={`/profile/${target.id}`} className="flex items-center gap-3 mb-4">
                          <img
                            src={target.avatar}
                            alt={target.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate">
                              {target.name}
                            </span>
                            <p className="text-xs text-slate-400 truncate">@{target.username}</p>
                          </div>
                        </Link>
                        <button
                          onClick={async () => {
                            if (await confirm(`Hủy lời mời kết bạn đã gửi cho ${target.name}?`)) cancelFriendRequest(req.id);
                          }}
                          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold transition-colors"
                        >
                          Hủy lời mời
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Suggestions */}
        {activeTab === 'suggestions' && (
          <div>
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Không còn gợi ý mới</h3>
                <p className="text-xs text-slate-500 mt-1">Bạn đã kết nối với hầu hết mọi người!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <Link to={`/profile/${user.id}`} className="shrink-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/profile/${user.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                          >
                            {user.name}
                          </Link>
                          <p className="text-xs text-slate-400 truncate">@{user.username}</p>

                          {user.workplace && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
                              <Briefcase className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{user.workplace}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {user.bio && (
                        <p className="text-xs text-slate-600 mt-3 line-clamp-2 italic bg-slate-50 p-2 rounded-xl">
                          "{user.bio}"
                        </p>
                      )}
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        onClick={() => sendFriendRequest(user)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Thêm bạn bè</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
};
