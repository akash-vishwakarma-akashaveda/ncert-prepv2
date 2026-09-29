import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProgress, XpTransaction } from '../types';
import { useAuth } from './AuthContext';
import { useCatalogContext } from './CatalogContext';
import { StorageService } from '../services/storage';
import { XpService } from '../services/xpService';
import { ProgressService, BackendXpService } from '../services/progress';
import { XP_PER_LEVEL } from '../data/gamification';
import { normalizeClassSort } from '../data/classFormat';

interface ProgressContextType {
  progressMap: Record<string, UserProgress>;
  lastWatchedId: string | null;
  loading: boolean;
  isCompleted: (youtubeId: string) => boolean;
  isFavorited: (youtubeId: string) => boolean;
  toggleCompleted: (youtubeId: string) => Promise<void>;
  toggleFavorite: (youtubeId: string) => Promise<void>;
  recordVideoWatched: (youtubeId: string) => Promise<void>;
  completedCount: number;
  favoritesCount: number;
  favoriteIds: string[];
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpToNext: number;
  xpHistory: XpTransaction[];
  awardFocusXp: () => Promise<XpTransaction | null>;
  awardStreakXp: (streakDays: number) => Promise<XpTransaction | null>;
  refreshXp: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

// Anonymous "visitor" browsing: progress lives only in this browser's localStorage.
function saveVisitorProgress(youtubeId: string, updates: Partial<Pick<UserProgress, 'completed' | 'favorited'>>) {
  const map = StorageService.getUserProgress('visitor');
  const existing = map[youtubeId];
  map[youtubeId] = {
    youtube_id: youtubeId,
    completed: updates.completed ?? existing?.completed ?? false,
    favorited: updates.favorited ?? existing?.favorited ?? false,
    last_viewed: Date.now(),
  };
  StorageService.setUserProgress('visitor', map);
}

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, recordStudyActivity, updateProfile } = useAuth();
  const { videoMap } = useCatalogContext();
  const activeClass = user?.grade_preference ? normalizeClassSort(user.grade_preference) : '10';

  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [lastWatchedId, setLastWatchedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [xpHistory, setXpHistory] = useState<XpTransaction[]>([]);
  const [totalXp, setTotalXp] = useState<number>(0);

  // Signed-in students: the Postgres backend is authoritative (history[0] is the most recent
  // transaction — the list is newest-first — so its balanceAfter is the current total).
  // Unsigned "visitor" browsing keeps the original local-only path; this backend requires a
  // session, so there's nothing for a visitor to call.
  const refreshXp = useCallback(async () => {
    if (user) {
      const history = await BackendXpService.getXpHistory(activeClass);
      setXpHistory(history);
      setTotalXp(history[0]?.balanceAfter ?? 0);
    } else {
      const history = await XpService.getXpHistory('visitor', activeClass);
      setXpHistory(history);
      const balance = XpService.getXpBalance('visitor', activeClass);
      setTotalXp(balance.totalXp);
    }
  }, [user, activeClass]);

  // Load progress when user changes or on boot
  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      const targetId = user ? user.userId : 'visitor';
      const cachedLastWatched = StorageService.getLastWatchedVideo(targetId);
      if (cachedLastWatched && isMounted) {
        setLastWatchedId(cachedLastWatched);
      }

      if (user) {
        try {
          const map = await ProgressService.fetchAll();
          if (isMounted) {
            setProgressMap(map);
            if (user.last_watched_video) {
              setLastWatchedId(user.last_watched_video);
            }
            await refreshXp();
          }
        } catch (err) {
          console.error('Failed to load user progress:', err);
        }
      } else {
        // Visitor mode: check local visitor storage
        const visitorProgress = StorageService.getUserProgress('visitor');
        if (isMounted) {
          setProgressMap(visitorProgress);
          await XpService.reconcileWithProgress('visitor', visitorProgress, videoMap, activeClass);
          await refreshXp();
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadProgress();

    // Listen to external XP and focus events
    const onXpChange = () => {
      refreshXp();
    };
    window.addEventListener('quickprep-xp-change', onXpChange);

    return () => {
      isMounted = false;
      window.removeEventListener('quickprep-xp-change', onXpChange);
    };
  }, [user, activeClass, refreshXp, videoMap]);

  const isCompleted = useCallback(
    (youtubeId: string): boolean => {
      return Boolean(progressMap[youtubeId]?.completed);
    },
    [progressMap]
  );

  const isFavorited = useCallback(
    (youtubeId: string): boolean => {
      return Boolean(progressMap[youtubeId]?.favorited);
    },
    [progressMap]
  );

  // Optimistic toggle for completed state
  const toggleCompleted = useCallback(
    async (youtubeId: string) => {
      const current = isCompleted(youtubeId);
      const nextState = !current;
      const vid = videoMap?.get(youtubeId);
      const lessonClass = normalizeClassSort(vid?.class_sort || activeClass);

      // Optimistic update
      setProgressMap((prev) => ({
        ...prev,
        [youtubeId]: {
          youtube_id: youtubeId,
          completed: nextState,
          favorited: Boolean(prev[youtubeId]?.favorited),
          last_viewed: Date.now(),
        },
      }));

      try {
        if (user) {
          // The backend awards/reverses lesson XP itself, class-scoped, idempotently.
          await ProgressService.upsert(youtubeId, { completed: nextState });
        } else {
          saveVisitorProgress(youtubeId, { completed: nextState });
          if (nextState) {
            await XpService.recordLessonCompleted('visitor', youtubeId, vid?.video_title, lessonClass);
          } else {
            await XpService.recordLessonUncompleted('visitor', youtubeId, vid?.video_title, lessonClass);
          }
        }
        await refreshXp();
      } catch (err) {
        console.error('Failed to save completed state:', err);
      }
    },
    [user, activeClass, videoMap, isCompleted, refreshXp]
  );

  // Optimistic toggle for favorite state (FR-6)
  const toggleFavorite = useCallback(
    async (youtubeId: string) => {
      const current = isFavorited(youtubeId);
      const nextState = !current;

      // Optimistic update
      setProgressMap((prev) => ({
        ...prev,
        [youtubeId]: {
          youtube_id: youtubeId,
          completed: Boolean(prev[youtubeId]?.completed),
          favorited: nextState,
          last_viewed: Date.now(),
        },
      }));

      try {
        if (user) {
          await ProgressService.upsert(youtubeId, { favorited: nextState });
        } else {
          saveVisitorProgress(youtubeId, { favorited: nextState });
        }
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
      }
    },
    [user, isFavorited]
  );

  // Record that a video was viewed & update last_watched_video (FR-6)
  const recordVideoWatched = useCallback(
    async (youtubeId: string) => {
      setLastWatchedId(youtubeId);

      // Record in progress map
      setProgressMap((prev) => ({
        ...prev,
        [youtubeId]: {
          youtube_id: youtubeId,
          completed: Boolean(prev[youtubeId]?.completed),
          favorited: Boolean(prev[youtubeId]?.favorited),
          last_viewed: Date.now(),
        },
      }));

      try {
        if (user) {
          await ProgressService.upsert(youtubeId, {});
          await updateProfile({ last_watched_video: youtubeId });
          await recordStudyActivity();
        } else {
          saveVisitorProgress(youtubeId, {});
          StorageService.setLastWatchedVideo('visitor', youtubeId);
        }
      } catch (err) {
        console.error('Failed to record video watch:', err);
      }
    },
    [user, recordStudyActivity, updateProfile]
  );

  // Aggregates (strictly isolated to active enrolled class)
  const completedCount = useMemo(() => {
    return Object.values(progressMap).filter((item) => {
      if (!item.completed) return false;
      const vid = videoMap?.get(item.youtube_id);
      return vid ? normalizeClassSort(vid.class_sort) === activeClass : true;
    }).length;
  }, [progressMap, videoMap, activeClass]);

  const favoritesCount = useMemo(() => {
    return Object.values(progressMap).filter((item) => {
      if (!item.favorited) return false;
      const vid = videoMap?.get(item.youtube_id);
      return vid ? normalizeClassSort(vid.class_sort) === activeClass : true;
    }).length;
  }, [progressMap, videoMap, activeClass]);

  const favoriteIds = useMemo(() => {
    return Object.values(progressMap)
      .filter((item) => {
        if (!item.favorited) return false;
        const vid = videoMap?.get(item.youtube_id);
        return vid ? normalizeClassSort(vid.class_sort) === activeClass : true;
      })
      .map((item) => item.youtube_id);
  }, [progressMap, videoMap, activeClass]);

  // Award XP for 25-minute Pomodoro study sessions in active class
  const awardFocusXp = useCallback(async () => {
    const tx = user ? await BackendXpService.recordFocusSession(activeClass) : await XpService.recordFocusSession('visitor', activeClass);
    await refreshXp();
    return tx;
  }, [user, activeClass, refreshXp]);

  // Award XP for maintaining daily streaks in active class
  const awardStreakXp = useCallback(
    async (streakDays: number) => {
      const tx = user
        ? await BackendXpService.recordStreakBonus(activeClass, streakDays)
        : await XpService.recordStreakBonus('visitor', streakDays, activeClass);
      await refreshXp();
      return tx;
    },
    [user, activeClass, refreshXp]
  );

  // Automatically award focus XP when the focus timer completes 25 mins
  useEffect(() => {
    const onFocusCompleted = () => {
      awardFocusXp();
    };
    window.addEventListener('quickprep-focus-completed', onFocusCompleted);
    return () => window.removeEventListener('quickprep-focus-completed', onFocusCompleted);
  }, [awardFocusXp]);

  const level = useMemo(() => Math.floor(totalXp / XP_PER_LEVEL) + 1, [totalXp]);
  const xpInLevel = useMemo(() => totalXp % XP_PER_LEVEL, [totalXp]);
  const xpToNext = useMemo(() => XP_PER_LEVEL - xpInLevel, [xpInLevel]);

  return (
    <ProgressContext.Provider
      value={{
        progressMap,
        lastWatchedId,
        loading,
        isCompleted,
        isFavorited,
        toggleCompleted,
        toggleFavorite,
        recordVideoWatched,
        completedCount,
        favoritesCount,
        favoriteIds,
        totalXp,
        level,
        xpInLevel,
        xpToNext,
        xpHistory,
        awardFocusXp,
        awardStreakXp,
        refreshXp,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = (): ProgressContextType => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};
