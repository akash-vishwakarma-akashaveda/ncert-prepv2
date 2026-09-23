import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2, X, GripHorizontal, Coffee, Target, Trees } from 'lucide-react';
import { FocusMode, FocusTimer } from '../../student/useFocusTimer';

/** Label, ring colour and icon per timer mode; shared with the Focus page. */
export const FOCUS_MODE_STYLE: Record<FocusMode, { label: string; ring: string; soft: string; Icon: React.ElementType }> = {
  focus: { label: 'Focus', ring: 'var(--ring)', soft: 'var(--ring-soft)', Icon: Target },
  short: { label: 'Short break', ring: '#1E7FCB', soft: '#E0F1FF', Icon: Coffee },
  long: { label: 'Long break', ring: '#7652DB', soft: '#ECE7FE', Icon: Trees },
};

const MARGIN = 12;
const iconBtn =
  'w-8 h-8 rounded-xl flex items-center justify-center text-[#6B7280] hover:text-[#1E2233] hover:bg-[color:var(--page)] cursor-pointer transition-colors';

export const FloatingPomodoroWidget: React.FC<{ timer: FocusTimer }> = ({ timer }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const widgetRef = useRef<HTMLDivElement>(null);
  // null = docked bottom-right (above the phone nav); set once the student drags it.
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = (x: number, y: number) => {
    const el = widgetRef.current;
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;
    return {
      x: Math.min(Math.max(MARGIN, x), window.innerWidth - w - MARGIN),
      y: Math.min(Math.max(MARGIN, y), window.innerHeight - h - MARGIN),
    };
  };

  useEffect(() => {
    const onResize = () => setPosition((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-clamp when the widget changes size (pill <-> card) so it never ends up off screen.
  useEffect(() => {
    setPosition((p) => (p ? clamp(p.x, p.y) : p));
  }, [timer.isMinimized]);

  if (!timer.isFloating || location.pathname === '/app/focus') return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = widgetRef.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current) setPosition(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const dragProps = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  const style = FOCUS_MODE_STYLE[timer.mode];
  const progress = timer.total ? Math.min(1, Math.max(0, 1 - timer.secondsLeft / timer.total)) : 0;
  const placement: React.CSSProperties = position ? { left: position.x, top: position.y } : {};
  const docked = position ? '' : 'right-4 bottom-24 md:bottom-6';

  if (timer.isMinimized) {
    return (
      <div
        ref={widgetRef}
        style={placement}
        {...dragProps}
        className={`fixed z-50 ${docked} select-none touch-none flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 rounded-full bg-white border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line),0_12px_28px_rgba(30,34,51,0.18)] cursor-grab active:cursor-grabbing`}
      >
        <button
          onClick={timer.toggleMinimized}
          aria-label={`${style.label} timer, ${timer.label} left. Expand`}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full cursor-pointer"
        >
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: style.soft, color: style.ring }}>
            <style.Icon className="w-4 h-4" />
          </span>
          <span className="font-display text-lg tabular-nums text-[#1E2233]">{timer.label}</span>
        </button>
        <button
          onClick={timer.toggle}
          aria-label={timer.running ? 'Pause' : 'Start'}
          className="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer"
          style={{ background: style.ring }}
        >
          {timer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>
        <button onClick={() => timer.setIsFloating(false)} aria-label="Hide mini timer" className={iconBtn}>
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      style={placement}
      role="region"
      aria-label="Mini focus timer"
      className={`fixed z-50 ${docked} w-[272px] select-none bg-white rounded-[22px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line),0_16px_36px_rgba(30,34,51,0.2)] overflow-hidden`}
    >
      <div {...dragProps} className="flex items-center justify-between gap-2 pl-3 pr-1.5 py-1.5 bg-[color:var(--page)] border-b-2 border-[color:var(--card-line)] touch-none cursor-grab active:cursor-grabbing">
        <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em]" style={{ color: style.ring }}>
          <GripHorizontal className="w-4 h-4 text-[#9AA1B4]" aria-hidden="true" />
          {style.label.toUpperCase()} · {timer.cycleStep}/4
        </span>
        <span className="flex items-center">
          <button onClick={timer.toggleMinimized} aria-label="Shrink to a small pill" className={iconBtn}>
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/app/focus')} aria-label="Open the Focus page" className={iconBtn}>
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={() => timer.setIsFloating(false)} aria-label="Hide mini timer" className={iconBtn}>
            <X className="w-4 h-4" />
          </button>
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3.5">
        {timer.currentTask && <p className="text-xs font-bold text-[#4B5168] truncate">Studying: {timer.currentTask}</p>}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[40px] leading-none tabular-nums text-[#1E2233]">{timer.label}</p>
            <p className="mt-1 text-[11px] font-extrabold text-[#6B7280]">{timer.running ? 'Running' : 'Paused'}</p>
          </div>
          <div className="relative w-14 h-14 shrink-0" aria-hidden="true">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="4" style={{ stroke: style.soft }} />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${progress * 100} 100`}
                style={{ stroke: style.ring }}
                className="transition-[stroke-dasharray] duration-500 ease-linear"
              />
            </svg>
            <style.Icon className="absolute inset-0 m-auto w-5 h-5" style={{ color: style.ring }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={timer.toggle}
            disabled={timer.secondsLeft === 0}
            className="btn-3d flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-2xl text-sm font-extrabold text-white cursor-pointer disabled:opacity-50 [--edge:var(--brand-edge)] bg-[color:var(--brand)]"
          >
            {timer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            {timer.running ? 'Pause' : 'Start'}
          </button>
          <button onClick={timer.skipNext} aria-label="Skip to the next block" title="Skipped blocks don't earn XP" className={`${iconBtn} w-10 h-10 border-2 border-[color:var(--card-line)]`}>
            <SkipForward className="w-4 h-4" />
          </button>
          <button onClick={timer.reset} aria-label="Reset timer" className={`${iconBtn} w-10 h-10 border-2 border-[color:var(--card-line)]`}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
