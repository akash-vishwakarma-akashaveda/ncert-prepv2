import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, isFirebaseConfigured } from './firebase';
import { istDateKey } from '../data/gamification';

/** One IST day of platform analytics (stats_daily/{YYYY-MM-DD}); written only by Cloud Functions in live mode. */
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

const COUNTERS: StatCounter[] = ['visitors', 'newVisitors', 'activeStudents', 'registrations', 'lessonsStarted', 'lessonsCompleted', 'doubtsAsked'];
const VISITOR_KEY = 'ncert_prep_visitor_id';
const REPORTED_KEY = 'ncert_prep_visit_reported';
const DEMO_KEY = 'ncert_prep_demo_stats';

const emptyDay = (date: string): DailyStats =>
  Object.fromEntries([['date', date], ...COUNTERS.map((c) => [c, 0])]) as unknown as DailyStats;

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

/** Random, anonymous id for this browser. No personal data; lets the server count unique visitors. */
function visitorId(): string {
  let id = safeGet(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    safeSet(VISITOR_KEY, id);
  }
  return id;
}

// ---- demo mode: counters live in this browser so the admin dashboard has something to show ----
type DemoStats = { days: Record<string, DailyStats>; totals: TotalStats };
function readDemo(): DemoStats {
  try {
    return JSON.parse(safeGet(DEMO_KEY) || '') as DemoStats;
  } catch {
    return { days: {}, totals: { visitors: 0, registrations: 0, lessonsStarted: 0, lessonsCompleted: 0, doubtsAsked: 0 } };
  }
}
/** Demo-mode stand-in for the Cloud Function triggers. No-op when Firebase is configured. */
export function bumpDemoStat(counter: StatCounter, by = 1) {
  if (isFirebaseConfigured) return;
  const s = readDemo();
  const day = istDateKey();
  const d = (s.days[day] ||= emptyDay(day));
  d[counter] += by;
  if (counter in s.totals) s.totals[counter as keyof TotalStats] += by;
  safeSet(DEMO_KEY, JSON.stringify(s));
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

    if (!isFirebaseConfigured || !functions) {
      if (newVisit) bumpDemoStat('visitors');
      if (newActive) bumpDemoStat('activeStudents');
      return;
    }
    try {
      await httpsCallable(functions, 'trackVisit')({ visitorId: visitorId() });
    } catch (err) {
      console.warn('Visit not recorded', err);
    }
  },

  /** Last `days` IST days, oldest first, with missing days filled as zero. */
  async getDaily(days = 30): Promise<DailyStats[]> {
    const byDate = new Map<string, DailyStats>();
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(query(collection(db, 'stats_daily'), orderBy(documentId(), 'desc'), limit(days)));
      snap.forEach((d) => byDate.set(d.id, { ...emptyDay(d.id), ...(d.data() as Partial<DailyStats>), date: d.id }));
    } else {
      Object.values(readDemo().days).forEach((d) => byDate.set(d.date, { ...emptyDay(d.date), ...d }));
    }
    return Array.from({ length: days }, (_, i) => {
      const date = istDateKey(Date.now() - (days - 1 - i) * 86400000);
      return byDate.get(date) || emptyDay(date);
    });
  },

  async getTotals(): Promise<TotalStats> {
    const zero: TotalStats = { visitors: 0, registrations: 0, lessonsStarted: 0, lessonsCompleted: 0, doubtsAsked: 0 };
    if (isFirebaseConfigured && db) {
      const snap = await getDoc(doc(db, 'stats', 'totals'));
      return { ...zero, ...(snap.data() as Partial<TotalStats> | undefined) };
    }
    return { ...zero, ...readDemo().totals };
  },
};
