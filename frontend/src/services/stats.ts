import { api } from './api/client';
import { istDateKey } from '../data/gamification';

export interface DailyStats {
  date: string;
  visitors: number;
  newVisitors: number;
  activeStudents: number;
  registrations: number;
  lessonsStarted: number;
  lessonsCompleted: number;
  doubtsAsked: number;
}
export type StatCounter = Exclude<keyof DailyStats, 'date'>;
export type TotalStats = Pick<DailyStats, 'visitors' | 'registrations' | 'lessonsStarted' | 'lessonsCompleted' | 'doubtsAsked'>;

const REPORTED_KEY = 'ncert_prep_visit_reported';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: counts just won't be deduplicated locally; the server still dedupes.
  }
}

export const StatsService = {
  /**
   * Report this browser's visit once per IST day, and again once the visitor signs in that day
   * (so signed-in students are counted as active). Never throws: analytics must not break the app.
   */
  async trackVisit(uid?: string | null) {
    const day = istDateKey();
    let seen: { day: string; uids: string[] } = { day, uids: [] };
    try {
      const saved = JSON.parse(safeGet(REPORTED_KEY) || 'null');
      if (saved?.day === day) seen = saved;
    } catch {
      // corrupt value: treat as a fresh day
    }
    const newVisit = seen.uids.length === 0;
    const newActive = Boolean(uid) && !seen.uids.includes(uid!);
    if (!newVisit && !newActive) return;
    seen.uids.push(uid || 'anon');
    safeSet(REPORTED_KEY, JSON.stringify(seen));

    try {
      await api.post('/api/stats/track-visit');
    } catch (err) {
      console.warn('Visit not recorded', err);
    }
  },

  /** Last `days` IST days, oldest first, with missing days filled as zero. */
  async getDaily(days = 30): Promise<DailyStats[]> {
    try {
      return await api.get<DailyStats[]>(`/api/stats/daily?days=${days}`);
    } catch (err) {
      console.warn('Failed to load daily stats:', err);
      return [];
    }
  },

  async getTotals(): Promise<TotalStats> {
    const zero: TotalStats = { visitors: 0, registrations: 0, lessonsStarted: 0, lessonsCompleted: 0, doubtsAsked: 0 };
    try {
      return { ...zero, ...(await api.get<Partial<TotalStats>>('/api/stats/totals')) };
    } catch (err) {
      console.warn('Failed to load total stats:', err);
      return zero;
    }
  },
};
