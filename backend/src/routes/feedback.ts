import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { Server } from 'socket.io';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toPublicFeedback(f: { id: string; userId: string; youtubeId: string; message: string; status: string; createdAt: Date; user?: { displayName: string | null; email: string } }) {
  return {
    feedbackId: f.id,
    userId: f.userId,
    userEmail: f.user?.email,
    youtube_id: f.youtubeId,
    message: f.message,
    status: f.status.toLowerCase(),
    created_at: f.createdAt.getTime(),
  };
}

const submitSchema = z.object({ youtubeId: z.string().min(1), message: z.string().min(1).max(1000) });

// Max 5 submissions/hour per user.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.userId,
});

router.post('/', submitLimiter, async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const feedback = await prisma.feedback.create({
    data: { userId: req.user!.userId, youtubeId: parsed.data.youtubeId, message: parsed.data.message.trim() },
  });
  (req.app.get('io') as Server | undefined)?.to('admins').emit('feedback:changed');
  res.status(201).json(toPublicFeedback(feedback));
});

router.get('/', requireAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const rows = await prisma.feedback.findMany({
    where: status ? { status: status as 'NEW' | 'REVIEWED' } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true, email: true } } },
  });
  res.json(rows.map(toPublicFeedback));
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const status = req.body?.status === 'new' ? 'NEW' : 'REVIEWED';
  const feedback = await prisma.feedback.update({ where: { id: req.params.id }, data: { status } });
  (req.app.get('io') as Server | undefined)?.to('admins').emit('feedback:changed');
  res.json(toPublicFeedback(feedback));
});

export default router;
