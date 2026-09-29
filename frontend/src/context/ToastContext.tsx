import React, { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { playNotificationSound } from '../services/notificationSound';

export interface AppToast {
  id: string;
  title: string;
  message: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  actionUrl?: string;
}

interface ToastContextType {
  pushToast: (toast: Omit<AppToast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DISMISS_MS = 6000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const navigate = useNavigate();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<AppToast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      playNotificationSound();
      window.setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:top-20 z-[100] flex flex-col gap-2.5 sm:w-[360px] pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto bg-white rounded-[20px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line),0_14px_30px_rgba(30,34,51,0.18)] p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-200 cursor-pointer"
              onClick={() => {
                dismiss(t.id);
                if (t.actionUrl) navigate(t.actionUrl);
              }}
            >
              <div className={`w-9 h-9 rounded-[12px] ${t.iconBg} ${t.iconColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold text-[#1E2233] leading-snug line-clamp-2">{t.title}</p>
                <p className="text-[11.5px] font-semibold text-[#6B7280] mt-0.5 line-clamp-2 leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
                aria-label="Dismiss"
                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[#9AA1B4] hover:bg-[color:var(--page)] hover:text-[#1E2233] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useAppToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useAppToast must be used within a ToastProvider');
  return ctx;
};
