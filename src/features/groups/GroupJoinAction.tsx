import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useConfirm } from '../../common/ConfirmDialogProvider';
import { Group } from '../../types';
import { Check, ChevronDown, Clock, LogOut, X, Mail } from 'lucide-react';

interface GroupJoinActionProps {
  group: Group;
  className?: string;
}

export const GroupJoinAction: React.FC<GroupJoinActionProps> = ({ group, className }) => {
  const { joinGroup, leaveGroup, acceptGroupInvite, declineGroupInvite } = useSocial();
  const confirm = useConfirm();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLeave = async () => {
    setShowMenu(false);
    if (await confirm(`Bạn có chắc muốn rời khỏi nhóm "${group.name}"?`)) {
      leaveGroup(group.id);
    }
  };

  if (group.isMember) {
    return (
      <div className={`relative ${className || ''}`} ref={menuRef}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Đã tham gia</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs font-semibold">
            <button
              onClick={handleLeave}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-rose-50 text-rose-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Rời khỏi nhóm</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (group.hasPendingInvite) {
    return (
      <div className={`flex items-center gap-1.5 ${className || ''}`}>
        <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-indigo-600">
          <Mail className="w-3.5 h-3.5" />
          Bạn được mời
        </span>
        <button
          onClick={() => acceptGroupInvite(group.id)}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
        >
          Chấp nhận
        </button>
        <button
          onClick={() => declineGroupInvite(group.id)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          title="Từ chối lời mời"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (group.hasPendingJoinRequest) {
    return (
      <button
        disabled
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold cursor-default ${className || ''}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Đã gửi yêu cầu</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => joinGroup(group.id)}
      className={`px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs ${className || ''}`}
    >
      Tham gia
    </button>
  );
};
