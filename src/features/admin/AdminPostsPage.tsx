import React, { useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { timeAgo } from '../../utils/time';
import {
  FileText,
  Search,
  Trash2,
  Heart,
  MessageSquare,
  Share2,
  Image as ImageIcon,
  Lock,
  Globe,
  Users,
} from 'lucide-react';
import { useConfirm } from '../../common/ConfirmDialogProvider';

export const AdminPostsPage: React.FC = () => {
  const { posts, deletePostAdmin } = useSocial();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<'all' | 'feed' | 'groups'>('all');

  const filteredPosts = posts.filter((p) => {
    const matchSearch =
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.author.name.toLowerCase().includes(search.toLowerCase());
    const matchType =
      filterGroup === 'all'
        ? true
        : filterGroup === 'groups'
        ? !!p.groupId
        : !p.groupId;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Quản lý Bài Viết</h1>
          </div>
          <p className="text-xs text-slate-400">
            Kiểm duyệt nội dung bài đăng, xóa bài viết vi phạm tiêu chuẩn cộng đồng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold font-mono">
            Tổng: {posts.length} bài viết
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, tác giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterGroup('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterGroup === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({posts.length})
          </button>
          <button
            onClick={() => setFilterGroup('feed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterGroup === 'feed'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Trang cá nhân ({posts.filter((p) => !p.groupId).length})
          </button>
          <button
            onClick={() => setFilterGroup('groups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterGroup === 'groups'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Trong nhóm ({posts.filter((p) => !!p.groupId).length})
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-xs">Không tìm thấy bài viết nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-700 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm text-slate-200">{post.author.name}</span>
                    <span className="text-xs text-slate-500">@{post.author.username}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">{timeAgo(post.createdAt)}</span>

                    {post.groupName && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                        Nhóm: {post.groupName}
                      </span>
                    )}

                    <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {post.privacy === 'public' ? (
                        <Globe className="w-3 h-3 text-blue-400" />
                      ) : post.privacy === 'friends' ? (
                        <Users className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Lock className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{post.privacy}</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed mb-3">
                    {post.content}
                  </p>

                  {/* Media Indicator */}
                  {post.images && post.images.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 text-[11px] font-medium border border-slate-800">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span>{post.images.length} hình ảnh đính kèm</span>
                      </span>
                    </div>
                  )}

                  {/* Interaction Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>{post.reactions.length} cảm xúc</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>{post.commentsCount} bình luận</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{post.sharesCount} chia sẻ</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4 justify-end">
                <button
                  onClick={async () => {
                    if (await confirm('Xóa bài viết này do vi phạm chính sách cộng đồng?')) deletePostAdmin(post.id);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-bold transition-colors"
                  title="Xóa bài viết vi phạm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Gỡ bài viết</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
