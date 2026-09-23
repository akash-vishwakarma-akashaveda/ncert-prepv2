import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toPublicVideo, toPrismaVideoData } from '../shared/publicVideo.js';

const router = Router();

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Public: the full catalogue, including hidden/inactive videos — the frontend filters those out
// for the student-facing views itself (useCatalog.ts) and needs them for the admin table.
router.get('/', async (_req, res) => {
  const videos = await prisma.video.findMany({ orderBy: [{ classSort: 'asc' }, { subject: 'asc' }, { chapterId: 'asc' }] });
  res.json(videos.map(toPublicVideo));
});

const videoFieldsSchema = z.object({
  class_sort: z.string().min(1),
  class_display: z.string().optional(),
  subject: z.string().min(1),
  textbook: z.string().optional(),
  chapter_id: z.string().min(1),
  chapter_name: z.string().min(1),
  video_title: z.string().min(1),
  isActive: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  pyq_available: z.boolean().optional(),
  yt_public: z.boolean().optional(),
  pdf_url: z.string().optional(),
  timestamps: z.string().optional(),
});

const createSchema = videoFieldsSchema.extend({ youtube_id: z.string().regex(YOUTUBE_ID) });

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { youtube_id, class_sort, class_display, ...fields } = parsed.data;

  const existing = await prisma.video.findUnique({ where: { youtubeId: youtube_id } });
  if (existing) return res.status(409).json({ error: 'A video with this YouTube ID already exists.' });

  const video = await prisma.video.create({
    data: {
      youtubeId: youtube_id,
      classSort: class_sort,
      classDisplay: class_display || `Class ${parseInt(class_sort, 10)}`,
      subject: fields.subject,
      textbook: fields.textbook ?? '',
      chapterId: fields.chapter_id,
      chapterName: fields.chapter_name,
      videoTitle: fields.video_title,
      isActive: fields.isActive ?? true,
      isPremium: fields.isPremium ?? false,
      pyqAvailable: fields.pyq_available ?? false,
      ytPublic: fields.yt_public ?? true,
      pdfUrl: fields.pdf_url ?? '',
      timestamps: fields.timestamps ?? '',
    },
  });
  res.status(201).json(toPublicVideo(video));
});

const updateSchema = videoFieldsSchema.partial();

router.patch('/:youtubeId', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const video = await prisma.video
    .update({ where: { youtubeId: req.params.youtubeId }, data: toPrismaVideoData(parsed.data) })
    .catch(() => null);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(toPublicVideo(video));
});

router.delete('/:youtubeId', requireAuth, requireAdmin, async (req, res) => {
  await prisma.video.delete({ where: { youtubeId: req.params.youtubeId } }).catch(() => null);
  res.json({ ok: true });
});

export default router;
