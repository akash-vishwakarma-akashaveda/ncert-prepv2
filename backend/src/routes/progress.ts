import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { recordXp, xpAlreadyRecorded } from '../shared/xp.js';
import { bumpStat } from '../shared/stats.js';

const router = Router();
router.use(requireAuth);

const XP_REWARDS = {
  LESSON_COMPLETED: 50,
  LESSON_UNCOMPLETED: -50,
  FOCUS_SESSION: 25,
  STREAK_BONUS: 20,
} as const;

const DEFAULT_CLASS_SORT = '10';

/** IST calendar day, e.g. "2026-09-23" — used as the once-a-day streak-bonus idempotency key. */
function istDay(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  const rows = await prisma.lessonProgress.findMany({ where: { userId: req.user!.userId } });
  res.json(rows);
});

const upsertSchema = z.object({
  youtubeId: z.string().min(1),
  completed: z.boolean().optional(),
  favorited: z.boolean().optional(),
});

router.post('/', async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { youtubeId, completed, favorited } = parsed.data;
  const userId = req.user!.userId;

  const result = await prisma.$transaction(async (tx) => {
    const [existing, video] = await Promise.all([
      tx.lessonProgress.findUnique({ where: { userId_youtubeId: { userId, youtubeId } } }),
      tx.video.findUnique({ where: { youtubeId }, select: { classSort: true, videoTitle: true } }),
    ]);
    const classSort = video?.classSort ?? DEFAULT_CLASS_SORT;

    const row = await tx.lessonProgress.upsert({
      where: { userId_youtubeId: { userId, youtubeId } },
      update: { ...(completed !== undefined && { completed }), ...(favorited !== undefined && { favorited }), watchedAt: new Date() },
      create: { userId, youtubeId, completed: completed ?? false, favorited: favorited ?? false },
    });

    // Award once on the false->true transition; reverse only if that credit actually exists
    // (so toggling an already-uncompleted lesson, or double-clicking, never double-charges).
    if (completed && !existing?.completed) {
      await recordXp(tx, {
        userId,
        classSort,
        amount: XP_REWARDS.LESSON_COMPLETED,
        type: 'LESSON_COMPLETED',
        description: video?.videoTitle ? `Completed lesson: ${video.videoTitle}` : 'Completed NCERT video lesson',
        sourceId: youtubeId,
      });
    } else if (completed === false && existing?.completed) {
      const hasCredit = await xpAlreadyRecorded(tx, { userId, classSort, sourceId: youtubeId, type: 'LESSON_COMPLETED' });
      if (hasCredit) {
        await recordXp(tx, {
          userId,
          classSort,
          amount: XP_REWARDS.LESSON_UNCOMPLETED,
          type: 'LESSON_UNCOMPLETED',
          description: video?.videoTitle ? `Unmarked lesson: ${video.videoTitle}` : 'Lesson completion removed',
          sourceId: youtubeId,
        });
      }
    }
    return { row, isNew: !existing, justCompleted: completed && !existing?.completed };
  });

  if (result.isNew) void bumpStat('lessonsStarted');
  if (result.justCompleted) void bumpStat('lessonsCompleted');
  res.json(result.row);
});

const focusSchema = z.object({ classSort: z.string().min(1).optional() });

router.post('/focus-session', async (req, res) => {
  const parsed = focusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const classSort = parsed.data.classSort ?? DEFAULT_CLASS_SORT;
  const userId = req.user!.userId;

  const tx = await prisma.$transaction((db) =>
    recordXp(db, {
      userId,
      classSort,
      amount: XP_REWARDS.FOCUS_SESSION,
      type: 'FOCUS_SESSION',
      description: 'Completed a Pomodoro focus block',
      sourceId: `focus_${istDay()}_${Date.now()}`,
    }),
  );
  res.json(tx);
});

const streakSchema = z.object({ classSort: z.string().min(1).optional(), streakDays: z.number().int().min(1) });

router.post('/streak-bonus', async (req, res) => {
  const parsed = streakSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const classSort = parsed.data.classSort ?? DEFAULT_CLASS_SORT;
  const userId = req.user!.userId;
  const sourceId = `streak_${istDay()}`;

  const tx = await prisma.$transaction(async (db) => {
    if (await xpAlreadyRecorded(db, { userId, classSort, sourceId, type: 'STREAK_BONUS' })) return null;
    return recordXp(db, {
      userId,
      classSort,
      amount: XP_REWARDS.STREAK_BONUS,
      type: 'STREAK_BONUS',
      description: `Daily study streak reward (${parsed.data.streakDays} day streak kept alive!)`,
      sourceId,
    });
  });
  res.json(tx);
});

router.get('/xp-history', async (req, res) => {
  const classSort = typeof req.query.classSort === 'string' ? req.query.classSort : undefined;
  const rows = await prisma.xpTransaction.findMany({
    where: { userId: req.user!.userId, ...(classSort && { classSort }) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(rows);
});

export default router;
