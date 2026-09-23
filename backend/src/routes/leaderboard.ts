import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Own class only — a student never sees another class's ranking.
router.get('/', async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { classGrade: true } });
  if (me?.classGrade == null) return res.json([]);

  const rows = await prisma.user.findMany({
    where: { classGrade: me.classGrade },
    orderBy: { xp: 'desc' },
    take: 50,
    select: { id: true, displayName: true, xp: true, streak: true },
  });
  res.json(rows);
});

export default router;
