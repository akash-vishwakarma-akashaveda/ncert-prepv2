import { prisma } from '../db.js';
import { logger } from './logger.js';
import { LINKED_SHEET_SETTING_KEY } from '../routes/sheet-sync.js';
import { syncFromSheetUrl } from '../routes/sheet-sync.js';

const POLL_INTERVAL_MS = 10 * 60 * 1000;

/** Re-syncs the admin-linked Google Sheet on a timer, so catalog edits show up without a manual upload. */
export function startSheetSyncScheduler() {
  setInterval(async () => {
    const row = await prisma.appSetting.findUnique({ where: { key: LINKED_SHEET_SETTING_KEY } });
    const url = (row?.value as { url?: string } | null)?.url;
    if (!url) return;
    try {
      const result = await syncFromSheetUrl(url);
      logger.info({ result }, 'Scheduled sheet sync completed');
    } catch (err) {
      logger.warn({ err }, 'Scheduled sheet sync failed');
    }
  }, POLL_INTERVAL_MS).unref();
}
