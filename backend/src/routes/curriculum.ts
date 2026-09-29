import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public read: the student-facing catalogue needs this to render class/subject/chapter names,
// ordering and visibility overlays. Only writes are admin-only.
router.get('/', async (_req, res) => {
  const [classes, subjects, chapters] = await Promise.all([
    prisma.curriculumClass.findMany(),
    prisma.curriculumSubject.findMany(),
    prisma.curriculumChapter.findMany(),
  ]);
  res.json({
    classes: classes.map((c) => ({ id: c.id, class_sort: c.classSort, name: c.name, order: c.order, isActive: c.isActive, description: c.description ?? undefined })),
    subjects: subjects.map((s) => ({ id: s.id, class_sort: s.classSort, name: s.name, textbook: s.textbook ?? undefined, order: s.order, isActive: s.isActive })),
    chapters: chapters.map((c) => ({ id: c.id, class_sort: c.classSort, subject: c.subject, textbook: c.textbook ?? undefined, chapter_id: c.chapterId, chapter_name: c.chapterName, order: c.order, isActive: c.isActive })),
  });
});

router.use(requireAuth, requireAdmin);

const classSchema = z.object({ id: z.string().min(1), class_sort: z.string().min(1), name: z.string().min(1), order: z.number().int().default(0), isActive: z.boolean().default(true), description: z.string().optional() });
const subjectSchema = z.object({ id: z.string().min(1), class_sort: z.string().min(1), name: z.string().min(1), textbook: z.string().optional(), order: z.number().int().default(0), isActive: z.boolean().default(true) });
const chapterSchema = z.object({ id: z.string().min(1), class_sort: z.string().min(1), subject: z.string().min(1), textbook: z.string().optional(), chapter_id: z.string().min(1), chapter_name: z.string().min(1), order: z.number().int().default(0), isActive: z.boolean().default(true) });

const batchSchema = z.object({
  classes: z.array(classSchema).default([]),
  subjects: z.array(subjectSchema).default([]),
  chapters: z.array(chapterSchema).default([]),
});

router.post('/batch', async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { classes, subjects, chapters } = parsed.data;

  await prisma.$transaction([
    ...classes.map((c) =>
      prisma.curriculumClass.upsert({
        where: { id: c.id },
        create: { id: c.id, classSort: c.class_sort, name: c.name, order: c.order, isActive: c.isActive, description: c.description },
        update: { classSort: c.class_sort, name: c.name, order: c.order, isActive: c.isActive, description: c.description },
      }),
    ),
    ...subjects.map((s) =>
      prisma.curriculumSubject.upsert({
        where: { id: s.id },
        create: { id: s.id, classSort: s.class_sort, name: s.name, textbook: s.textbook, order: s.order, isActive: s.isActive },
        update: { classSort: s.class_sort, name: s.name, textbook: s.textbook, order: s.order, isActive: s.isActive },
      }),
    ),
    ...chapters.map((c) =>
      prisma.curriculumChapter.upsert({
        where: { id: c.id },
        create: { id: c.id, classSort: c.class_sort, subject: c.subject, textbook: c.textbook, chapterId: c.chapter_id, chapterName: c.chapter_name, order: c.order, isActive: c.isActive },
        update: { classSort: c.class_sort, subject: c.subject, textbook: c.textbook, chapterId: c.chapter_id, chapterName: c.chapter_name, order: c.order, isActive: c.isActive },
      }),
    ),
  ]);

  res.json({ ok: true, total: classes.length + subjects.length + chapters.length });
});

router.delete('/:kind/:id', async (req, res) => {
  const { kind, id } = req.params;
  if (kind === 'classes') await prisma.curriculumClass.delete({ where: { id } }).catch(() => null);
  else if (kind === 'subjects') await prisma.curriculumSubject.delete({ where: { id } }).catch(() => null);
  else if (kind === 'chapters') await prisma.curriculumChapter.delete({ where: { id } }).catch(() => null);
  else return res.status(400).json({ error: 'Unknown kind' });
  res.json({ ok: true });
});

export default router;
