import { User } from '../types';

export const XP_PER_COMPLETED_LESSON = 50;
export const XP_PER_LEVEL = 100;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function istDateKey(timestamp: number = Date.now()): string {
  return new Date(timestamp + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function nextStreak(user: Pick<User, 'streak_days' | 'last_active_date'>, now = Date.now()) {
  const today = istDateKey(now);
  const yesterday = istDateKey(now - DAY_MS);
  if (user.last_active_date === today) {
    return { streak_days: user.streak_days || 1, last_active_date: today };
  }
  const streak = user.last_active_date === yesterday ? (user.streak_days || 0) + 1 : 1;
  return { streak_days: streak, last_active_date: today };
}

// A streak is only "alive" if the student studied today or yesterday (IST).
export function currentStreak(user: Pick<User, 'streak_days' | 'last_active_date'> | null, now = Date.now()): number {
  if (!user?.last_active_date) return 0;
  const alive =
    user.last_active_date === istDateKey(now) || user.last_active_date === istDateKey(now - DAY_MS);
  return alive ? user.streak_days || 0 : 0;
}

export function xpStats(completedCount: number) {
  const xp = completedCount * XP_PER_COMPLETED_LESSON;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  return { xp, level, xpInLevel, xpToNext: XP_PER_LEVEL - xpInLevel };
}

export function classLabel(classSort?: string | null): string {
  return classSort ? `Class ${parseInt(classSort, 10)}` : 'No class selected';
}

export interface WeekDay {
  key: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

// Last 7 IST days ending today, marking the days covered by the current streak.
export function streakWeek(user: Pick<User, 'streak_days' | 'last_active_date'> | null, now = Date.now()): WeekDay[] {
  const streak = currentStreak(user, now);
  const lastActive = user?.last_active_date;
  const today = istDateKey(now);
  const days: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const ts = now - i * DAY_MS;
    const key = istDateKey(ts);
    const label = new Date(ts + IST_OFFSET_MS).toLocaleDateString('en-IN', { weekday: 'narrow', timeZone: 'UTC' });
    days.push({ key, label, active: false, isToday: key === today });
  }
  if (streak > 0 && lastActive) {
    const endIdx = days.findIndex((d) => d.key === lastActive);
    for (let i = endIdx; i >= 0 && i > endIdx - streak; i--) days[i].active = true;
  }
  return days;
}
