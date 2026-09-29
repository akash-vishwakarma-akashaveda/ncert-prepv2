import { api } from './api/client';
import { UserProgress, XpTransaction, XpSourceType } from '../types';

interface BackendLessonProgress {
  id: string;
  userId: string;
  youtubeId: string;
  completed: boolean;
  favorited: boolean;
  watchedAt: string;
}

function toUserProgress(p: BackendLessonProgress): UserProgress {
  return { youtube_id: p.youtubeId, completed: p.completed, favorited: p.favorited, last_viewed: new Date(p.watchedAt).getTime() };
}

// Backend uses SCREAMING_SNAKE_CASE enum values; the frontend type is lowercase_snake_case.
const TYPE_FROM_BACKEND: Record<string, XpSourceType> = {
  LESSON_COMPLETED: 'lesson_completed',
  LESSON_UNCOMPLETED: 'lesson_uncompleted',
  FOCUS_SESSION: 'focus_session',
  STREAK_BONUS: 'streak_bonus',
  NOTES_REVISION: 'notes_revision',
  DOUBT_ASKED: 'doubt_asked',
  WELCOME_BONUS: 'welcome_bonus',
};

interface BackendXpTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  sourceId: string | null;
  classSort: string;
  balanceAfter: number;
  createdAt: string;
}

function toXpTransaction(t: BackendXpTransaction): XpTransaction {
  return {
    id: t.id,
    userId: t.userId,
    amount: t.amount,
    type: TYPE_FROM_BACKEND[t.type] ?? 'lesson_completed',
    description: t.description,
    sourceId: t.sourceId ?? undefined,
    class_sort: t.classSort,
    timestamp: new Date(t.createdAt).getTime(),
    balanceAfter: t.balanceAfter,
  };
}

// Real, authenticated progress/XP — used only when a user is signed in. Unsigned "visitor"
// browsing still uses the local-only path in ProgressContext (this backend requires a session).
export const ProgressService = {
  async fetchAll(): Promise<Record<string, UserProgress>> {
    const rows = await api.get<BackendLessonProgress[]>('/api/progress');
    const map: Record<string, UserProgress> = {};
    rows.forEach((r) => {
      map[r.youtubeId] = toUserProgress(r);
    });
    return map;
  },
  async upsert(youtubeId: string, updates: { completed?: boolean; favorited?: boolean }): Promise<void> {
    await api.post('/api/progress', { youtubeId, ...updates });
  },
};

export const BackendXpService = {
  async getXpHistory(classSort?: string): Promise<XpTransaction[]> {
    const qs = classSort ? `?classSort=${encodeURIComponent(classSort)}` : '';
    const rows = await api.get<BackendXpTransaction[]>(`/api/progress/xp-history${qs}`);
    return rows.map(toXpTransaction);
  },
  async recordFocusSession(classSort: string): Promise<XpTransaction | null> {
    const t = await api.post<BackendXpTransaction | null>('/api/progress/focus-session', { classSort });
    return t ? toXpTransaction(t) : null;
  },
  async recordStreakBonus(classSort: string, streakDays: number): Promise<XpTransaction | null> {
    const t = await api.post<BackendXpTransaction | null>('/api/progress/streak-bonus', { classSort, streakDays });
    return t ? toXpTransaction(t) : null;
  },
};
