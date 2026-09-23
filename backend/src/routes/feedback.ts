import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const submitSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() });

// Max 5 submissions/hour per user, matching NFR-3 in the product spec.
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
  const feedback = await prisma.feedback.create({ data: { userId: req.user!.userId, ...parsed.data } });
  res.status(201).json(feedback);
});

router.get('/', requireAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const rows = await prisma.feedback.findMany({
    where: status ? { status: status as 'NEW' | 'REVIEWED' } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true, email: true } } },
  });
  res.json(rows);
});

router.post('/:id/review', requireAdmin, async (req, res) => {
  const feedback = await prisma.feedback.update({ where: { id: req.params.id }, data: { status: 'REVIEWED' } });
  res.json(feedback);
});

export default router;
