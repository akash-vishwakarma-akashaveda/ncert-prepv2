import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Computed live from the XP ledger and lesson progress — no separate leaderboard table to keep
// in sync. Own class only, unless a specific classSort is requested (matching a student picking
// a different class to browse, same as the old Firestore behaviour).
router.get('/', async (req, res) => {
  const classSortParam = typeof req.query.classSort === 'string' ? req.query.classSort : undefined;
  let classSort = classSortParam;
  if (!classSort) {
    const me = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { classGrade: true } });
    if (me?.classGrade == null) return res.json([]);
    classSort = String(me.classGrade).padStart(2, '0');
  }

  // Current per-class XP balance = each user's most recent transaction in this class.
  const transactions = await prisma.xpTransaction.findMany({
    where: { classSort },
    orderBy: { createdAt: 'asc' },
    select: { userId: true, balanceAfter: true },
  });
  const xpByUser = new Map<string, number>();
  for (const t of transactions) xpByUser.set(t.userId, t.balanceAfter); // last write per user wins

  // Completed lessons in this class.
  const classVideos = await prisma.video.findMany({ where: { classSort }, select: { youtubeId: true } });
  const completedByUser = new Map<string, number>();
  if (classVideos.length > 0) {
    const completedGroups = await prisma.lessonProgress.groupBy({
      by: ['userId'],
      where: { youtubeId: { in: classVideos.map((v) => v.youtubeId) }, completed: true },
      _count: { _all: true },
    });
    for (const g of completedGroups) completedByUser.set(g.userId, g._count._all);
  }

  const userIds = new Set([...xpByUser.keys(), ...completedByUser.keys()]);
  if (userIds.size === 0) return res.json([]);

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, displayName: true, photoUrl: true, streak: true, lastActiveDate: true },
  });

  const entries = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName?.trim() || 'Student',
    class_sort: classSort,
    xp: xpByUser.get(u.id) ?? 0,
    completedCount: completedByUser.get(u.id) ?? 0,
    streak_days: u.streak,
    level: Math.floor((xpByUser.get(u.id) ?? 0) / 100) + 1,
    avatarSeed: u.photoUrl || u.id,
    photoURL: u.photoUrl,
    updated_at: Date.now(),
  }));

  entries.sort((a, b) => b.xp - a.xp || b.completedCount - a.completedCount || b.streak_days - a.streak_days);
  res.json(entries.slice(0, 50));
});

export default router;
