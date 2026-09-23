import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { awardXp } from '../shared/xp.js';

const router = Router();
router.use(requireAuth);

const LESSON_COMPLETE_XP = 10;

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
    const existing = await tx.lessonProgress.findUnique({ where: { userId_youtubeId: { userId, youtubeId } } });
    const row = await tx.lessonProgress.upsert({
      where: { userId_youtubeId: { userId, youtubeId } },
      update: { ...(completed !== undefined && { completed }), ...(favorited !== undefined && { favorited }), watchedAt: new Date() },
      create: { userId, youtubeId, completed: completed ?? false, favorited: favorited ?? false },
    });

    // Award XP once, only on the transition into "completed" — re-marking an already-completed
    // lesson (or toggling favorited) never awards again.
    if (completed && !existing?.completed) {
      await awardXp(tx, userId, LESSON_COMPLETE_XP, `lesson:${youtubeId}`);
    }
    return row;
  });

  res.json(result);
});

export default router;
