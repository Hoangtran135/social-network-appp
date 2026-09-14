import React from 'react';
import { useSocial } from '../context/SocialContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useSocial();

  if (!toast) return null;

  const bgStyles = {
    success: 'bg-emerald-600 text-white shadow-emerald-500/30',
    error: 'bg-rose-600 text-white shadow-rose-500/30',
    info: 'bg-slate-900 text-white shadow-slate-500/30',
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[toast.type];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 left-4 sm:left-auto z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-xl shadow-xl font-medium text-sm border border-white/10 ${bgStyles}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <span className="leading-snug">{toast.message}</span>
      </div>
    </div>
  );
};
