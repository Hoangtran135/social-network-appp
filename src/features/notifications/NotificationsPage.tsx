import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { timeAgo } from '../../utils/time';
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  UserPlus,
  Share2,
  Users,
  ShieldAlert,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { NotificationItem } from '../../types';

type NotifFilter = 'all' | 'unread' | 'friends' | 'interactions';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    hasMoreNotifications,
    isLoadingMoreNotifications,
    loadMoreNotifications,
  } = useSocial();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotifFilter>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'friends') return n.type === 'friend_request' || n.type === 'friend_accept';
    if (filter === 'interactions') return n.type === 'like' || n.type === 'comment' || n.type === 'share';
    return true;
  });

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'share':
        return <Share2 className="w-4 h-4 text-emerald-500" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'group_invite':
        return <Users className="w-4 h-4 text-amber-500" />;
      case 'system':
      default:
        return <ShieldAlert className="w-4 h-4 text-purple-500" />;
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markNotificationAsRead(notif.id);
    if (notif.targetType === 'post') {
      navigate('/');
    } else if (notif.targetType === 'profile') {
      navigate(`/profile/${notif.actor.id}`);
    } else if (notif.targetType === 'group' && notif.targetId) {
      navigate(`/groups/${notif.targetId}`);
    }
  };

  return (
    <div className="w-full max-w-3xl min-w-0">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Thông báo</h1>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `Bạn có ${unreadCount} thông báo chưa đọc`
                  : 'Tất cả thông báo đã được đọc'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition-colors shrink-0"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Đánh dấu tất cả đã đọc</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'unread'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('interactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'interactions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tương tác bài viết
          </button>
          <button
            onClick={() => setFilter('friends')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'friends'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Bạn bè
          </button>
        </div>

        {/* Notification List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Không có thông báo nào</h3>
              <p className="text-xs text-slate-400 mt-1">Khi có hoạt động mới, thông báo sẽ hiển thị ở đây.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 flex items-start gap-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                  !notif.isRead ? 'bg-blue-50/40' : ''
                }`}
              >
                {/* Actor Avatar with Type Badge */}
                <div className="relative shrink-0">
                  <img
                    src={notif.actor.avatar}
                    alt={notif.actor.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  />
                  <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs border border-slate-100">
                    {getNotifIcon(notif.type)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-slate-800 leading-snug">
                    <span className="font-bold text-slate-900">{notif.actor.name}</span>{' '}
                    {notif.content}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">{timeAgo(notif.createdAt)}</span>
                </div>

                {!notif.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>

        {hasMoreNotifications && filteredNotifications.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={loadMoreNotifications}
              disabled={isLoadingMoreNotifications}
              className="btn-secondary flex items-center gap-2 disabled:opacity-60"
            >
              {isLoadingMoreNotifications && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xem thêm thông báo</span>
            </button>
          </div>
        )}
      </div>
  );
};
