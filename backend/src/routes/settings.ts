import { Router } from 'express';
import type { Server } from 'socket.io';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public read: both platform feature flags and the student dashboard config need to reach
// students, not just admins. Only two keys are ever used ("platform", "student_dashboard"),
// but this stays generic rather than hardcoding them.
router.get('/:key', async (req, res) => {
  const row = await prisma.appSetting.findUnique({ where: { key: req.params.key } });
  res.json(row?.value ?? null);
});

router.put('/:key', requireAuth, requireAdmin, async (req, res) => {
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
