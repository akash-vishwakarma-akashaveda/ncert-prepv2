/**
 * POST /api/admin/sync-sheet
 *
 * Called by the Google Apps Script (or the admin panel "Sync from Sheet" button).
 * Accepts a JSON array of video rows read from the Google Sheet and upserts them
 * into the `Video` table.
 *
 * Rules that match the Firestore sync behaviour from scripts/google-apps-script-sync.js:
 *  - Keyed on youtubeId.  New rows are inserted; existing rows only update sheet-managed fields.
 *  - isActive / isPremium / pyqAvailable are NEVER overwritten for existing rows.
 *  - A SHA-256 hash of sheet fields is stored; rows where nothing changed are skipped.
 *  - Returns a summary: { total, created, updated, skipped, errors }.
 *
 * Auth: requires an active admin session (requireAuth + requireAdmin middleware).
 * The Apps Script sends a shared secret in the X-Sync-Secret header instead, so
 * both paths are supported (session cookie OR X-Sync-Secret).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { prisma as db } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const sheetSyncRouter = Router();

// ── Types ────────────────────────────────────────────────────────────────────

/** One row as sent by the Apps Script / admin panel. */
interface SheetRow {
  youtube_id: string;
  class_sort: string;       // e.g. "09"
  class_display: string;    // e.g. "Class IX"
  subject: string;
  textbook?: string;
  chapter_id: string;       // e.g. "Chapter 1"
  chapter_name: string;
  video_title: string;
  yt_public?: boolean;      // true = public on YouTube
  pdf_url?: string;
  timestamps?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Pads a class numeral to 2 digits: "9" → "09", "Class 9" → "09". */
function normaliseClassSort(raw: string): string {
  const num = parseInt(raw.replace(/\D/g, ''), 10);
  return isNaN(num) ? raw.trim() : String(num).padStart(2, '0');
}

/** SHA-256 of sheet-managed fields — used to skip unchanged rows. */
function contentHash(row: SheetRow): string {
  const payload = [
    row.class_sort,
    row.class_display,
    row.subject,
    row.textbook ?? '',
    row.chapter_id,
    row.chapter_name,
    row.video_title,
    String(row.yt_public ?? true),
    row.pdf_url ?? '',
    row.timestamps ?? '',
  ].join('\x00');
  return createHash('sha256').update(payload).digest('hex');
}

/** Auth guard: admin session OR matching X-Sync-Secret header. */
function syncAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SHEET_SYNC_SECRET;
  if (secret && req.headers['x-sync-secret'] === secret) return next();
  // Fall back to normal admin session check
  requireAuth(req, res, () => requireAdmin(req, res, next));
}

// ── Route ────────────────────────────────────────────────────────────────────

sheetSyncRouter.post('/', syncAuth, async (req: Request, res: Response) => {
  const rows: SheetRow[] = Array.isArray(req.body) ? req.body : req.body?.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'Body must be a non-empty array of video rows.' });
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const youtubeId = (raw.youtube_id ?? '').trim();
    if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
      errors.push(`Skipped invalid youtubeId: "${youtubeId}"`);
      continue;
    }

    const row: SheetRow = {
      ...raw,
      youtube_id: youtubeId,
      class_sort: normaliseClassSort(raw.class_sort ?? ''),
      class_display: (raw.class_display ?? '').trim(),
      subject: (raw.subject ?? '').trim(),
      textbook: (raw.textbook ?? '').trim(),
      chapter_id: (raw.chapter_id ?? '').replace(/^chapter\s*/i, 'Chapter ').trim(),
      chapter_name: (raw.chapter_name ?? '').trim(),
      video_title: (raw.video_title ?? '').split(' | ')[0].trim(),
      yt_public: raw.yt_public !== false,
      pdf_url: (raw.pdf_url ?? '').trim(),
      timestamps: (raw.timestamps ?? '').trim(),
    };

    const hash = contentHash(row);

    try {
      const existing = await db.video.findUnique({ where: { youtubeId } });

      if (!existing) {
        // New video — insert with defaults for admin-only flags
        await db.video.create({
          data: {
            youtubeId,
            classSort: row.class_sort,
            classDisplay: row.class_display,
            subject: row.subject,
            textbook: row.textbook ?? '',
            chapterId: row.chapter_id,
            chapterName: row.chapter_name,
            videoTitle: row.video_title,
            ytPublic: row.yt_public ?? true,
            pdfUrl: row.pdf_url ?? '',
            timestamps: row.timestamps ?? '',
            isActive: true,
            isPremium: false,
            pyqAvailable: false,
            contentHash: hash,
            syncedAt: new Date(),
          },
        });
        created++;
      } else if (existing.contentHash === hash) {
        // Nothing changed — skip
        skipped++;
      } else {
        // Sheet content changed — update only sheet-managed fields
        await db.video.update({
          where: { youtubeId },
          data: {
            classSort: row.class_sort,
            classDisplay: row.class_display,
            subject: row.subject,
            textbook: row.textbook ?? '',
            chapterId: row.chapter_id,
            chapterName: row.chapter_name,
            videoTitle: row.video_title,
            ytPublic: row.yt_public ?? true,
            pdfUrl: row.pdf_url ?? '',
            timestamps: row.timestamps ?? '',
            contentHash: hash,
            syncedAt: new Date(),
            // isActive / isPremium / pyqAvailable are intentionally NOT listed here
          },
        });
        updated++;
      }
    } catch (err) {
      errors.push(`${youtubeId}: ${(err as Error).message}`);
    }
  }

  res.json({
    ok: true,
    total: rows.length,
    created,
    updated,
    skipped,
    errors,
  });
});
