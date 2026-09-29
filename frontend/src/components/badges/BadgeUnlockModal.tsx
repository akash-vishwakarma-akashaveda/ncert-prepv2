import React, { useEffect, useMemo } from 'react';
import { PartyPopper, X } from 'lucide-react';
import { BadgeDef } from '../../data/badges';
import { EducationalStage, getStageConfig } from '../../data/stageThemes';
import { playCelebrationSound } from '../../services/notificationSound';

interface BadgeUnlockModalProps {
  badge: BadgeDef;
  classSort: string;
  stage: EducationalStage;
  onClose: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CONFETTI_COLORS = ['#FFC53D', '#FF7A59', '#12A594', '#3B4FE0', '#C9447F'];

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ badge, classSort, stage, onClose }) => {
  const theme = getStageConfig(classSort);
  const Icon = badge.Icon;

  useEffect(() => {
    playCelebrationSound();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 90 + Math.random() * 70;
        return {
          id: i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance - 20,
          rot: Math.round(Math.random() * 540 - 270),
          delay: Math.random() * 0.12,
          size: 6 + Math.round(Math.random() * 5),
          round: i % 2 === 0,
        };
      }),
    []
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#1E2233]/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`Badge unlocked: ${badge.name[stage]}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] bg-white rounded-[28px] border-[3px] border-[color:var(--card-line)] shadow-[0_8px_0_#E3E5EC] p-6 flex flex-col items-center text-center gap-3 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1E2233] bg-[color:var(--page)] border-2 border-[#E3E5EC] rounded-xl cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold text-white" style={{ background: theme.primaryColor }}>
          <PartyPopper className="w-3.5 h-3.5" /> Badge unlocked!
        </span>

        <div className="relative w-24 h-24 flex items-center justify-center mt-1">
          {confetti.map((c) => (
            <span
              key={c.id}
              className="absolute left-1/2 top-1/2 animate-confetti"
              style={
                {
                  width: c.size,
                  height: c.size,
                  background: c.color,
                  borderRadius: c.round ? '9999px' : '3px',
                  animationDelay: `${c.delay}s`,
                  ['--tx' as string]: `${c.tx}px`,
                  ['--ty' as string]: `${c.ty}px`,
                  ['--rot' as string]: `${c.rot}deg`,
                } as React.CSSProperties
              }
            />
          ))}
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center animate-badge-ring"
            style={
              {
                background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                ['--ring-color' as string]: hexToRgba(theme.primaryColor, 0.5),
              } as React.CSSProperties
            }
          >
            <Icon className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
        </div>

        <h2 className="font-display text-xl text-[#1E2233] mt-1">{badge.name[stage]}</h2>
        <p className="text-sm font-semibold text-[#6B7280]">{badge.hint[stage]} — done!</p>

        <button
          onClick={onClose}
          className="btn-3d mt-2 w-full p-3 rounded-2xl text-white text-sm font-extrabold cursor-pointer"
          style={{ background: theme.primaryColor, ['--edge' as string]: theme.secondaryColor } as React.CSSProperties}
        >
          Awesome!
        </button>
      </div>
    </div>
  );
};
