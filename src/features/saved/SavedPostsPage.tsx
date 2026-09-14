import React from 'react';
import { useSocial } from '../../context/SocialContext';
import { PostCard } from '../posts/PostCard';
import { Bookmark, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SavedPostsPage: React.FC = () => {
  const { posts } = useSocial();

  const savedPosts = posts.filter((p) => p.isSaved);

  return (
    <div className="w-full max-w-2xl min-w-0">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Bài viết đã lưu</h1>
              <p className="text-xs text-slate-500">
                {savedPosts.length > 0
                  ? `Bạn đã lưu ${savedPosts.length} bài viết`
                  : 'Danh sách bài viết bạn đã bookmark'}
              </p>
            </div>
          </div>
        </div>

        {/* Saved Posts List */}
        {savedPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa có bài viết nào được lưu</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Bạn có thể nhấn vào nút "Lưu bài viết" ở menu mỗi bài viết trên Bảng tin để xem lại sau bất cứ lúc nào.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Khám phá Bảng tin</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
  );
};
