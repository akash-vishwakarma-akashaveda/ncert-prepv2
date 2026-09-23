import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { LeaderboardEntry, User } from '../types';
import { XP_PER_COMPLETED_LESSON, XP_PER_LEVEL, currentStreak } from '../data/gamification';
import { normalizeClassSort } from '../data/classFormat';

const LOCAL_LEADERBOARD_KEY = 'quickprep_leaderboard_v1';

function getStoredLocalEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (raw) {
      return JSON.parse(raw) as LeaderboardEntry[];
    }
  } catch (err) {
    console.warn('Failed to parse local leaderboard entries:', err);
  }
  return [];
}

// Only real writes notify listeners. Pages refetch on this event, so a read that notified would loop forever.
function saveStoredLocalEntries(entries: LeaderboardEntry[], notify = true) {
  try {
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Failed to save local leaderboard entries:', err);
  }
  if (notify) window.dispatchEvent(new CustomEvent('quickprep-leaderboard-change'));
}

export const LeaderboardService = {
  // Synchronize the current student's stats to the leaderboard
  async syncUserLeaderboardEntry(
    user: User,
    completedCount: number,
    customStreak?: number,
    customXp?: number
  ): Promise<LeaderboardEntry> {
    const classSort = normalizeClassSort(user.grade_preference || '10');
    const xp = customXp !== undefined ? customXp : (user.xp ?? (completedCount * XP_PER_COMPLETED_LESSON));
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const streak = customStreak !== undefined ? customStreak : currentStreak(user);
    // Student ID isolation / privacy: Never leak student email handle if displayName is unset
    const displayName = user.displayName?.trim() || 'Student';

    const entry: LeaderboardEntry = {
      userId: user.userId,
      displayName,
      class_sort: classSort,
      xp,
      completedCount,
      streak_days: streak,
      level,
      avatarSeed: user.photoURL || user.userId,
      photoURL: user.photoURL,
      updated_at: Date.now(),
    };

    // 1. Update local storage - purge any previous class record for this user to guarantee strict single-class isolation
    const local = getStoredLocalEntries();
    const cleaned = local.filter((e) => e.userId !== user.userId);
    cleaned.push(entry);
    saveStoredLocalEntries(cleaned);

    // 2. Update Firestore if live
    if (isFirebaseConfigured && db) {
      try {
        const entryDoc = doc(db, 'leaderboard', user.userId);
        await setDoc(
          entryDoc,
          {
            ...entry,
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to sync leaderboard entry to Firestore:', err);
      }
    }

    return entry;
  },

  // Fetch leaderboard entries strictly for a given class
  async getClassLeaderboard(
    classSort: string,
    currentUser?: User | null,
    currentCompletedCount?: number,
    currentXp?: number
  ): Promise<LeaderboardEntry[]> {
    const normalizedClass = normalizeClassSort(classSort || '10');
    const currentUserClass = currentUser?.grade_preference ? normalizeClassSort(currentUser.grade_preference) : null;
    const isStudentInThisClass = Boolean(currentUser && currentUserClass === normalizedClass);

    // If Firebase configured, try fetching live records strictly for this class
    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'leaderboard');
        const q = query(colRef, where('class_sort', '==', normalizedClass));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const liveEntries: LeaderboardEntry[] = [];
          snap.forEach((d) => {
            const data = d.data();
            // Strict isolation check: entry must belong to this class
            if (normalizeClassSort(data.class_sort) === normalizedClass) {
              liveEntries.push({
                userId: d.id,
                displayName: data.displayName || 'Student',
                class_sort: normalizedClass,
                xp: Number(data.xp) || 0,
                completedCount: Number(data.completedCount) || 0,
                streak_days: Number(data.streak_days) || 0,
                level: Number(data.level) || 1,
                avatarSeed: data.avatarSeed || d.id,
                photoURL: data.photoURL || null,
                updated_at: data.updated_at?.toMillis ? data.updated_at.toMillis() : Date.now(),
              });
            }
          });

          // Strictly inject currentUser ONLY if student is enrolled in this class
          if (isStudentInThisClass && currentUser) {
            const userCompleted = currentCompletedCount !== undefined ? currentCompletedCount : 0;
            const userXp = currentXp !== undefined ? currentXp : (currentUser.xp ?? (userCompleted * XP_PER_COMPLETED_LESSON));
            const existingIdx = liveEntries.findIndex((e) => e.userId === currentUser.userId);
            const userEntry: LeaderboardEntry = {
              userId: currentUser.userId,
              displayName: currentUser.displayName?.trim() || 'You',
              class_sort: normalizedClass,
              xp: userXp,
              completedCount: userCompleted,
              streak_days: currentStreak(currentUser),
              level: Math.floor(userXp / XP_PER_LEVEL) + 1,
              avatarSeed: currentUser.photoURL || currentUser.userId,
              photoURL: currentUser.photoURL,
              updated_at: Date.now(),
            };

            if (existingIdx >= 0) {
              liveEntries[existingIdx] = userEntry;
            } else {
              liveEntries.push(userEntry);
            }
          }

          liveEntries.sort((a, b) => {
            if (b.xp !== a.xp) return b.xp - a.xp;
            if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
            return b.streak_days - a.streak_days;
          });

          return liveEntries;
        }
      } catch (err) {
        console.warn('Live leaderboard fetch failed, falling back to local:', err);
      }
    }

    // Live mode never falls back to the demo classmates: real students must not see invented rivals.
    if (isFirebaseConfigured) {
      if (!isStudentInThisClass || !currentUser) return [];
      const userXp = currentXp ?? currentUser.xp ?? (currentCompletedCount ?? 0) * XP_PER_COMPLETED_LESSON;
      return [
        {
          userId: currentUser.userId,
          displayName: currentUser.displayName?.trim() || 'You',
          class_sort: normalizedClass,
          xp: userXp,
          completedCount: currentCompletedCount ?? 0,
          streak_days: currentStreak(currentUser),
          level: Math.floor(userXp / XP_PER_LEVEL) + 1,
          avatarSeed: currentUser.photoURL || currentUser.userId,
          photoURL: currentUser.photoURL,
          updated_at: Date.now(),
        },
      ];
    }

    // Demo mode (no Firebase keys): students who used this browser only.
    const local = getStoredLocalEntries();

    // Ensure current user entry exists and is updated ONLY if enrolled in this class
    if (isStudentInThisClass && currentUser) {
      const userCompleted = currentCompletedCount !== undefined ? currentCompletedCount : 0;
      const userXp = currentXp !== undefined ? currentXp : (currentUser.xp ?? (userCompleted * XP_PER_COMPLETED_LESSON));
      const userEntry: LeaderboardEntry = {
        userId: currentUser.userId,
        displayName: currentUser.displayName?.trim() || 'You',
        class_sort: normalizedClass,
        xp: userXp,
        completedCount: userCompleted,
        streak_days: currentStreak(currentUser),
        level: Math.floor(userXp / XP_PER_LEVEL) + 1,
        avatarSeed: currentUser.photoURL || currentUser.userId,
        photoURL: currentUser.photoURL,
        updated_at: Date.now(),
      };

      const existingIdx = local.findIndex((e) => e.userId === currentUser.userId);
      if (existingIdx >= 0) {
        local[existingIdx] = userEntry;
      } else {
        local.push(userEntry);
      }
      saveStoredLocalEntries(local, false);
    }

    // Strict filter by requested class
    const filtered = local.filter((e) => normalizeClassSort(e.class_sort) === normalizedClass);


    // Sort by XP descending
    filtered.sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return b.streak_days - a.streak_days;
    });

    return filtered;
  },
};
