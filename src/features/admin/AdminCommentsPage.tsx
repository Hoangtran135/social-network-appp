import React, { useState, useMemo } from 'react';
import { useSocial } from '../../context/SocialContext';
import { timeAgo } from '../../utils/time';
import {
  MessageSquare,
  Search,
  Trash2,
  Heart,
  Flag,
  X,
} from 'lucide-react';
import { Comment } from '../../types';

export const AdminCommentsPage: React.FC = () => {
  const { comments, posts, reports, deleteCommentAdmin } = useSocial();
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [reportedOnly, setReportedOnly] = useState(false);

  // Flatten comments from all posts
  const allComments: (Comment & { postContent?: string })[] = [];
  Object.entries(comments).forEach(([postId, cList]) => {
    const parentPost = posts.find((p) => p.id === postId);
    cList.forEach((c) => {
      allComments.push({
        ...c,
        postContent: parentPost?.content.slice(0, 40) + '...',
      });
    });
  });

  // Distinct commenters, for the "filter by user" dropdown
  const commenters = useMemo(() => {
    const map = new Map<string, string>();
    allComments.forEach((c) => map.set(c.author.id, c.author.name));
    return Array.from(map.entries());
  }, [comments]);

  const reportedCommentIds = useMemo(
    () => new Set(reports.filter((r) => r.targetType === 'comment' && r.status === 'pending').map((r) => r.targetId)),
    [reports]
  );

  const filteredComments = allComments.filter((c) => {
    const matchSearch =
      c.content.toLowerCase().includes(search.toLowerCase()) ||
      c.author.name.toLowerCase().includes(search.toLowerCase());
    const matchAuthor = authorFilter === 'all' || c.author.id === authorFilter;
    const matchReported = !reportedOnly || reportedCommentIds.has(c.id);
    return matchSearch && matchAuthor && matchReported;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Quản lý Bình Luận</h1>
          </div>
          <p className="text-xs text-slate-400">
            Giám sát tương tác thảo luận, xử lý ngôn từ kích động hoặc bình luận spam.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold font-mono">
            Tổng: {allComments.length} bình luận
          </span>
          {reportedCommentIds.size > 0 && (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-bold font-mono">
              <Flag className="w-3.5 h-3.5" />
              {reportedCommentIds.size} bị báo cáo
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-md">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung bình luận, người gửi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <select
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
        >
          <option value="all">Tất cả người bình luận</option>
          {commenters.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setReportedOnly(!reportedOnly)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            reportedOnly
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          Chỉ hiện bị báo cáo ({reportedCommentIds.size})
        </button>

        {(search || authorFilter !== 'all' || reportedOnly) && (
          <button
            onClick={() => {
              setSearch('');
              setAuthorFilter('all');
              setReportedOnly(false);
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Xóa lọc
          </button>
        )}
      </div>

      {/* Comments List Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Tác giả</th>
                <th className="py-3.5 px-4">Nội dung bình luận</th>
                <th className="py-3.5 px-4">Thuộc bài viết</th>
                <th className="py-3.5 px-4">Lượt thích</th>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">Không có bình luận nào.</p>
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => {
                  const isReported = reportedCommentIds.has(comment.id);
                  return (
                  <tr key={comment.id} className={`hover:bg-slate-900/50 transition-colors ${isReported ? 'bg-rose-950/20' : ''}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={comment.author.avatar}
                          alt={comment.author.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-slate-200">{comment.author.name}</div>
                          <div className="text-[10px] text-slate-500">@{comment.author.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs text-slate-300">
                      <div className="flex items-start gap-1.5">
                        {isReported && (
                          <span title="Đã bị báo cáo">
                            <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          </span>
                        )}
                        <p className="line-clamp-2">{comment.content}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 max-w-[180px] truncate">
                      {comment.postContent || `Bài #${comment.postId}`}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        <span>{comment.likes.length}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">{timeAgo(comment.createdAt)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm('Xóa bình luận này (vi phạm chính sách)?')) {
                            deleteCommentAdmin(comment.postId, comment.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                        title="Xóa bình luận"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
