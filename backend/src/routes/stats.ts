import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin, SESSION_COOKIE, verifySessionToken } from '../middleware/auth.js';
import { bumpStat } from '../shared/stats.js';

const router = Router();

/** IST calendar day, e.g. "2026-09-23". */
function istDay(offsetDays = 0): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

// Public — visitors aren't signed in. The client already dedupes "once per IST day" itself
// (localStorage); this just bumps whichever counters apply to this call.
router.post('/track-visit', async (req, res) => {
  void bumpStat('visitors');
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    try {
      verifySessionToken(token);
      void bumpStat('activeStudents');
    } catch {
      // not a valid session — still counted as a visitor above, just not an active student
    }
  }
  res.json({ ok: true });
});

router.use(requireAuth, requireAdmin);

router.get('/daily', async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const rows = await prisma.statsDaily.findMany({
    where: { day: { gte: istDay(-(days - 1)) } },
    orderBy: { day: 'asc' },
  });
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const result = Array.from({ length: days }, (_, i) => {
    const day = istDay(-(days - 1 - i));
    const row = byDay.get(day);
    return {
      date: day,
      visitors: row?.visitors ?? 0,
      newVisitors: row?.newVisitors ?? 0,
      activeStudents: row?.activeStudents ?? 0,
      registrations: row?.registrations ?? 0,
      lessonsStarted: row?.lessonsStarted ?? 0,
      lessonsCompleted: row?.lessonsCompleted ?? 0,
      doubtsAsked: row?.doubtsAsked ?? 0,
    };
  });
  res.json(result);
});

router.get('/totals', async (_req, res) => {
  const row = await prisma.statsTotal.findUnique({ where: { id: 'totals' } });
  res.json({
    visitors: row?.visitors ?? 0,
    registrations: row?.registrations ?? 0,
    lessonsStarted: row?.lessonsStarted ?? 0,
    lessonsCompleted: row?.lessonsCompleted ?? 0,
    doubtsAsked: row?.doubtsAsked ?? 0,
  });
});

export default router;
