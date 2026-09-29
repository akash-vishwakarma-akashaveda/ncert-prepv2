import { createHash } from 'node:crypto';
import { prisma } from '../db.js';

/** One row as sent by the Apps Script, the admin panel's JSON sync, or a parsed Excel upload. */
export interface SheetRow {
  youtube_id: string;
  class_sort: string; // e.g. "09"
  class_display: string; // e.g. "Class IX"
  subject: string;
  textbook?: string;
  chapter_id: string; // e.g. "Chapter 1"
  chapter_name: string;
  video_title: string;
  yt_public?: boolean; // true = public on YouTube
  pdf_url?: string;
  timestamps?: string;
}

export interface SyncResult {
  ok: true;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

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

/**
 * Upserts video rows into the Video table, keyed on youtubeId. New rows are inserted with
 * isActive=true/isPremium=false defaults; existing rows only update sheet-managed fields —
 * isActive/isPremium/pyqAvailable (admin moderation) are never overwritten. Rows whose content
 * hash matches what's already stored are skipped entirely.
 *
 * Shared by the Apps Script / admin JSON sync (POST /) and the admin Excel upload (POST /upload)
 * so both take the exact same normalisation and change-detection path.
 */
export async function syncVideoRows(rows: SheetRow[]): Promise<SyncResult> {
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
      const existing = await prisma.video.findUnique({ where: { youtubeId } });

      if (!existing) {
        await prisma.video.create({
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
        skipped++;
      } else {
        await prisma.video.update({
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

  return { ok: true, total: rows.length, created, updated, skipped, errors };
}
