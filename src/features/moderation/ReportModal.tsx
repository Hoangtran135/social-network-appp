import React, { useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { X, AlertTriangle, Check } from 'lucide-react';
import { ReportItem } from '../../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportItem['targetType'];
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS = [
  'Spam hoặc lừa đảo',
  'Ngôn từ thù ghét, xúc phạm người khác',
  'Nội dung bạo lực hoặc nguy hiểm',
  'Nội dung khiêu dâm, không phù hợp',
  'Giả mạo danh tính cá nhân/tổ chức',
  'Vi phạm bản quyền sở hữu trí tuệ',
  'Lý do khác...',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}) => {
  const { createReport } = useSocial();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReport(targetType, targetId, selectedReason, description, targetName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-slate-800 text-lg">Báo cáo vi phạm</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Đối tượng báo cáo
            </span>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 truncate">
              {targetName || `Mục ${targetType} #${targetId}`}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Lý do vi phạm
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer border transition-all ${
                    selectedReason === reason
                      ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{reason}</span>
                  {selectedReason === reason && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Chi tiết bổ sung (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cung cấp thêm thông tin để ban quản trị dễ dàng xử lý..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-rose-500 transition-all resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-colors"
            >
              Gửi báo cáo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
