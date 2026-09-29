import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toPublicVideo, toPrismaVideoData } from '../shared/publicVideo.js';

const router = Router();

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const todayUtc = () => new Date().toISOString().slice(0, 10);

// Public: the full catalogue, including hidden/inactive videos — the frontend filters those out
// for the student-facing views itself (useCatalog.ts) and needs them for the admin table.
router.get('/', async (_req, res) => {
  const videos = await prisma.video.findMany({ orderBy: [{ classSort: 'asc' }, { subject: 'asc' }, { chapterId: 'asc' }] });
  res.json(videos.map(toPublicVideo));
});

// Public demo set for the landing page: no auth, and deliberately limited to lessons a visitor is
// actually allowed to play, so "Try the demo" cannot dead-end at a sign-up wall. Admin spotlights
// (Dashboard Control) come first; the rest is one lesson per class, so the demo spans the classes.
const FEATURED_LIMIT = 6;
const FEATURED_PER_STAGE = 2;
// Classes 1-5, 6-10, 11-12: the three stages the UI themes itself around.
const STAGE_CLASS_RANGES = [
  { from: 1, to: 5 },
  { from: 6, to: 10 },
  { from: 11, to: 12 },
];

interface DashboardConfig {
  spotlights?: Record<string, { videoId?: string; isActive?: boolean } | null>;
  policy?: { freePreviewEnabled?: boolean; freePreviewCount?: number };
}

router.get('/featured', async (_req, res) => {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'student_dashboard' } });
  const config = (setting?.value ?? null) as DashboardConfig | null;
  // Mirrors the visitor rule the browser applies (services/accessControl.ts): the first lesson of
  // the first N chapters. If the admin has switched free preview off, there is no demo to offer.
  const previewChapters = config?.policy?.freePreviewEnabled === false ? 0 : Math.max(1, config?.policy?.freePreviewCount ?? 1);

  const playable = await prisma.video.findMany({
    where: { isActive: true, ytPublic: true },
    orderBy: [{ classSort: 'asc' }, { subject: 'asc' }, { chapterId: 'asc' }],
  });
  const watchableByVisitor = playable.filter((v) => {
    const chapter = parseInt(v.chapterId.match(/\d+/)?.[0] ?? '0', 10);
    return chapter >= 1 && chapter <= previewChapters;
  });

  const spotlighted = new Set(
    Object.values(config?.spotlights ?? {})
      .filter((s) => s && s.isActive !== false && s.videoId)
      .map((s) => s!.videoId as string),
  );

  // Spread the demo across the three stages the landing page advertises, rather than letting the
  // class/subject sort order fill every slot with the alphabetically-first subject of the lowest
  // classes. Within a stage: a spotlighted lesson first, then a new subject, then any new class.
  const picked: typeof watchableByVisitor = [];
  const takenClasses = new Set<string>();
  const takenSubjects = new Set<string>();

  for (const stage of STAGE_CLASS_RANGES) {
    const inStage = watchableByVisitor.filter((v) => {
      const classNumber = Number(v.classSort);
      return classNumber >= stage.from && classNumber <= stage.to;
    });
    const spotlightFirst = [
      ...inStage.filter((v) => spotlighted.has(v.youtubeId)),
      ...inStage.filter((v) => !spotlighted.has(v.youtubeId)),
    ];

    let addedForStage = 0;
    // Pass 0 insists on a subject not used yet; pass 1 relaxes that if the stage has nothing else.
    for (const insistOnNewSubject of [true, false]) {
      for (const video of spotlightFirst) {
        if (addedForStage >= FEATURED_PER_STAGE) break;
        if (picked.includes(video)) continue;
        // Two lessons from one class are fine if the subjects differ: some stages have content in
        // only one class (Class XI currently has none at all), and a short row looks broken.
        if (insistOnNewSubject && takenSubjects.has(video.subject)) continue;
        picked.push(video);
        takenClasses.add(video.classSort);
        takenSubjects.add(video.subject);
        addedForStage += 1;
      }
    }
  }

  // A stage with no visitor-watchable lesson leaves a gap; fill it rather than showing a short row.
  for (const video of watchableByVisitor) {
    if (picked.length >= FEATURED_LIMIT) break;
    if (takenClasses.has(video.classSort)) continue;
    takenClasses.add(video.classSort);
    picked.push(video);
  }

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(picked.slice(0, FEATURED_LIMIT).map(toPublicVideo));
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

const heartbeatSchema = z.object({ seconds: z.number().int().min(1).max(45) });
// No auth: visitors watch too, and this feeds a revenue-hours estimate that should count them.
// Rate limit + per-ping cap bound how much a spammer could inflate it.
const heartbeatLimiter = rateLimit({ windowMs: 5 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });

router.post('/:youtubeId/watch-heartbeat', heartbeatLimiter, async (req, res) => {
  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const video = await prisma.video.findUnique({ where: { youtubeId: req.params.youtubeId }, select: { youtubeId: true } });
  if (!video) return res.status(404).json({ error: 'Unknown video' });

  const day = todayUtc();
  await prisma.videoWatchStat.upsert({
    where: { youtubeId_day: { youtubeId: video.youtubeId, day } },
    create: { youtubeId: video.youtubeId, day, secondsWatched: parsed.data.seconds },
    update: { secondsWatched: { increment: parsed.data.seconds } },
  });
  res.status(204).end();
});

const watchStatsMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

// Per-video watched-hours for one calendar month, for an approximate revenue estimate.
router.get('/admin/watch-stats', requireAuth, requireAdmin, async (req, res) => {
  const monthParam = typeof req.query.month === 'string' ? req.query.month : undefined;
  const parsedMonth = monthParam ? watchStatsMonthSchema.safeParse(monthParam) : null;
  const now = new Date();
  const label = parsedMonth?.success ? parsedMonth.data : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const grouped = await prisma.videoWatchStat.groupBy({
    by: ['youtubeId'],
    where: { day: { startsWith: label } },
    _sum: { secondsWatched: true },
  });
  if (grouped.length === 0) return res.json({ month: label, totalSeconds: 0, rows: [] });

  const videos = await prisma.video.findMany({
    where: { youtubeId: { in: grouped.map((g) => g.youtubeId) } },
    select: { youtubeId: true, videoTitle: true, subject: true, chapterName: true, classSort: true },
  });
  const videoById = new Map(videos.map((v) => [v.youtubeId, v]));

  const rows = grouped
    .map((g) => {
      const v = videoById.get(g.youtubeId);
      const seconds = g._sum.secondsWatched ?? 0;
      return {
        youtubeId: g.youtubeId,
        title: v?.videoTitle ?? '(deleted video)',
        subject: v?.subject ?? '',
        chapterName: v?.chapterName ?? '',
        classSort: v?.classSort ?? '',
        seconds,
        hours: Math.round((seconds / 3600) * 100) / 100,
      };
    })
    .sort((a, b) => b.seconds - a.seconds);

  res.json({ month: label, totalSeconds: rows.reduce((n, r) => n + r.seconds, 0), rows });
});

export default router;
