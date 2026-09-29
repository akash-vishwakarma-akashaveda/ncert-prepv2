import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createUploadUrl, deleteObject, isS3Configured } from '../shared/s3.js';

const router = Router();

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function toPublicNote(n: {
  id: string; classSort: string; subject: string; chapterId: string; chapterName: string;
  title: string; summary: string; keyPoints: string[]; formulas: string[]; examTips: string[];
  attachments: unknown; isPublished: boolean; updatedAt: Date; updatedBy: string | null;
}) {
  return {
    id: n.id,
    class_sort: n.classSort,
    subject: n.subject,
    chapter_id: n.chapterId,
    chapter_name: n.chapterName,
    title: n.title,
    summary: n.summary,
    key_points: n.keyPoints,
    formulas: n.formulas,
    exam_tips: n.examTips,
    attachments: n.attachments,
    isPublished: n.isPublished,
    updated_at: n.updatedAt.getTime(),
    updated_by: n.updatedBy,
  };
}

router.get('/published', async (req, res) => {
  const classSort = typeof req.query.classSort === 'string' ? req.query.classSort : undefined;
  if (!classSort) return res.json([]);
  const rows = await prisma.chapterNote.findMany({ where: { classSort, isPublished: true }, select: { id: true } });
  res.json(rows.map((r) => r.id));
});

router.get('/:id', async (req, res) => {
  const note = await prisma.chapterNote.findUnique({ where: { id: req.params.id } });
  if (!note || !note.isPublished) return res.status(404).json({ error: 'Not found' });
  res.json(toPublicNote(note));
});

router.use(requireAuth, requireAdmin);

router.get('/', async (_req, res) => {
  const notes = await prisma.chapterNote.findMany();
  res.json(notes.map(toPublicNote));
});

const noteSchema = z.object({
  class_sort: z.string().min(1),
  subject: z.string().min(1),
  chapter_id: z.string().min(1),
  chapter_name: z.string().min(1),
  title: z.string().default(''),
  summary: z.string().default(''),
  key_points: z.array(z.string()).default([]),
  formulas: z.array(z.string()).default([]),
  exam_tips: z.array(z.string()).default([]),
  attachments: z.array(z.object({
    name: z.string(), url: z.string(), path: z.string(), contentType: z.string(), size: z.number(), uploaded_at: z.number(),
  })).default([]),
  isPublished: z.boolean().default(false),
});

router.put('/:id', async (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const me = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { displayName: true } });
  const { class_sort, subject, chapter_id, chapter_name, title, summary, key_points, formulas, exam_tips, attachments, isPublished } = parsed.data;

  const note = await prisma.chapterNote.upsert({
    where: { id: req.params.id },
    create: {
      id: req.params.id, classSort: class_sort, subject, chapterId: chapter_id, chapterName: chapter_name,
      title, summary, keyPoints: key_points, formulas, examTips: exam_tips, attachments, isPublished, updatedBy: me?.displayName,
    },
    update: {
      classSort: class_sort, subject, chapterId: chapter_id, chapterName: chapter_name,
      title, summary, keyPoints: key_points, formulas, examTips: exam_tips, attachments, isPublished, updatedBy: me?.displayName,
    },
  });
  res.json(toPublicNote(note));
});

router.delete('/:id', async (req, res) => {
  const note = await prisma.chapterNote.findUnique({ where: { id: req.params.id } });
  if (note) {
    const attachments = (note.attachments as { path: string }[]) ?? [];
    await Promise.all(attachments.map((a) => deleteObject(a.path)));
    await prisma.chapterNote.delete({ where: { id: req.params.id } });
  }
  res.json({ ok: true });
});

const uploadUrlSchema = z.object({
  noteId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

router.post('/upload-url', async (req, res) => {
  if (!isS3Configured()) {
    return res.status(503).json({ error: 'File storage is not configured yet (S3_NOTES_BUCKET missing).' });
  }
  const parsed = uploadUrlSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { noteId, fileName, contentType, size } = parsed.data;

  if (!ALLOWED_ATTACHMENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'Only PDF, PNG, JPG or WEBP files are allowed.' });
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    return res.status(400).json({ error: `Files must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.` });
  }

  // noteId reaches the S3 key unescaped below — strip anything but word chars/dots/dashes so it
  // can't smuggle a path-traversal segment (e.g. "../other-bucket-prefix") into the object key.
  const safeNoteId = noteId.replace(/[^\w.-]+/g, '_').slice(0, 120);
  const safeName = fileName.replace(/[^\w.-]+/g, '_').slice(-120);
  const path = `notes/${safeNoteId}/${Date.now()}_${safeName}`;
  const { uploadUrl, publicUrl } = await createUploadUrl(path, contentType);
  res.json({ uploadUrl, publicUrl, path });
});

// Only ever lets an admin delete objects under the notes/ prefix this route itself hands out —
// without this, any string in the body would delete an arbitrary key in the bucket.
const NOTES_PATH = /^notes\/[\w.-]+\/[\w.-]+$/;

router.post('/delete-attachment', async (req, res) => {
  const path = typeof req.body?.path === 'string' ? req.body.path : undefined;
  if (!path || !NOTES_PATH.test(path)) return res.status(400).json({ error: 'Invalid attachment path' });
  await deleteObject(path);
  res.json({ ok: true });
});

export default router;
