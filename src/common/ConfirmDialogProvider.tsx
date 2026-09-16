import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Styles the confirm button as a destructive action (red). Defaults to true. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  return ctx;
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(typeof opts === 'string' ? { message: opts } : opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolveRef.current(result);
    setOptions(null);
  };

  const danger = options?.danger ?? true;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className={`flex items-center gap-2.5 ${danger ? 'text-rose-600' : 'text-blue-600'}`}>
              {danger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              <h3 className="font-bold text-slate-800 text-base">{options.title || 'Xác nhận'}</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{options.message}</p>
            <div className="flex gap-2 pt-5">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
              >
                {options.cancelText || 'Hủy'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-colors ${
                  danger
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {options.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};
