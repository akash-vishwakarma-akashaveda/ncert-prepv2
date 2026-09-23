import { Video, UserProgress, User } from '../types';

const STORAGE_KEYS = {
  CATALOG_CACHE: 'chapterplay_catalog_cache',
  CATALOG_CACHE_TIME: 'chapterplay_catalog_timestamp',
  LAST_WATCHED: 'chapterplay_last_watched',
  USER_PROGRESS: 'chapterplay_user_progress_',
  LOCAL_USER: 'chapterplay_local_user',
  FEEDBACK_TIMESTAMPS: 'chapterplay_feedback_timestamps_',
};

export const StorageService = {
  // Catalog Caching (FR-4)
  getCachedCatalog(): Video[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATALOG_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to read cached catalog:', e);
      return null;
    }
  },

  setCachedCatalog(videos: Video[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CATALOG_CACHE, JSON.stringify(videos));
      localStorage.setItem(STORAGE_KEYS.CATALOG_CACHE_TIME, Date.now().toString());
    } catch (e) {
      console.warn('Failed to cache catalog:', e);
    }
  },

  // Last watched video (scoped per user for student isolation)
  getLastWatchedVideo(userId?: string): string | null {
    try {
      if (userId) {
        const userSpecific = localStorage.getItem(`${STORAGE_KEYS.LAST_WATCHED}_${userId}`);
        if (userSpecific) return userSpecific;
      }
      return localStorage.getItem(STORAGE_KEYS.LAST_WATCHED);
    } catch {
      return null;
    }
  },

  setLastWatchedVideo(userId: string | undefined, youtubeId: string): void {
    try {
      if (userId) {
        localStorage.setItem(`${STORAGE_KEYS.LAST_WATCHED}_${userId}`, youtubeId);
      }
      localStorage.setItem(STORAGE_KEYS.LAST_WATCHED, youtubeId);
    } catch (e) {
      console.warn('Failed to save last watched:', e);
    }
  },

  // Local user progress cache (keyed by userId)
  getUserProgress(userId: string): Record<string, UserProgress> {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.USER_PROGRESS}${userId}`);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setUserProgress(userId: string, progressMap: Record<string, UserProgress>): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.USER_PROGRESS}${userId}`, JSON.stringify(progressMap));
    } catch (e) {
      console.warn('Failed to save user progress:', e);
    }
  },

  // Local user profile
  getLocalUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCAL_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setLocalUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.LOCAL_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.LOCAL_USER);
      }
    } catch (e) {
      console.warn('Failed to save local user:', e);
    }
  },

  // Feedback rate limiting: stores array of submission timestamps within the last hour
  getFeedbackTimestamps(userId: string): number[] {
    try {
      const key = `${STORAGE_KEYS.FEEDBACK_TIMESTAMPS}${userId}`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      const timestamps: number[] = JSON.parse(data);
      const oneHourAgo = Date.now() - 3600000;
      // Filter only within last hour
      const valid = timestamps.filter(ts => ts > oneHourAgo);
      return valid;
    } catch {
      return [];
    }
  },

  recordFeedbackSubmission(userId: string): { allowed: boolean; remaining: number } {
    const key = `${STORAGE_KEYS.FEEDBACK_TIMESTAMPS}${userId}`;
    const timestamps = this.getFeedbackTimestamps(userId);
    const MAX_PER_HOUR = 5;

    if (timestamps.length >= MAX_PER_HOUR) {
      return { allowed: false, remaining: 0 };
    }

    timestamps.push(Date.now());
    try {
      localStorage.setItem(key, JSON.stringify(timestamps));
    } catch (e) {
      console.warn('Failed to record feedback timestamp:', e);
    }

    return { allowed: true, remaining: MAX_PER_HOUR - timestamps.length };
  },

  clearUserData(userId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.USER_PROGRESS}${userId}`);
      localStorage.removeItem(`${STORAGE_KEYS.FEEDBACK_TIMESTAMPS}${userId}`);
      localStorage.removeItem(STORAGE_KEYS.LOCAL_USER);
      localStorage.removeItem(STORAGE_KEYS.LAST_WATCHED);
      localStorage.removeItem(`${STORAGE_KEYS.LAST_WATCHED}_${userId}`);
      localStorage.removeItem(`quickprep_xp_history_${userId}`);
      localStorage.removeItem(`quickprep_xp_total_${userId}`);
      localStorage.removeItem(`ncert_prep_onboarded_${userId}`);
    } catch (e) {
      console.warn('Failed to clear user data:', e);
    }
  },
};
