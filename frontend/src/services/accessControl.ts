import { Video, User } from '../types';
import type { ContentAccessPolicy } from './dashboardControl';

/**
 * Visitor access, driven by the admin's Content Access policy (Dashboard Control → Access policy):
 * - Signed-in users: every lesson.
 * - Visitors: the first lesson of the first `freePreviewCount` chapters of each subject,
 *   or nothing if `freePreviewEnabled` is off. Everything else asks them to create a free account.
 * This is a sign-up nudge in the browser, not a security boundary: the videos are public on YouTube.
 */
export const DEFAULT_ACCESS_POLICY: ContentAccessPolicy = { freePreviewEnabled: true, freePreviewCount: 1, allowGuestNotes: false };

export function isFreePreviewLesson(
  video: Video,
  chapterIndex?: number,
  videoIndexInChapter?: number,
  policy: ContentAccessPolicy = DEFAULT_ACCESS_POLICY
): boolean {
  if (!policy.freePreviewEnabled) return false;
  const chapters = Math.max(1, policy.freePreviewCount || 1);
  if (typeof chapterIndex === 'number') {
    return chapterIndex < chapters && (typeof videoIndexInChapter === 'number' ? videoIndexInChapter === 0 : true);
  }
  // Without a position, fall back to the chapter number in the ID ("Chapter 1", "CH-01", …).
  const n = parseInt(video.chapter_id.match(/\d+/)?.[0] || '0', 10);
  return n >= 1 && n <= chapters;
}

export function isLessonUnlocked(
  video: Video,
  user: User | null,
  chapterIndex?: number,
  videoIndexInChapter?: number,
  policy?: ContentAccessPolicy
): boolean {
  if (user) return true;
  return isFreePreviewLesson(video, chapterIndex, videoIndexInChapter, policy);
}
