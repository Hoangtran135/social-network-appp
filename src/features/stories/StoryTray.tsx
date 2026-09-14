import React, { useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useAuth } from '../auth/AuthContext';
import { Plus } from 'lucide-react';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';

export const StoryTray: React.FC = () => {
  const { stories } = useSocial();
  const { currentUser } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  return (
    <div className="mb-5">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {/* Create Story Card */}
        <div
          onClick={() => setIsCreateOpen(true)}
          className="relative w-28 sm:w-32 h-44 sm:h-48 rounded-2xl overflow-hidden shrink-0 cursor-pointer group shadow-xs bg-white border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="h-3/4 overflow-hidden bg-slate-200">
            <img
              src={currentUser?.avatar}
              alt="Me"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="h-1/4 bg-white flex flex-col items-center justify-center relative px-1 pb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center absolute -top-4 shadow-sm group-hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 mt-2 truncate w-full text-center">
              Tạo tin
            </span>
          </div>
        </div>

        {/* Friend Story Cards */}
        {stories.map((story, index) => {
          const hasViewed = story.viewers.some((v) => v.userId === currentUser?.id);
          return (
            <div
              key={story.id}
              onClick={() => setSelectedStoryIndex(index)}
              className="relative w-28 sm:w-32 h-44 sm:h-48 rounded-2xl overflow-hidden shrink-0 cursor-pointer group shadow-xs hover:shadow-md transition-all"
            >
              {/* Background preview */}
              {story.type === 'text' ? (
                <div
                  className={`w-full h-full bg-gradient-to-br ${story.backgroundGradient} flex items-center justify-center p-3 text-center text-white`}
                >
                  <p className="text-[11px] font-bold line-clamp-4 drop-shadow-xs">
                    {story.textContent}
                  </p>
                </div>
              ) : (
                <img
                  src={story.mediaUrl}
                  alt={story.user.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

              {/* Author Avatar with Ring */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <img
                  src={story.user.avatar}
                  alt={story.user.name}
                  className={`w-9 h-9 rounded-full object-cover border-2 ${
                    hasViewed ? 'border-slate-400' : 'border-blue-500 ring-2 ring-blue-400/50'
                  }`}
                />
              </div>

              {/* Author Name */}
              <div className="absolute bottom-2.5 inset-x-2 z-10">
                <span className="text-xs font-bold text-white drop-shadow-md truncate block">
                  {story.user.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Story Viewer Modal */}
      {selectedStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={selectedStoryIndex}
          isOpen={true}
          onClose={() => setSelectedStoryIndex(null)}
        />
      )}
    </div>
  );
};
