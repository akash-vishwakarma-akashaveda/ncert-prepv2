import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { Server } from 'socket.io';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/mine', async (req, res) => {
  const rows = await prisma.doubt.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

const askSchema = z.object({ question: z.string().min(1).max(2000) });

// Max 10 doubts/day per student, matching the limit called out in the migration plan.
const askLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.userId,
});

router.post('/', askLimiter, async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const doubt = await prisma.doubt.create({ data: { userId: req.user!.userId, question: parsed.data.question } });
  req.app.get('io')?.to('admins').emit('doubt:new', doubt);
  res.status(201).json(doubt);
});

router.get('/', requireAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const rows = await prisma.doubt.findMany({
    where: status ? { status: status as 'OPEN' | 'ANSWERED' | 'CLOSED' } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true, email: true } } },
  });
  res.json(rows);
});

const answerSchema = z.object({ answer: z.string().min(1).max(4000) });

router.post('/:id/answer', requireAdmin, async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const doubt = await prisma.doubt.update({
    where: { id: req.params.id },
    data: { answer: parsed.data.answer, status: 'ANSWERED', answeredAt: new Date() },
  });
  (req.app.get('io') as Server | undefined)?.to(doubt.userId).emit('doubt:answered', doubt);
  res.json(doubt);
});

export default router;
