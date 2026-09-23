import React, { useCallback, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const inputClass =
  'w-full px-3.5 py-2.5 text-sm font-semibold border-2 border-[#E3E5EC] rounded-[14px] bg-[#F7F8FC] text-[#1E2233] focus:border-[#3B4FE0] focus:bg-white outline-none disabled:bg-[#F5F6FA] disabled:text-[#6B7280]';

export const primaryButton =
  'btn-3d [--edge:#2A3BB8] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12.5px] font-extrabold text-white bg-[#3B4FE0] hover:bg-[#3446D6] rounded-[14px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const secondaryButton =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-extrabold text-[#4B5168] bg-white border-2 border-[#E3E5EC] hover:bg-[#F7F8FC] rounded-[14px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const dangerButton =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-extrabold text-[#C24A2C] bg-[#FFE9E2] border-2 border-[#FFC3B1] hover:bg-[#FFDCD0] rounded-[14px] transition-colors cursor-pointer disabled:opacity-50';

export type Notify = (text: string, type?: 'success' | 'error') => void;

export function useToast() {
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error'; id: number } | null>(null);
  const notify: Notify = useCallback((text, type = 'success') => {
    const id = Date.now();
    setToast({ text, type, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4500);
  }, []);

  const node = toast ? (
    <div
      role="status"
      className={`fixed bottom-24 sm:bottom-8 right-4 left-4 sm:left-auto sm:max-w-sm z-[60] p-4 rounded-[20px] border-[3px] text-sm font-bold flex items-start gap-2.5 animate-pop-soft ${
        toast.type === 'success'
          ? 'bg-[#E7F7F1] text-[#0B5E50] border-[#A9E6D3] shadow-[0_5px_0_#A9E6D3]'
          : 'bg-[#FFE9E2] text-[#8A2E17] border-[#FFC3B1] shadow-[0_5px_0_#FFC3B1]'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      )}
      <span className="flex-1">{toast.text}</span>
      <button onClick={() => setToast(null)} aria-label="Dismiss" className="cursor-pointer text-slate-500">
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  return { notify, toastNode: node };
}

export const SectionHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
    <div>
      <h2 className="text-[22px] text-[#1E2233]">{title}</h2>
      {description && <p className="text-[12.5px] font-semibold text-[#6B7280] mt-0.5 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white border-[3px] border-[#EDEFF6] rounded-[24px] ${className}`}>{children}</div>
);

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'indigo' | 'teal' | 'amber' | 'rose' | 'slate';
  onClick?: () => void;
}> = ({ label, value, hint, tone = 'slate', onClick }) => {
  const toneClass = {
    indigo: 'text-[#3B4FE0]',
    teal: 'text-[#12A594]',
    amber: 'text-[#C98A0E]',
    rose: 'text-[#E0603F]',
    slate: 'text-[#1E2233]',
  }[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white p-[17px] rounded-[22px] border-[3px] border-[#EDEFF6] shadow-[0_5px_0_#EDEFF6] flex flex-col gap-1 ${
        onClick ? 'hover:border-[#C7CDF8] hover:shadow-[0_5px_0_#C7CDF8] transition-colors cursor-pointer' : ''
      }`}
    >
      <p className={`font-display text-[27px] leading-none ${toneClass}`}>{value}</p>
      <p className="text-[10.5px] font-extrabold tracking-[0.05em] text-[#6B7280] uppercase">{label}</p>
      {hint && <p className="text-[11px] font-bold text-[#9AA1B4]">{hint}</p>}
    </Tag>
  );
};

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  body,
  action,
}) => (
  <div className="py-12 px-6 text-center space-y-2">
    <div className="w-12 h-12 mx-auto rounded-[16px] bg-[#EEF0FE] text-[#3B4FE0] flex items-center justify-center">{icon}</div>
    <p className="font-display text-base text-[#1E2233]">{title}</p>
    {body && <p className="text-xs font-semibold text-[#6B7280] max-w-md mx-auto">{body}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-[27px] w-12 shrink-0 cursor-pointer rounded-full p-[3px] transition-colors disabled:opacity-50 ${
      checked ? 'bg-[#12A594]' : 'bg-[#D7DCEF]'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-[21px] w-[21px] transform rounded-full bg-white transition ${
        checked ? 'translate-x-[21px]' : 'translate-x-0'
      }`}
    />
  </button>
);

export const Modal: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  subtitle,
  onClose,
  children,
  wide,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2233]/60 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    onClick={onClose}
  >
    <div
      className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col bg-white rounded-[28px] border-[3px] border-[#EDEFF6] shadow-[0_8px_0_#E3E5EC] overflow-hidden animate-pop-soft`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-6 pt-5 pb-4 border-b-2 border-[#EDEFF6] flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl text-[#1E2233]">{title}</h3>
          {subtitle && <p className="text-xs font-semibold text-[#6B7280]">{subtitle}</p>}
        </div>
        <button onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F5F6FA] border-2 border-[#E3E5EC] text-[#6B7280] hover:text-[#1E2233] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto">{children}</div>
    </div>
  </div>
);

export function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
