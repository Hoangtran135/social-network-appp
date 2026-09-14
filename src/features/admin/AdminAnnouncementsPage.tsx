import React, { useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { timeAgo } from '../../utils/time';
import {
  BellRing,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { SystemAnnouncement } from '../../types';

export const AdminAnnouncementsPage: React.FC = () => {
  const { systemAnnouncements, createAnnouncement, deleteAnnouncement } = useSocial();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SystemAnnouncement['type']>('info');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    createAnnouncement(title.trim(), message.trim(), type);
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Thông Báo Hệ Thống</h1>
          </div>
          <p className="text-xs text-slate-400">
            Tạo và phát đi các thông báo bảo trì, sự kiện hoặc cảnh báo an ninh tới người dùng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold font-mono">
            Đã phát: {systemAnnouncements.length} thông báo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Create Announcement */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
          <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Tạo thông báo mới</span>
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tiêu đề
              </label>
              <input
                type="text"
                placeholder="Nhập tiêu đề thông báo..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Loại thông báo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SystemAnnouncement['type'])}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
              >
                <option value="info">Thông tin chung (Info)</option>
                <option value="warning">Cảnh báo (Warning)</option>
                <option value="alert">Khẩn cấp (Alert)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nội dung chi tiết
              </label>
              <textarea
                rows={5}
                placeholder="Nhập nội dung thông báo gửi đến người dùng..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!title.trim() || !message.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi thông báo toàn mạng</span>
            </button>
          </form>
        </div>

        {/* List of Announcements */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-200 px-1">
            Danh sách thông báo đã phát ({systemAnnouncements.length})
          </h2>

          {systemAnnouncements.length === 0 ? (
            <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
              <BellRing className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">Chưa có thông báo hệ thống nào được gửi.</p>
            </div>
          ) : (
            systemAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-slate-700 transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 ${
                      ann.type === 'alert'
                        ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                        : ann.type === 'warning'
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/80'
                        : 'bg-blue-950/80 text-blue-400 border border-blue-800/80'
                    }`}
                  >
                    {ann.type === 'alert' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : ann.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-200">{ann.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ann.type === 'alert'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : ann.type === 'warning'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {ann.type.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-2 whitespace-pre-wrap">
                      {ann.message}
                    </p>

                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>Người tạo: {ann.createdBy}</span>
                      <span>•</span>
                      <span>{timeAgo(ann.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Xóa thông báo hệ thống này?')) deleteAnnouncement(ann.id);
                  }}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  title="Xóa thông báo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
