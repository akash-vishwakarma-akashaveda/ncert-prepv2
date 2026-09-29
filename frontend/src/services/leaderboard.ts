import { api } from './api/client';
import { LeaderboardEntry, User } from '../types';
import { XP_PER_COMPLETED_LESSON, XP_PER_LEVEL, currentStreak } from '../data/gamification';
import { normalizeClassSort } from '../data/classFormat';

export const LeaderboardService = {
  // No-op for a signed-in user: the backend computes the leaderboard live from the XP ledger and
  // lesson progress on every read (routes/leaderboard.ts), so there's nothing to keep in sync.
  // Kept only so the two existing call sites (ProgressContext, ProfileSettings) don't need edits.
  async syncUserLeaderboardEntry(
    user: User,
    completedCount: number,
    customStreak?: number,
    customXp?: number
  ): Promise<LeaderboardEntry> {
    const classSort = normalizeClassSort(user.grade_preference || '10');
    const xp = customXp !== undefined ? customXp : (user.xp ?? (completedCount * XP_PER_COMPLETED_LESSON));
    return {
      userId: user.userId,
      displayName: user.displayName?.trim() || 'Student',
      class_sort: classSort,
      xp,
      completedCount,
      streak_days: customStreak !== undefined ? customStreak : currentStreak(user),
      level: Math.floor(xp / XP_PER_LEVEL) + 1,
      avatarSeed: user.photoURL || user.userId,
      photoURL: user.photoURL,
      updated_at: Date.now(),
    };
  },

  // Fetch leaderboard entries strictly for a given class. Anonymous "visitor" browsing has no
  // backend session, so it just sees an empty board — there's no local/demo leaderboard anymore.
  async getClassLeaderboard(classSort: string, currentUser?: User | null): Promise<LeaderboardEntry[]> {
    if (!currentUser) return [];
    const normalizedClass = normalizeClassSort(classSort || '10');
    try {
      return await api.get<LeaderboardEntry[]>(`/api/leaderboard?classSort=${encodeURIComponent(normalizedClass)}`);
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
      return [];
    }
  },
};
