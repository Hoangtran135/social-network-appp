import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { PostCard } from '../posts/PostCard';
import { CreatePostBox } from '../posts/CreatePostBox';
import { CreatePostModal } from '../posts/CreatePostModal';
import { ReportModal } from '../moderation/ReportModal';
import {
  Camera,
  Edit3,
  UserPlus,
  UserCheck,
  MessageCircle,
  Briefcase,
  GraduationCap,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Users,
  FileText,
  AlertTriangle,
  Info,
  ShieldCheck,
  Ban,
} from 'lucide-react';

type ProfileTab = 'posts' | 'friends' | 'photos' | 'about';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, allUsers, blockUser, unblockUser } = useAuth();
  const {
    posts,
    friends,
    friendRequests,
    sentFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getOrCreateConversation,
    getUserFriends,
  } = useSocial();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [targetFriends, setTargetFriends] = useState<typeof friends>([]);

  // Find user by id
  const targetUser = allUsers.find((u) => u.id === id) || (currentUser?.id === id ? currentUser : null);

  // Friends of the profile being viewed (not the viewer's own friends list)
  useEffect(() => {
    if (!targetUser) return;
    if (targetUser.id === currentUser?.id) {
      setTargetFriends(friends);
      return;
    }
    getUserFriends(targetUser.id).then(setTargetFriends);
  }, [targetUser?.id, currentUser?.id, friends]);

  if (!targetUser) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Không tìm thấy người dùng</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">Trang cá nhân này không tồn tại hoặc đã bị gỡ.</p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
        >
          Quay lại Bảng tin
        </Link>
      </div>
    );
  }

  const isOwner = currentUser?.id === targetUser.id;
  const isFriend = friends.some((f) => f.id === targetUser.id);
  const hasIncomingRequest = friendRequests.find((r) => r.sender.id === targetUser.id);
  const sentRequest = sentFriendRequests.find((r) => r.receiverId === targetUser.id);
  const isBlocked = currentUser?.blockedUserIds?.includes(targetUser.id) ?? false;

  const handleToggleBlock = () => {
    if (isBlocked) {
      unblockUser(targetUser.id);
      return;
    }
    if (window.confirm(`Chặn ${targetUser.name}? Hai bên sẽ không thể kết bạn hoặc nhắn tin cho nhau.`)) {
      blockUser(targetUser.id);
    }
  };

  // User posts: authored by them, or posted on their wall by a friend — excluding group discussion posts
  const userPosts = posts.filter(
    (p) => !p.groupId && (p.author.id === targetUser.id || p.wallOwnerId === targetUser.id)
  );

  // Collect user photos
  const userPhotos = userPosts.flatMap((p) => p.images || []);

  const handleStartChat = async () => {
    const convId = await getOrCreateConversation(targetUser);
    navigate(`/messages/${convId}`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        {/* Cover Photo */}
        <div className="h-48 sm:h-72 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
          {targetUser.coverImage && (
            <img
              src={targetUser.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          {isOwner && (
            <Link
              to="/settings/profile"
              className="absolute bottom-4 right-4 px-3.5 py-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-xl text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Đổi ảnh bìa</span>
            </Link>
          )}
        </div>

        {/* User Info Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="relative group">
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white shadow-xl ring-2 ring-slate-100"
              />
              {isOwner && (
                <Link
                  to="/settings/profile"
                  className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-colors"
                  title="Đổi ảnh đại diện"
                >
                  <Camera className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              {isOwner ? (
                <>
                  <Link
                    to="/settings/profile"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Chỉnh sửa trang cá nhân</span>
                  </Link>

                  <Link
                    to="/settings"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cài đặt
                  </Link>
                </>
              ) : isBlocked ? (
                <button
                  onClick={handleToggleBlock}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span>Đã chặn — Bỏ chặn</span>
                </button>
              ) : (
                <>
                  {isFriend ? (
                    <button
                      onClick={() => {
                        if (window.confirm(`Hủy kết bạn với ${targetUser.name}?`)) removeFriend(targetUser.id);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Bạn bè</span>
                    </button>
                  ) : hasIncomingRequest ? (
                    <button
                      onClick={() => acceptFriendRequest(hasIncomingRequest.id)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Chấp nhận kết bạn</span>
                    </button>
                  ) : sentRequest ? (
                    <button
                      onClick={() => {
                        if (window.confirm(`Hủy lời mời kết bạn đã gửi cho ${targetUser.name}?`)) cancelFriendRequest(sentRequest.id);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Hủy lời mời</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(targetUser)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Thêm bạn bè</span>
                    </button>
                  )}

                  <button
                    onClick={handleStartChat}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Nhắn tin</span>
                  </button>

                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                    title="Báo cáo người dùng"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleToggleBlock}
                    className="p-2.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 rounded-xl transition-colors"
                    title="Chặn người dùng"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-slate-900">{targetUser.name}</h1>
              {targetUser.role === 'admin' && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">@{targetUser.username}</p>

            {targetUser.bio && (
              <p className="text-sm text-slate-700 mt-2.5 max-w-2xl font-normal leading-relaxed">
                {targetUser.bio}
              </p>
            )}

            {/* Quick Meta tags */}
            <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap mt-3 text-xs text-slate-500 font-medium">
              {targetUser.workplace && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{targetUser.workplace}</span>
                </span>
              )}
              {targetUser.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{targetUser.location}</span>
                </span>
              )}
              {targetUser.joinDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tham gia từ {targetUser.joinDate}</span>
                </span>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-100 mt-6 pt-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                activeTab === 'posts'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Bài viết ({userPosts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                activeTab === 'friends'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Bạn bè ({targetFriends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                activeTab === 'photos'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Hình ảnh ({userPhotos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                activeTab === 'about'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Giới thiệu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left info column */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Giới thiệu ngắn</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {targetUser.bio || 'Chưa có thông tin tự giới thiệu.'}
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                {targetUser.workplace && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>Làm việc tại <span className="font-bold">{targetUser.workplace}</span></span>
                  </div>
                )}
                {targetUser.education && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span>Học tại <span className="font-bold">{targetUser.education}</span></span>
                  </div>
                )}
                {targetUser.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Sống tại <span className="font-bold">{targetUser.location}</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* Photos widget */}
            {userPhotos.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 text-sm">Hình ảnh</h3>
                  <button onClick={() => setActiveTab('photos')} className="text-xs text-blue-600 font-bold hover:underline">
                    Xem tất cả
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                  {userPhotos.slice(0, 6).map((img, i) => (
                    <img key={i} src={img} alt="Thumb" className="w-full h-20 object-cover hover:opacity-90 cursor-pointer" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Posts Stream */}
          <div className="md:col-span-2">
            {(isOwner || isFriend) && (
              <CreatePostBox
                placeholder={isOwner ? undefined : `Viết gì đó cho ${targetUser.name}...`}
                onClick={() => setIsCreatePostOpen(true)}
              />
            )}

            {userPosts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Chưa có bài viết nào</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isOwner ? 'Hãy đăng bài viết đầu tiên của bạn ngay phía trên.' : `${targetUser.name} chưa đăng bài viết nào.`}
                </p>
              </div>
            ) : (
              userPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-base mb-4">Danh sách bạn bè ({targetFriends.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {targetFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors"
              >
                <Link to={`/profile/${friend.id}`} className="flex items-center gap-3 min-w-0">
                  <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover" />
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-slate-900 truncate hover:text-blue-600">{friend.name}</h4>
                    <span className="text-[11px] text-slate-400 truncate block">@{friend.username}</span>
                  </div>
                </Link>

                <button
                  onClick={async () => {
                    const convId = await getOrCreateConversation(friend);
                    navigate(`/messages/${convId}`);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 shadow-2xs"
                  title="Nhắn tin"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-base mb-4">Tất cả hình ảnh ({userPhotos.length})</h3>
          {userPhotos.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Chưa có hình ảnh nào.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {userPhotos.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 group cursor-pointer border border-slate-200">
                  <img src={img} alt="User media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-6">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Thông tin chi tiết</h3>
          
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Tiểu sử</span>
              <p className="text-slate-800 font-medium">{targetUser.bio || 'Chưa cập nhật'}</p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Nơi làm việc</span>
              <p className="text-slate-800 font-medium">{targetUser.workplace || 'Chưa cập nhật'}</p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Học vấn</span>
              <p className="text-slate-800 font-medium">{targetUser.education || 'Chưa cập nhật'}</p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Nơi sinh sống</span>
              <p className="text-slate-800 font-medium">{targetUser.location || 'Chưa cập nhật'}</p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Email liên hệ</span>
              <p className="text-slate-800 font-medium">{targetUser.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Global Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        wallOwner={isOwner ? undefined : targetUser}
      />

      {/* Report User Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="user"
        targetId={targetUser.id}
        targetName={`Người dùng ${targetUser.name}`}
      />
    </div>
  );
};
