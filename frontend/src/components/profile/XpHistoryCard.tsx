import React, { useState } from 'react';
import {
  Sparkles,
  BookOpenCheck,
  Timer,
  Flame,
  RotateCcw,
  Star,
  Award,
  TrendingUp,
  History,
  Calendar,
} from 'lucide-react';
import { XpTransaction, XpSourceType } from '../../types';
import { XP_PER_LEVEL, classLabel } from '../../data/gamification';

interface XpHistoryCardProps {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpToNext: number;
  history: XpTransaction[];
  activeClass?: string;
  className?: string;
}

const TYPE_CONFIG: Record<
  XpSourceType,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  lesson_completed: {
    label: 'Lesson Completed',
    icon: BookOpenCheck,
    color: '#0C8F78',
    bg: '#E7F7F1',
    border: '#A9E6D3',
  },
  lesson_uncompleted: {
    label: 'Completion Removed',
    icon: RotateCcw,
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  focus_session: {
    label: 'Focus Timer',
    icon: Timer,
    color: '#1E7FCB',
    bg: '#E0F1FF',
    border: '#BAE6FD',
  },
  streak_bonus: {
    label: 'Daily Streak',
    icon: Flame,
    color: '#E0603F',
    bg: '#FFE8E0',
    border: '#FFD4BE',
  },
  notes_revision: {
    label: 'Notes Revision',
    icon: Star,
    color: '#8B5CF6',
    bg: '#F3E8FF',
    border: '#DDD6FE',
  },
  doubt_asked: {
    label: 'Doubt Asked',
    icon: Sparkles,
    color: '#EC4899',
    bg: '#FCE7F3',
    border: '#FBCFE8',
  },
  welcome_bonus: {
    label: 'Welcome Bonus',
    icon: Award,
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

export const XpHistoryCard: React.FC<XpHistoryCardProps> = ({
  totalXp,
  level,
  xpInLevel,
  xpToNext,
  history,
  activeClass,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'lessons' | 'focus' | 'streak'>('all');

  const filteredHistory = history.filter((tx) => {
    if (filter === 'lessons') return tx.type === 'lesson_completed' || tx.type === 'lesson_uncompleted';
    if (filter === 'focus') return tx.type === 'focus_session';
    if (filter === 'streak') return tx.type === 'streak_bonus';
    return true;
  });

  // Analytics totals
  const totalLessonsXp = history
    .filter((t) => t.type === 'lesson_completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFocusXp = history
    .filter((t) => t.type === 'focus_session')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalStreakXp = history
    .filter((t) => t.type === 'streak_bonus')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <section
      aria-label="XP credit history and balance ledger"
      className={`bg-white border-[3px] border-[color:var(--card-line)] rounded-[26px] p-5 sm:p-6 space-y-5 ${className}`}
    >
      {/* Header with Total Balance Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-[#E3E5EC]">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-[16px] bg-[#FFF0CF] text-[#B87A06] flex items-center justify-center font-display border-2 border-[#FFD97A] shadow-sm">
            <Award className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-display text-[#1E2233]">
                {activeClass ? `${classLabel(activeClass)} XP history` : 'XP history'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E7F7F1] border border-[#A9E6D3] text-[#0B7A67] text-[11px] font-black">
                {activeClass ? `${classLabel(activeClass)} only` : 'All classes'}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#6B7280]">
              {activeClass
                ? `Every XP you earned in ${classLabel(activeClass)}. Changing class starts a separate tally.`
                : 'Every XP you earned from lessons, focus blocks and streaks.'}
            </p>
          </div>
        </div>

        {/* Big Balance Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-[#F9FAFD] border-2 border-[#E3E5EC] rounded-[20px] p-2.5 px-4">
          <div className="text-right">
            <span className="block text-[10px] font-black uppercase tracking-wider text-[#6B7280]">TOTAL BALANCE</span>
            <span className="font-display text-2xl text-[#1E2233] leading-none">{totalXp} XP</span>
          </div>
          <div className="h-8 w-0.5 bg-[#E3E5EC]" />
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-[#12A594]">LEVEL</span>
            <span className="font-display text-xl text-[#12A594] leading-none">Lv {level}</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar Banner */}
      <div className="rounded-[20px] bg-gradient-to-br from-[#FFFBF0] to-[#FFF6E2] border-2 border-[#FFD97A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0 max-w-md">
          <div className="flex items-center justify-between text-xs font-black text-[#8A5A14]">
            <span>Level {level} Progress</span>
            <span>{xpInLevel} / {XP_PER_LEVEL} XP ({xpToNext} XP to Level {level + 1})</span>
          </div>
          <div className="h-3 rounded-full bg-[#FFE7B5] overflow-hidden border border-[#FFD97A]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFC53D] to-[#E0A81F] transition-all duration-500"
              style={{ width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-xs font-extrabold text-[#8A5A14] flex items-center gap-1.5 shrink-0">
          <TrendingUp className="w-4 h-4 text-[#E0A81F]" />
          <span>Every 100 XP levels you up!</span>
        </div>
      </div>

      {/* Category Breakdown Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl p-3 bg-[#F9FAFD] border-2 border-[#E3E5EC] flex flex-col gap-1">
          <span className="text-[10.5px] font-black text-[#6B7280] uppercase tracking-wide flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Total Events
          </span>
          <span className="font-display text-lg text-[#1E2233]">{history.length}</span>
        </div>

        <div className="rounded-2xl p-3 bg-[#E7F7F1]/60 border-2 border-[#A9E6D3] flex flex-col gap-1">
          <span className="text-[10.5px] font-black text-[#0B7A67] uppercase tracking-wide flex items-center gap-1">
            <BookOpenCheck className="w-3.5 h-3.5" /> Lessons XP
          </span>
          <span className="font-display text-lg text-[#0B7A67]">+{totalLessonsXp} XP</span>
        </div>

        <div className="rounded-2xl p-3 bg-[#E0F1FF]/60 border-2 border-[#BAE6FD] flex flex-col gap-1">
          <span className="text-[10.5px] font-black text-[#0369A1] uppercase tracking-wide flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" /> Focus XP
          </span>
          <span className="font-display text-lg text-[#0369A1]">+{totalFocusXp} XP</span>
        </div>

        <div className="rounded-2xl p-3 bg-[#FFE8E0]/60 border-2 border-[#FFD4BE] flex flex-col gap-1">
          <span className="text-[10.5px] font-black text-[#E0603F] uppercase tracking-wide flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Streak XP
          </span>
          <span className="font-display text-lg text-[#E0603F]">+{totalStreakXp} XP</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'lessons', label: 'Lessons (+50)' },
            { id: 'focus', label: 'Focus (+25)' },
            { id: 'streak', label: 'Streaks (+20)' },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer border-2 ${
                  active
                    ? 'bg-[#1E2233] text-white border-[#1E2233]'
                    : 'bg-white text-[#6B7280] border-[#E3E5EC] hover:bg-[#F1F3FB]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs font-bold text-[#6B7280]">
          Showing {filteredHistory.length} transaction{filteredHistory.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredHistory.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-[#F9FAFD] border-2 border-dashed border-[#E3E5EC] p-6 space-y-2">
            <History className="w-8 h-8 text-[#9AA1B4] mx-auto" />
            <p className="font-display text-sm text-[#1E2233]">No transactions found</p>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Complete lessons or run the 25-minute Pomodoro focus timer to record your first XP credits!
            </p>
          </div>
        ) : (
          filteredHistory.map((tx) => {
            const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.lesson_completed;
            const Icon = config.icon;
            const isPositive = tx.amount >= 0;

            return (
              <div
                key={tx.id}
                className="rounded-2xl p-3 sm:p-3.5 border-2 border-[#E3E5EC] hover:border-[#CBD5E1] bg-white transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ background: config.bg, borderColor: config.border, color: config.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-extrabold text-[#1E2233] truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#9AA1B4]" />
                        {formatDate(tx.timestamp)}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-[#4B5168]">{config.label}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 font-display text-sm sm:text-base px-2.5 py-1 rounded-xl border ${
                      isPositive
                        ? 'bg-[#E7F7F1] text-[#0B7A67] border-[#A9E6D3]'
                        : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                    }`}
                  >
                    {isPositive ? `+${tx.amount}` : tx.amount} XP
                  </span>
                  <span className="block text-[10px] font-bold text-[#9AA1B4] mt-0.5">
                    Bal: {tx.balanceAfter} XP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
