import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { SidebarRight } from '../../layout/SidebarRight';
import { StoryTray } from '../stories/StoryTray';
import { CreatePostBox } from '../posts/CreatePostBox';
import { PostCard } from '../posts/PostCard';
import { MessageSquareDashed, Filter, Loader2 } from 'lucide-react';
import { MainLayoutContext } from '../../layout/MainLayout';

type FeedFilter = 'all' | 'friends' | 'groups';

export const FeedPage: React.FC = () => {
  const { posts, friends, hasMorePosts, isLoadingMorePosts, loadMorePosts } = useSocial();
  const { currentUser } = useAuth();
  const outletContext = useOutletContext<MainLayoutContext>();

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // Feed is the only page that fills the layout's reserved right column
  useEffect(() => {
    outletContext?.setRightPanel(<SidebarRight />);
    return () => outletContext?.setRightPanel(null);
  }, []);

  // Infinite scroll: fetch the next page of posts once the sentinel scrolls into view
  const handleIntersect = useCallback<IntersectionObserverCallback>(
    (entries) => {
      if (entries[0]?.isIntersecting) loadMorePosts();
    },
    [loadMorePosts]
  );

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const friendIds = friends.map((f) => f.id);

  // Filter posts — wall posts (posted on someone else's profile) only show on that profile, not in the main feed
  const filteredPosts = posts.filter((p) => {
    if (p.wallOwnerId) return false;
    if (activeFilter === 'friends') {
      return friendIds.includes(p.author.id) || p.author.id === currentUser?.id;
    }
    if (activeFilter === 'groups') {
      return !!p.groupId;
    }
    return true;
  });

  const handleOpenCreatePost = () => {
    if (outletContext?.openCreatePost) {
      outletContext.openCreatePost();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto xl:mx-0 min-w-0">
      <StoryTray />
      <CreatePostBox onClick={handleOpenCreatePost} />

      {/* Filter Navigation Tabs */}
      <div className="card p-2 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveFilter('all')} className={activeFilter === 'all' ? 'btn-tab--active' : 'btn-tab'}>
            Tất cả bài viết
          </button>

          <button onClick={() => setActiveFilter('friends')} className={activeFilter === 'friends' ? 'btn-tab--active' : 'btn-tab'}>
            Bạn bè
          </button>

          <button onClick={() => setActiveFilter('groups')} className={activeFilter === 'groups' ? 'btn-tab--active' : 'btn-tab'}>
            Nhóm cộng đồng
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1 pr-3">
          <Filter className="w-3.5 h-3.5" />
          <span>{filteredPosts.length} bài viết</span>
        </div>
      </div>

      {/* Posts Stream */}
      {filteredPosts.length === 0 ? (
        <div className="card--empty">
          <div className="empty-icon bg-blue-50 text-blue-600">
            <MessageSquareDashed className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có bài viết nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Hãy là người đầu tiên chia sẻ cảm xúc, hình ảnh hoặc câu chuyện của bạn đến mọi người!
          </p>
          <button onClick={handleOpenCreatePost} className="btn-primary">
            + Đăng bài ngay
          </button>
        </div>
      ) : (
        <>
          {filteredPosts.map((post) => <PostCard key={post.id} post={post} />)}

          {/* Infinite scroll trigger + loading state */}
          <div ref={loadMoreSentinelRef} className="h-1" />
          {isLoadingMorePosts && (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!hasMorePosts && filteredPosts.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-6">Bạn đã xem hết bài viết.</p>
          )}
        </>
      )}
    </div>
  );
};
