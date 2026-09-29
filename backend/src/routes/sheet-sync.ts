/**
 * POST /api/admin/sync-sheet         — JSON array of rows (Apps Script, or programmatic sync)
 * POST /api/admin/sync-sheet/upload  — an .xlsx file (admin panel "Upload Excel" button)
 *
 * Both funnel into shared/syncVideoRows.ts, which upserts into the Video table:
 *  - Keyed on youtubeId. New rows are inserted; existing rows only update sheet-managed fields.
 *  - isActive / isPremium / pyqAvailable are NEVER overwritten for existing rows.
 *  - A SHA-256 hash of sheet fields is stored; rows where nothing changed are skipped.
 *  - Returns a summary: { total, created, updated, skipped, errors }.
 *
 * Auth: an active admin session (requireAuth + requireAdmin), or — for the JSON route only,
 * since that's what the Apps Script calls — a matching X-Sync-Secret header.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import multer from 'multer';
import { read as readWorkbook, utils as xlsxUtils, type WorkBook } from 'xlsx';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { syncVideoRows, type SheetRow } from '../shared/syncVideoRows.js';
import { rowsFromSheetCells } from '../shared/sheetColumns.js';
import { fetchSheetCsv } from '../shared/sheetUrl.js';

export const sheetSyncRouter = Router();
export const LINKED_SHEET_SETTING_KEY = 'video_catalog_sheet_url';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/** Constant-time string compare — plain `===` leaks timing info an attacker could use to guess the secret byte-by-byte. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Auth guard: admin session OR matching X-Sync-Secret header. */
function syncAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SHEET_SYNC_SECRET;
  const provided = req.headers['x-sync-secret'];
  if (secret && typeof provided === 'string' && safeEqual(provided, secret)) return next();
  requireAuth(req, res, () => requireAdmin(req, res, next));
}

sheetSyncRouter.post('/', syncAuth, async (req: Request, res: Response) => {
  const rows: SheetRow[] = Array.isArray(req.body) ? req.body : req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array of video rows.' });
  }
  res.json(await syncVideoRows(rows));
});

/** Fetches a Google Sheet by URL, parses it the same way as an Excel upload, and syncs it. */
export async function syncFromSheetUrl(sheetUrl: string) {
  const csv = await fetchSheetCsv(sheetUrl);
  const workbook = readWorkbook(csv, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const cellRows = xlsxUtils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });

  const { rows, missingColumns } = rowsFromSheetCells(cellRows);
  if (missingColumns.length > 0) {
    throw new Error(`Missing columns in "${sheetName}": ${missingColumns.join(', ')}`);
  }
  if (rows.length === 0) {
    throw new Error(`No valid rows found in "${sheetName}".`);
  }
  return syncVideoRows(rows);
}

sheetSyncRouter.post('/url', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });

  let result;
  try {
    result = await syncFromSheetUrl(url);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }

  // Only remember the link once it has proven it actually works, so the background poller
  // never gets stuck retrying a broken URL every cycle.
  await prisma.appSetting.upsert({
    where: { key: LINKED_SHEET_SETTING_KEY },
    create: { key: LINKED_SHEET_SETTING_KEY, value: { url } },
    update: { value: { url } },
  });
  res.json(result);
});

sheetSyncRouter.delete('/url', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  await prisma.appSetting.delete({ where: { key: LINKED_SHEET_SETTING_KEY } }).catch(() => undefined);
  res.json({ ok: true });
});

sheetSyncRouter.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (expected field "file").' });

  let workbook: WorkBook;
  try {
    workbook = readWorkbook(req.file.buffer, { type: 'buffer' });
  } catch {
    return res.status(400).json({ error: 'Could not read this file as an Excel workbook.' });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const cellRows = xlsxUtils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  const { rows, missingColumns } = rowsFromSheetCells(cellRows);
  if (missingColumns.length > 0) {
    return res.status(400).json({ error: `Missing columns in "${sheetName}": ${missingColumns.join(', ')}` });
  }
  if (rows.length === 0) {
    return res.status(400).json({ error: `No valid rows found in "${sheetName}".` });
  }

  res.json(await syncVideoRows(rows));
});
