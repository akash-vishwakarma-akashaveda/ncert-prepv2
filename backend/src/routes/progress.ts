import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireConsent } from '../middleware/auth.js';
import { lockUserXp, recordXp, xpAlreadyRecorded } from '../shared/xp.js';
import { bumpStat } from '../shared/stats.js';
import { toPublicUser } from '../shared/publicUser.js';

const router = Router();
router.use(requireAuth, requireConsent);

const XP_REWARDS = {
  LESSON_COMPLETED: 50,
  LESSON_UNCOMPLETED: -50,
  FOCUS_SESSION: 25,
  STREAK_BONUS: 20,
} as const;

// A Pomodoro block is 25 minutes; anything faster than this is not a real session.
const FOCUS_MIN_GAP_MS = 20 * 60 * 1000;
const FOCUS_DAILY_CAP = 8;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** IST calendar day, e.g. "2026-09-23" — used as the once-a-day streak-bonus idempotency key. */
function istDay(offsetDays = 0): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** Start of today in IST, as a real instant. */
function istDayStart(): Date {
  return new Date(`${istDay()}T00:00:00+05:30`);
}

/** Class-scoped XP always goes to the class the student is enrolled in, never one the request names. */
async function enrolledClassSort(userId: string): Promise<string | null> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { classGrade: true } });
  return me?.classGrade != null ? String(me.classGrade).padStart(2, '0') : null;
}

router.get('/', async (req, res) => {
  const rows = await prisma.lessonProgress.findMany({ where: { userId: req.user!.userId } });
  res.json(rows);
});

const upsertSchema = z.object({
  youtubeId: z.string().regex(YOUTUBE_ID),
  completed: z.boolean().optional(),
  favorited: z.boolean().optional(),
});

router.post('/', async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { youtubeId, completed, favorited } = parsed.data;
  const userId = req.user!.userId;

  // Only real, live lessons can be tracked, so made-up ids cannot be turned into XP.
  const video = await prisma.video.findUnique({ where: { youtubeId }, select: { classSort: true, videoTitle: true, isActive: true } });
  if (!video || !video.isActive) return res.status(404).json({ error: 'Lesson not found' });
  const { classSort } = video;

  const result = await prisma.$transaction(async (tx) => {
    // Serialises this student's XP changes: two parallel "complete" clicks see each other's result
    // instead of both seeing "not completed yet" and both awarding.
    await lockUserXp(tx, userId);
    const existing = await tx.lessonProgress.findUnique({ where: { userId_youtubeId: { userId, youtubeId } } });

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
        description: `Completed lesson: ${video.videoTitle}`,
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
          description: `Unmarked lesson: ${video.videoTitle}`,
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

router.post('/focus-session', async (req, res) => {
  const userId = req.user!.userId;
  const classSort = await enrolledClassSort(userId);
  if (!classSort) return res.status(400).json({ error: 'Pick your class first' });

  const tx = await prisma.$transaction(async (db) => {
    await lockUserXp(db, userId);
    const today = await db.xpTransaction.findMany({
      where: { userId, type: 'FOCUS_SESSION', createdAt: { gte: istDayStart() } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    // One award per real Pomodoro block, and a daily ceiling, so a script cannot farm the leaderboard.
    if (today.length >= FOCUS_DAILY_CAP) return null;
    if (today[0] && Date.now() - today[0].createdAt.getTime() < FOCUS_MIN_GAP_MS) return null;
    return recordXp(db, {
      userId,
      classSort,
      amount: XP_REWARDS.FOCUS_SESSION,
      type: 'FOCUS_SESSION',
      description: 'Completed a Pomodoro focus block',
      sourceId: `focus_${istDay()}_${Date.now()}`,
    });
  });
  res.json(tx);
});

/**
 * Marks today as a study day and updates the streak on the server (it used to be sent by the browser,
 * which let students set any streak). Returns the updated user.
 */
router.post('/activity', async (req, res) => {
  const userId = req.user!.userId;
  const today = istDay();
  const user = await prisma.$transaction(async (tx) => {
    await lockUserXp(tx, userId);
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { streak: true, lastActiveDate: true } });
    if (me.lastActiveDate === today) return tx.user.findUniqueOrThrow({ where: { id: userId } });
    const streak = me.lastActiveDate === istDay(-1) ? me.streak + 1 : 1;
    return tx.user.update({ where: { id: userId }, data: { streak, lastActiveDate: today } });
  });
  res.json(toPublicUser(user));
});

router.post('/streak-bonus', async (req, res) => {
  const userId = req.user!.userId;
  const classSort = await enrolledClassSort(userId);
  if (!classSort) return res.status(400).json({ error: 'Pick your class first' });
  const sourceId = `streak_${istDay()}`;

  const tx = await prisma.$transaction(async (db) => {
    await lockUserXp(db, userId);
    const me = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { streak: true, lastActiveDate: true } });
    // Only for a streak the server itself recorded today; once per student per day, whatever the class.
    if (me.lastActiveDate !== istDay() || me.streak < 1) return null;
    const already = await db.xpTransaction.findFirst({ where: { userId, type: 'STREAK_BONUS', sourceId }, select: { id: true } });
    if (already) return null;
    return recordXp(db, {
      userId,
      classSort,
      amount: XP_REWARDS.STREAK_BONUS,
      type: 'STREAK_BONUS',
      description: `Daily study streak reward (${me.streak} day streak kept alive!)`,
      sourceId,
    });
  });
  res.json(tx);
});

router.get('/xp-history', async (req, res) => {
  const classSort = typeof req.query.classSort === 'string' ? req.query.classSort.slice(0, 4) : undefined;
  const rows = await prisma.xpTransaction.findMany({
    where: { userId: req.user!.userId, ...(classSort && { classSort }) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(rows);
});

export default router;
