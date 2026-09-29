import { useEffect, useRef, useState } from 'react';
import { BADGES, BadgeDef, BadgeProgress } from '../data/badges';

const storageKey = (userId: string) => `ncert_prep_badges_seen_${userId}`;

function loadSeen(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(userId: string, seen: Set<string>): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...seen]));
  } catch {
    // Private browsing / storage blocked: unlocks just won't be remembered across sessions.
  }
}

/**
 * Queues a celebration for each badge newly earned since this hook last saw this user's progress.
 * Badges already earned before this session (or before the user ever loaded the app) are marked
 * "seen" on first run without celebrating, so returning users don't get replayed old unlocks.
 */
export function useBadgeUnlocks(userId: string | undefined, progress: BadgeProgress) {
  const [queue, setQueue] = useState<BadgeDef[]>([]);
  const initialized = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const seen = loadSeen(userId);
    const earned = BADGES.filter((b) => b.check(progress));

    if (initialized.current !== userId) {
      earned.forEach((b) => seen.add(b.id));
      saveSeen(userId, seen);
      initialized.current = userId;
      return;
    }

    const newlyEarned = earned.filter((b) => !seen.has(b.id));
    if (newlyEarned.length > 0) {
      newlyEarned.forEach((b) => seen.add(b.id));
      saveSeen(userId, seen);
      setQueue((q) => [...q, ...newlyEarned]);
    }
    // Re-run whenever any progress signal moves; comparing primitives keeps this cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, progress.completedCount, progress.streak, progress.doubtsAsked, progress.level, progress.favorites]);

  const current = queue[0];
  const dismiss = () => setQueue((q) => q.slice(1));

  return { current, dismiss };
}
