import { Router } from 'express';
import type { Server } from 'socket.io';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Only these two are meant for everyone (feature flags, student dashboard). Every other key, such as
// the linked catalogue Google Sheet, is admin-only to read.
const PUBLIC_KEYS = new Set(['platform', 'student_dashboard']);
const KEY_FORMAT = /^[a-z0-9_]{1,64}$/;

router.get('/:key', (req, res, next) => (PUBLIC_KEYS.has(req.params.key) ? next() : requireAuth(req, res, () => requireAdmin(req, res, next))), async (req, res) => {
  const row = await prisma.appSetting.findUnique({ where: { key: req.params.key } });
  res.json(row?.value ?? null);
});

/** Announcement buttons may only lead inside the app: children follow them. */
function invalidAnnouncementLink(value: unknown): boolean {
  const anns = (value as { announcements?: { actionUrl?: unknown }[] } | null)?.announcements;
  return Array.isArray(anns) && anns.some((a) => a?.actionUrl != null && a.actionUrl !== '' && !(typeof a.actionUrl === 'string' && a.actionUrl.startsWith('/') && !a.actionUrl.startsWith('//')));
}

router.put('/:key', requireAuth, requireAdmin, async (req, res) => {
  if (!KEY_FORMAT.test(req.params.key)) return res.status(400).json({ error: 'Invalid settings key' });
  if (req.params.key === 'student_dashboard' && invalidAnnouncementLink(req.body)) {
    return res.status(400).json({ error: 'Announcement links must be app paths that start with "/"' });
  }
  const row = await prisma.appSetting.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value: req.body },
    update: { value: req.body },
  });
  // Every connected client, so announcements / spotlight / access policy reach open dashboards live.
  (req.app.get('io') as Server | undefined)?.emit('settings:changed', req.params.key);
  res.json(row.value);
});

export default router;
