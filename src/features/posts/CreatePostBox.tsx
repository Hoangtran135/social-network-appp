import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Image, Smile } from 'lucide-react';

interface CreatePostBoxProps {
  onClick: () => void;
  groupName?: string;
  placeholder?: string;
}

export const CreatePostBox: React.FC<CreatePostBoxProps> = ({ onClick, groupName, placeholder }) => {
  const { currentUser } = useAuth();

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-sm transition-shadow mb-5">
      <div className="flex items-center gap-3">
        <img
          src={currentUser?.avatar}
          alt={currentUser?.name}
          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
        />
        <button
          type="button"
          onClick={onClick}
          className="flex-1 min-w-0 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full text-slate-500 text-sm font-medium transition-colors truncate"
        >
          {groupName
            ? `Viết bài thảo luận trong ${groupName}...`
            : placeholder || `${currentUser?.name} ơi, bạn đang nghĩ gì thế?`}
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 pt-3 mt-3 border-t border-slate-100 text-slate-600">
        <button
          onClick={onClick}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-slate-100 active:scale-[0.98] text-xs sm:text-sm font-semibold transition-all"
        >
          <Image className="w-5 h-5 text-emerald-500" />
          <span>Ảnh / Video</span>
        </button>

        <button
          onClick={onClick}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-slate-100 active:scale-[0.98] text-xs sm:text-sm font-semibold transition-all"
        >
          <Smile className="w-5 h-5 text-amber-500" />
          <span>Cảm xúc / Hoạt động</span>
        </button>
      </div>
    </div>
  );
};
