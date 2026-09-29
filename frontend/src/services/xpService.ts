import { XpSourceType, XpTransaction, UserProgress, Video } from '../types';
import { XP_PER_LEVEL } from '../data/gamification';
import { normalizeClassSort } from '../data/classFormat';

// Local-only XP ledger for anonymous "visitor" browsing (no account, nothing sent to the
// backend). Signed-in students use services/progress.ts's BackendXpService instead — the
// Postgres XP ledger is the real source of truth there.
export const XP_REWARDS: Record<XpSourceType, number> = {
  lesson_completed: 50,
  lesson_uncompleted: -50,
  focus_session: 25,
  streak_bonus: 20,
  notes_revision: 10,
  doubt_asked: 10,
  welcome_bonus: 50,
};

const STORAGE_KEYS = {
  history: (userId: string) => `quickprep_xp_history_${userId}`,
  total: (userId: string, classSort?: string) =>
    classSort
      ? `quickprep_xp_total_${userId}_${normalizeClassSort(classSort)}`
      : `quickprep_xp_total_${userId}`,
};

function readLocalHistory(userId: string): XpTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history(userId));
    if (raw) return JSON.parse(raw) as XpTransaction[];
  } catch (err) {
    console.warn('Failed to read local XP history:', err);
  }
  return [];
}

function saveLocalHistory(userId: string, history: XpTransaction[], classSort?: string, classTotal?: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.history(userId), JSON.stringify(history));
    if (classSort && classTotal !== undefined) {
      localStorage.setItem(STORAGE_KEYS.total(userId, classSort), classTotal.toString());
    }
  } catch (err) {
    console.warn('Failed to save local XP history:', err);
  }
  window.dispatchEvent(new CustomEvent('quickprep-xp-change', { detail: { userId, classSort, totalXp: classTotal } }));
}

export const XpService = {
  async getXpHistory(userId: string, classSort?: string): Promise<XpTransaction[]> {
    const history = readLocalHistory(userId);
    if (!classSort) return history.sort((a, b) => b.timestamp - a.timestamp);

    const targetClass = normalizeClassSort(classSort);
    const classFiltered = history.filter((t) => normalizeClassSort(t.class_sort || '10') === targetClass);

    const chronological = [...classFiltered].sort((a, b) => a.timestamp - b.timestamp);
    let running = 0;
    const recomputed = chronological.map((t) => {
      running = Math.max(0, running + t.amount);
      return { ...t, balanceAfter: running };
    });
    return recomputed.reverse();
  },

  getXpBalance(userId: string, classSort?: string): { totalXp: number; level: number; xpInLevel: number; xpToNext: number } {
    const history = readLocalHistory(userId);
    let totalXp = 0;

    if (classSort) {
      const targetClass = normalizeClassSort(classSort);
      const classTxs = history
        .filter((t) => normalizeClassSort(t.class_sort || '10') === targetClass)
        .sort((a, b) => a.timestamp - b.timestamp);
      for (const t of classTxs) totalXp = Math.max(0, totalXp + t.amount);
    } else {
      const rawTotal = localStorage.getItem(STORAGE_KEYS.total(userId));
      totalXp = rawTotal !== null ? parseInt(rawTotal, 10) : 0;
      if (isNaN(totalXp) || totalXp <= 0) {
        totalXp = history.reduce((acc, t) => Math.max(0, acc + t.amount), 0);
      }
    }

    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const xpInLevel = totalXp % XP_PER_LEVEL;
    return { totalXp, level, xpInLevel, xpToNext: XP_PER_LEVEL - xpInLevel };
  },

  async recordTransaction(
    userId: string,
    params: { amount: number; type: XpSourceType; description: string; sourceId?: string; class_sort?: string; timestamp?: number }
  ): Promise<XpTransaction> {
    const history = readLocalHistory(userId);
    const now = params.timestamp || Date.now();
    const classSort = normalizeClassSort(params.class_sort || '10');

    if (params.amount > 0 && params.sourceId) {
      const alreadyCredited = history.find(
        (t) => t.sourceId === params.sourceId && t.type === params.type && t.amount > 0 && normalizeClassSort(t.class_sort || '10') === classSort
      );
      if (alreadyCredited) return alreadyCredited;
    }

    const currentClassStats = this.getXpBalance(userId, classSort);
    const newClassBalance = Math.max(0, currentClassStats.totalXp + params.amount);

    const tx: XpTransaction = {
      id: `xp_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      amount: params.amount,
      type: params.type,
      description: params.description,
      sourceId: params.sourceId,
      class_sort: classSort,
      timestamp: now,
      balanceAfter: newClassBalance,
    };

    saveLocalHistory(userId, [tx, ...history], classSort, newClassBalance);
    return tx;
  },

  async recordLessonCompleted(userId: string, youtubeId: string, videoTitle?: string, classSort?: string): Promise<XpTransaction | null> {
    const desc = videoTitle ? `Completed lesson: ${videoTitle}` : 'Completed NCERT video lesson';
    return this.recordTransaction(userId, { amount: XP_REWARDS.lesson_completed, type: 'lesson_completed', description: desc, sourceId: youtubeId, class_sort: classSort });
  },

  async recordLessonUncompleted(userId: string, youtubeId: string, videoTitle?: string, classSort?: string): Promise<XpTransaction | null> {
    const targetClass = normalizeClassSort(classSort || '10');
    const history = readLocalHistory(userId);
    const hasCredit = history.some(
      (t) => t.sourceId === youtubeId && t.type === 'lesson_completed' && t.amount > 0 && normalizeClassSort(t.class_sort || '10') === targetClass
    );
    if (!hasCredit) return null;

    const desc = videoTitle ? `Unmarked lesson: ${videoTitle}` : 'Lesson completion removed';
    return this.recordTransaction(userId, { amount: XP_REWARDS.lesson_uncompleted, type: 'lesson_uncompleted', description: desc, sourceId: youtubeId, class_sort: targetClass });
  },

  async recordFocusSession(userId: string, classSort?: string): Promise<XpTransaction> {
    return this.recordTransaction(userId, {
      amount: XP_REWARDS.focus_session,
      type: 'focus_session',
      description: 'Completed a Pomodoro focus block',
      sourceId: `focus_${new Date().toISOString().slice(0, 10)}_${Date.now()}`,
      class_sort: classSort,
    });
  },

  async recordStreakBonus(userId: string, streakDays: number, classSort?: string): Promise<XpTransaction> {
    const today = new Date().toISOString().slice(0, 10);
    return this.recordTransaction(userId, {
      amount: XP_REWARDS.streak_bonus,
      type: 'streak_bonus',
      description: `Daily study streak reward (${streakDays} day streak kept alive!)`,
      sourceId: `streak_${today}`,
      class_sort: classSort,
    });
  },

  async reconcileWithProgress(userId: string, progressMap: Record<string, UserProgress>, videoMap?: Map<string, Video>, defaultClass?: string): Promise<void> {
    if (!userId) return;
    const history = readLocalHistory(userId);
    const completedItems = Object.values(progressMap).filter((p) => p.completed);
    const missingTransactions: XpTransaction[] = [];

    for (let i = 0; i < completedItems.length; i++) {
      const item = completedItems[i];
      const video = videoMap?.get(item.youtube_id);
      const lessonClass = normalizeClassSort(video?.class_sort || defaultClass || '10');
      const alreadyCredited = history.some(
        (t) => t.sourceId === item.youtube_id && t.type === 'lesson_completed' && t.amount > 0 && normalizeClassSort(t.class_sort || '10') === lessonClass
      );
      if (!alreadyCredited) {
        const title = video ? video.video_title : 'NCERT Video Lesson';
        missingTransactions.push({
          id: `xp_backfill_${Date.now()}_${i}`,
          userId,
          amount: XP_REWARDS.lesson_completed,
          type: 'lesson_completed',
          description: `Completed lesson: ${title}`,
          sourceId: item.youtube_id,
          class_sort: lessonClass,
          timestamp: typeof item.last_viewed === 'number' ? item.last_viewed : Date.now() - (completedItems.length - i) * 60000,
          balanceAfter: 0,
        });
      }
    }

    if (missingTransactions.length > 0) saveLocalHistory(userId, [...missingTransactions, ...history]);
  },
};
