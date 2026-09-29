import { Router, type Request } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { Server } from 'socket.io';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toPublicDoubt } from '../shared/publicDoubt.js';
import { bumpStat } from '../shared/stats.js';

const router = Router();
router.use(requireAuth);

/** Any change after creation: admins' lists and badge counts, and the owning student's list, refresh live. */
function emitDoubtUpdated(req: Request, ownerId: string, doubt: ReturnType<typeof toPublicDoubt>) {
  (req.app.get('io') as Server | undefined)?.to('admins').to(ownerId).emit('doubt:updated', doubt);
}

router.get('/mine', async (req, res) => {
  const rows = await prisma.doubt.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(rows.map((d) => toPublicDoubt(d)));
});

const askSchema = z.object({
  youtube_id: z.string().min(1),
  video_title: z.string().min(1),
  class_sort: z.string().min(1),
  subject: z.string().min(1),
  chapter_id: z.string().min(1),
  chapter_name: z.string().min(1),
  question: z.string().min(10).max(2000),
});

// Max 10 doubts/day per student.
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
  const { youtube_id, video_title, class_sort, subject, chapter_id, chapter_name, question } = parsed.data;

  const doubt = await prisma.doubt.create({
    data: {
      userId: req.user!.userId,
      youtubeId: youtube_id,
      videoTitle: video_title,
      classSort: class_sort,
      subject,
      chapterId: chapter_id,
      chapterName: chapter_name,
      question: question.trim(),
    },
    include: { user: { select: { displayName: true, email: true } } },
  });
  void bumpStat('doubtsAsked');
  req.app.get('io')?.to('admins').emit('doubt:new', toPublicDoubt(doubt));
  res.status(201).json(toPublicDoubt(doubt));
});

router.get('/', requireAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const rows = await prisma.doubt.findMany({
    where: status ? { status: status as 'OPEN' | 'ANSWERED' | 'CLOSED' } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { user: { select: { displayName: true, email: true } } },
  });
  res.json(rows.map((d) => toPublicDoubt(d)));
});

const answerSchema = z.object({ answer: z.string().min(1).max(4000) });

router.post('/:id/answer', requireAdmin, async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const me = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { displayName: true } });
  const doubt = await prisma.doubt.update({
    where: { id: req.params.id },
    data: { answer: parsed.data.answer.trim(), status: 'ANSWERED', answeredBy: me?.displayName ?? 'Educator', answeredAt: new Date(), studentUnread: true },
    include: { user: { select: { displayName: true, email: true } } },
  });
  const publicDoubt = toPublicDoubt(doubt);
  (req.app.get('io') as Server | undefined)?.to(doubt.userId).emit('doubt:answered', publicDoubt);
  emitDoubtUpdated(req, doubt.userId, publicDoubt);
  res.json(publicDoubt);
});

const statusSchema = z.object({ status: z.enum(['open', 'answered', 'closed']) });

// Students close their own doubts; admins can set any status.
router.patch('/:id', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.doubt.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Doubt not found' });
  if (existing.userId !== req.user!.userId && req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Not your doubt' });

  const doubt = await prisma.doubt.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status.toUpperCase() as 'OPEN' | 'ANSWERED' | 'CLOSED', studentUnread: false },
    include: { user: { select: { displayName: true, email: true } } },
  });
  const publicDoubt = toPublicDoubt(doubt);
  emitDoubtUpdated(req, doubt.userId, publicDoubt);
  res.json(publicDoubt);
});

router.post('/:id/read', async (req, res) => {
  const existing = await prisma.doubt.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Doubt not found' });
  if (existing.userId !== req.user!.userId) return res.status(403).json({ error: 'Not your doubt' });

  const doubt = await prisma.doubt.update({
    where: { id: req.params.id },
    data: { studentUnread: false },
    include: { user: { select: { displayName: true, email: true } } },
  });
  res.json(toPublicDoubt(doubt));
});

export default router;
