import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { timeAgo } from '../../utils/time';
import { CreatePostBox } from '../posts/CreatePostBox';
import { PostCard } from '../posts/PostCard';
import { CreatePostModal } from '../posts/CreatePostModal';
import { GroupJoinAction } from './GroupJoinAction';
import { GroupJoinRequestItem } from '../../types';
import {
  Lock,
  Globe,
  Plus,
  Shield,
  FileText,
  Users,
  Info,
  ArrowLeft,
  Calendar,
  AlertCircle,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Edit2,
  Trash2,
  Save,
  Check,
  X,
} from 'lucide-react';
import { useConfirm } from '../../common/ConfirmDialogProvider';

type GroupDetailTab = 'feed' | 'members' | 'about';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    groups,
    posts,
    friends,
    inviteToGroup,
    removeGroupMember,
    promoteGroupMember,
    updateGroupRules,
    fetchGroupJoinRequests,
    approveGroupJoinRequest,
    rejectGroupJoinRequest,
    acceptGroupInvite,
    declineGroupInvite,
    fetchGroupById,
  } = useSocial();
  const { currentUser } = useAuth();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<GroupDetailTab>('feed');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showInviteList, setShowInviteList] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [rulesDraft, setRulesDraft] = useState<string[]>([]);
  const [newRuleText, setNewRuleText] = useState('');
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestItem[]>([]);
  const [isFetchingGroup, setIsFetchingGroup] = useState(false);
  const [groupNotFound, setGroupNotFound] = useState(false);

  const group = groups.find((g) => g.id === id);
  const myMembership = group?.members.find((m) => m.userId === currentUser?.id);
  const canManageMembers = myMembership?.role === 'admin' || myMembership?.role === 'moderator';

  useEffect(() => {
    if (!group || !canManageMembers) {
      setJoinRequests([]);
      return;
    }
    fetchGroupJoinRequests(group.id).then(setJoinRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, canManageMembers, group?.joinRequestsCount]);

  // Not every group the user might land on (e.g. via a brand-new invite/promotion
  // notification) is in the already-loaded `groups` list — fetch it directly instead of
  // showing a false "not found" that only a full page reload used to fix.
  useEffect(() => {
    if (group || !id) return;
    setIsFetchingGroup(true);
    setGroupNotFound(false);
    fetchGroupById(id).then((fetched) => {
      setIsFetchingGroup(false);
      if (!fetched) setGroupNotFound(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, group]);

  if (!group) {
    if (isFetchingGroup && !groupNotFound) {
      return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Đang tải nhóm...</p>
        </div>
      );
    }
    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy nhóm</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Nhóm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <button
          onClick={() => navigate('/groups')}
          className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Quay lại danh sách nhóm
        </button>
      </div>
    );
  }

  // Filter posts belonging to this group; pinned posts are shown first.
  const groupPosts = posts
    .filter((p) => p.groupId === group.id)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // Can only invite friends — a stranger has to request to join instead.
  const invitableUsers = friends.filter((u) => !group.members.some((m) => m.userId === u.id));

  return (
    <div className="w-full max-w-4xl min-w-0">
        {/* Back Link */}
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách nhóm</span>
        </Link>

        {/* Pending group-invite confirmation banner */}
        {group.hasPendingInvite && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-indigo-800 font-semibold">
              Bạn được mời tham gia nhóm "{group.name}". Xác nhận để tham gia?
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => acceptGroupInvite(group.id)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
              >
                Chấp nhận
              </button>
              <button
                onClick={() => declineGroupInvite(group.id)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 transition-colors"
              >
                Từ chối
              </button>
            </div>
          </div>
        )}

        {/* Group Header Hero */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs mb-6">
          {/* Cover Photo */}
          <div className="relative h-48 sm:h-64 bg-slate-200">
            <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 text-slate-800 backdrop-blur-md shadow-xs">
                {group.privacy === 'public' ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nhóm Công khai</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nhóm Riêng tư</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Group Identity Info */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
              <div className="flex items-end gap-4">
                <img
                  src={group.avatar}
                  alt={group.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl relative z-10"
                />
                <div className="pt-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {group.name}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-3">
                    <span>{group.membersCount} thành viên</span>
                    <span>•</span>
                    <span>{groupPosts.length} bài thảo luận</span>
                  </p>
                </div>
              </div>

              {/* Group Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {group.isMember && (
                  <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Viết bài trong nhóm</span>
                  </button>
                )}
                <GroupJoinAction group={group} />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Thảo luận ({groupPosts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'members'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Thành viên ({group.members.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'about'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Giới thiệu & Quy tắc</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Discussion Feed */}
        {activeTab === 'feed' && (
          <div>
            {group.isMember ? (
              <CreatePostBox
                placeholder={`Bạn muốn chia sẻ điều gì với nhóm "${group.name}"?`}
                onClick={() => setIsCreatePostOpen(true)}
              />
            ) : (
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-center mb-5">
                <p className="text-xs text-blue-800 font-semibold mb-2">
                  {group.hasPendingInvite
                    ? 'Bạn được mời tham gia nhóm này — xác nhận ở trên để đăng bài và tương tác.'
                    : group.hasPendingJoinRequest
                    ? 'Yêu cầu tham gia của bạn đang chờ trưởng nhóm duyệt.'
                    : 'Bạn cần tham gia nhóm để có thể đăng bài và tương tác cùng các thành viên.'}
                </p>
                {!group.hasPendingJoinRequest && <GroupJoinAction group={group} className="mx-auto" />}
              </div>
            )}

            {groupPosts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Chưa có bài viết nào trong nhóm</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Hãy là người đầu tiên khơi mào chủ đề thảo luận cho cộng đồng này!
                </p>
                {group.isMember && (
                  <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Đăng bài viết mới
                  </button>
                )}
              </div>
            ) : (
              groupPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {/* Tab 2: Group Members */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Danh sách thành viên ({group.members.length})</span>
              </h3>

              {canManageMembers && (
                <button
                  onClick={() => setShowInviteList(!showInviteList)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Mời thành viên</span>
                </button>
              )}
            </div>

            {canManageMembers && joinRequests.length > 0 && (
              <div className="mb-5 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">
                  Yêu cầu tham gia đang chờ duyệt ({joinRequests.length})
                </h4>
                <div className="space-y-2">
                  {joinRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-100">
                      <Link to={`/profile/${r.user.id}`} className="flex items-center gap-2.5 min-w-0">
                        <img src={r.user.avatar} alt={r.user.name} className="w-9 h-9 rounded-full object-cover" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{r.user.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">@{r.user.username}</div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={async () => {
                            await approveGroupJoinRequest(group.id, r.user.id, r.user.name);
                            setJoinRequests((prev) => prev.filter((req) => req.id !== r.id));
                          }}
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="Chấp nhận"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            await rejectGroupJoinRequest(group.id, r.user.id, r.user.name);
                            setJoinRequests((prev) => prev.filter((req) => req.id !== r.id));
                          }}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Từ chối"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showInviteList && canManageMembers && (
              <div className="mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Mời bạn bè vào nhóm
                </h4>
                {invitableUsers.length === 0 ? (
                  <p className="text-xs text-slate-400">Bạn bè của bạn đã ở trong nhóm hoặc bạn chưa có bạn bè nào để mời.</p>
                ) : (
                  <div className="space-y-2">
                    {invitableUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">{u.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">@{u.username}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => inviteToGroup(group.id, u)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors shrink-0"
                        >
                          Mời
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.members.map((member) => {
                const canRemoveThis =
                  canManageMembers &&
                  member.userId !== currentUser?.id &&
                  member.role !== 'admin' &&
                  (member.role !== 'moderator' || myMembership?.role === 'admin');
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors"
                  >
                    <Link to={`/profile/${member.user.id}`} className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.user.avatar}
                        alt={member.user.name}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate hover:text-blue-600">
                          {member.user.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">@{member.user.username}</div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : member.role === 'moderator'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {member.role === 'admin'
                          ? 'Trưởng nhóm'
                          : member.role === 'moderator'
                          ? 'Phó nhóm'
                          : 'Thành viên'}
                      </span>

                      {myMembership?.role === 'admin' && member.role !== 'admin' && (
                        <button
                          onClick={async () => {
                            if (await confirm({ message: `Bổ nhiệm ${member.user.name} làm trưởng nhóm mới?`, danger: false })) {
                              promoteGroupMember(group.id, member.userId, 'admin');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-purple-50 text-slate-400 hover:text-purple-600 border border-slate-200 transition-colors"
                          title="Bổ nhiệm làm trưởng nhóm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canRemoveThis && (
                        <button
                          onClick={async () => {
                            if (await confirm(`Xóa ${member.user.name} khỏi nhóm?`)) {
                              removeGroupMember(group.id, member.userId);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors"
                          title="Xóa khỏi nhóm"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: About & Rules */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span>Giới thiệu về nhóm</span>
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{group.description}</p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Thành lập: {timeAgo(group.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Quyền riêng tư: {group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>Quy tắc của nhóm</span>
                </h3>
                {canManageMembers && !isEditingRules && (
                  <button
                    onClick={() => {
                      setRulesDraft(group.rules ? [...group.rules] : []);
                      setIsEditingRules(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>

              {isEditingRules ? (
                <div className="space-y-3">
                  {rulesDraft.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-6 h-6 mt-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        value={rule}
                        onChange={(e) =>
                          setRulesDraft((prev) => prev.map((r, i) => (i === idx ? e.target.value : r)))
                        }
                        className="flex-1 min-w-0 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setRulesDraft((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRuleText.trim()) {
                          e.preventDefault();
                          setRulesDraft((prev) => [...prev, newRuleText.trim()]);
                          setNewRuleText('');
                        }
                      }}
                      placeholder="Thêm quy tắc mới..."
                      className="flex-1 min-w-0 text-xs px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!newRuleText.trim()) return;
                        setRulesDraft((prev) => [...prev, newRuleText.trim()]);
                        setNewRuleText('');
                      }}
                      className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingRules(false)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Hủy</span>
                    </button>
                    <button
                      onClick={async () => {
                        await updateGroupRules(group.id, rulesDraft);
                        setIsEditingRules(false);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu quy tắc</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {group.rules && group.rules.length > 0 ? (
                    group.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{rule}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Chưa có quy tắc cụ thể.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Post in Group Modal */}
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          defaultGroupId={group.id}
          defaultGroupName={group.name}
        />
      </div>
  );
};
