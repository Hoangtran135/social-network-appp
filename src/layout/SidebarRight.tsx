import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../features/auth/AuthContext';
import { UserPlus, Check, X, Circle } from 'lucide-react';

export const SidebarRight: React.FC = () => {
  const { friends, friendRequests, acceptFriendRequest, rejectFriendRequest, getOrCreateConversation } = useSocial();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const incomingRequests = friendRequests.filter((r) => r.receiverId === currentUser?.id);

  const handleStartChat = async (user: import('../types').User) => {
    const convId = await getOrCreateConversation(user);
    navigate(`/messages/${convId}`);
  };

  return (
    <aside className="w-72 shrink-0 hidden xl:block sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pl-2 pb-8 space-y-5">
      {/* Friend Requests Widget */}
      {incomingRequests.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-slate-800 text-sm">Lời mời kết bạn</h4>
            </div>
            <Link to="/friends" className="text-xs text-blue-600 hover:underline font-semibold">
              Xem ({incomingRequests.length})
            </Link>
          </div>

          <div className="space-y-3">
            {incomingRequests.slice(0, 2).map((req) => (
              <div key={req.id} className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2.5">
                  <img
                    src={req.sender.avatar}
                    alt={req.sender.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/profile/${req.sender.id}`}
                      className="font-bold text-xs text-slate-800 hover:text-blue-600 truncate block"
                    >
                      {req.sender.name}
                    </Link>
                    <span className="text-[11px] text-slate-400">{req.mutualFriendsCount} bạn chung</span>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => acceptFriendRequest(req.id)}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác nhận</span>
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(req.id)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Contacts List */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-slate-800 text-sm">Người liên hệ</h4>
          <span className="text-xs text-slate-400">{friends.length} người</span>
        </div>

        <div className="space-y-1">
          {friends.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400">Chưa có người liên hệ nào</div>
          )}
          {friends.map((user) => (
            <button
              key={user.id}
              onClick={() => handleStartChat(user)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <Circle
                    className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 rounded-full fill-current ${
                      user.isOnline ? 'text-emerald-500 fill-emerald-500 ring-2 ring-white' : 'text-slate-300 fill-slate-300'
                    }`}
                  />
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate block">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {user.isOnline ? 'Đang hoạt động' : user.lastActive || 'Ngoại tuyến'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
