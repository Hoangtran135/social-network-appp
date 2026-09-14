import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { timeAgo } from '../../utils/time';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { ReportItem } from '../../types';

export const AdminReportsPage: React.FC = () => {
  const { reports, resolveReport, dismissReport, deletePostAdmin, posts, comments, groups } = useSocial();
  const { allUsers } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [search, setSearch] = useState('');
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null);

  const findTargetContent = (report: ReportItem) => {
    switch (report.targetType) {
      case 'post':
        return posts.find((p) => p.id === report.targetId);
      case 'user':
        return allUsers.find((u) => u.id === report.targetId);
      case 'group':
        return groups.find((g) => g.id === report.targetId);
      case 'comment':
        return Object.values(comments)
          .flat()
          .find((c) => c.id === report.targetId);
      default:
        return undefined;
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch =
      r.reason.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.targetName && r.targetName.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  const handleActionAndDelete = (report: ReportItem) => {
    if (!window.confirm('Xóa nội dung vi phạm này và đánh dấu báo cáo đã xử lý?')) return;
    if (report.targetType === 'post') {
      deletePostAdmin(report.targetId);
    }
    resolveReport(report.id, 'Đã xử lý gỡ bỏ nội dung vi phạm');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Báo Cáo & Vi Phạm</h1>
          </div>
          <p className="text-xs text-slate-400">
            Xem xét các phản hồi tiêu cực từ người dùng và đưa ra biện pháp xử lý.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-bold font-mono">
            Chờ xử lý: {pendingCount} báo cáo
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo lý do, người báo cáo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({reports.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'pending'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Chờ xử lý ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'resolved'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Đã xử lý ({reports.filter((r) => r.status === 'resolved').length})
          </button>
        </div>
      </div>

      {/* Reports Stream */}
      <div className="space-y-3.5">
        {filteredReports.length === 0 ? (
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-slate-500 text-xs">Không có báo cáo nào phù hợp.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    Đối tượng: {report.targetType.toUpperCase()}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      report.status === 'pending'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : report.status === 'resolved'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {report.status === 'pending'
                      ? 'Đang chờ xử lý'
                      : report.status === 'resolved'
                      ? 'Đã xử lý'
                      : 'Đã bỏ qua'}
                  </span>

                  <span className="text-xs text-slate-500 font-mono">
                    ID: #{report.targetId}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  Mục tiêu: {report.targetName}
                </h4>

                <p className="text-xs text-slate-300 mb-1">
                  <span className="text-rose-400 font-semibold">Lý do báo cáo:</span>{' '}
                  {report.reason}
                </p>

                {report.description && (
                  <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-850 mb-2">
                    "{report.description}"
                  </p>
                )}

                {report.resolutionNote && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Ghi chú xử lý: {report.resolutionNote}
                  </p>
                )}

                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
                  <span>Người báo cáo: {report.reporter.name}</span>
                  <span>•</span>
                  <span>{timeAgo(report.createdAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4 justify-end">
                <button
                  onClick={() => setViewingReport(report)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem</span>
                </button>

                {report.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleActionAndDelete(report)}
                      className="px-3 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa & Xử lý</span>
                    </button>

                    <button
                      onClick={() => resolveReport(report.id, 'Đã xác nhận và xử lý')}
                      className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Duyệt</span>
                    </button>

                    <button
                      onClick={() => dismissReport(report.id)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Bỏ qua
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 italic">Đã hoàn tất</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Reported Content Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                Nội dung bị báo cáo — {viewingReport.targetType.toUpperCase()}
              </h3>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1.5 rounded-full hover:bg-slate-900 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              {(() => {
                const target = findTargetContent(viewingReport);
                if (!target) {
                  return (
                    <p className="text-xs text-slate-500 italic">
                      Nội dung này không còn tồn tại (có thể đã bị xóa trước đó).
                    </p>
                  );
                }
                if (viewingReport.targetType === 'post') {
                  const post = target as (typeof posts)[number];
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-white">{post.author.name}</p>
                          <p className="text-[10px] text-slate-500">{timeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900 p-3 rounded-xl border border-slate-800">
                        {post.content}
                      </p>
                      {post.images && post.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {post.images.slice(0, 4).map((img, i) => (
                            <img key={i} src={img} alt="" className="rounded-xl aspect-video object-cover border border-slate-800" />
                          ))}
                        </div>
                      )}
                      <Link
                        to={`/profile/${post.author.id}`}
                        onClick={() => setViewingReport(null)}
                        className="inline-block text-xs font-bold text-purple-400 hover:text-purple-300"
                      >
                        Xem trang cá nhân tác giả →
                      </Link>
                    </div>
                  );
                }
                if (viewingReport.targetType === 'comment') {
                  const comment = target as (typeof comments)[string][number];
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <img src={comment.author.avatar} alt={comment.author.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-white">{comment.author.name}</p>
                          <p className="text-[10px] text-slate-500">{timeAgo(comment.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900 p-3 rounded-xl border border-slate-800">
                        {comment.content}
                      </p>
                      {comment.image && (
                        <img src={comment.image} alt="" className="rounded-xl max-h-56 object-cover border border-slate-800" />
                      )}
                    </div>
                  );
                }
                if (viewingReport.targetType === 'user') {
                  const user = target as (typeof allUsers)[number];
                  return (
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full object-cover border border-slate-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                        <p className="text-xs text-slate-400 mt-1">{user.bio}</p>
                      </div>
                      <Link
                        to={`/profile/${user.id}`}
                        onClick={() => setViewingReport(null)}
                        className="px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold shrink-0"
                      >
                        Xem trang
                      </Link>
                    </div>
                  );
                }
                if (viewingReport.targetType === 'group') {
                  const group = target as (typeof groups)[number];
                  return (
                    <div className="flex items-center gap-3">
                      <img src={group.avatar} alt={group.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{group.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{group.description}</p>
                      </div>
                      <Link
                        to={`/groups/${group.id}`}
                        onClick={() => setViewingReport(null)}
                        className="px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold shrink-0"
                      >
                        Xem nhóm
                      </Link>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
