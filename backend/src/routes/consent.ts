import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { eraseUser } from '../shared/erase-user.js';

const router = Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

router.get('/:token', async (req, res) => {
  const request = await prisma.consentRequest.findUnique({
    where: { token: req.params.token },
    include: { user: { select: { displayName: true, email: true, classGrade: true, consentParentName: true } } },
  });
  if (!request || request.status !== 'PENDING' || request.expiresAt < new Date()) {
    return res.status(404).json({ error: 'This link is invalid or has expired.' });
  }
  res.json({
    childName: request.user.displayName ?? request.user.email,
    classGrade: request.user.classGrade,
    parentName: request.user.consentParentName,
  });
});

const decideSchema = z.object({ decision: z.enum(['approve', 'decline']) });

router.post('/:token/decide', async (req, res) => {
  const parsed = decideSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const request = await prisma.consentRequest.findUnique({ where: { token: req.params.token } });
  if (!request || request.status !== 'PENDING' || request.expiresAt < new Date()) {
    return res.status(404).json({ error: 'This link is invalid or has expired.' });
  }

  if (parsed.data.decision === 'approve') {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data: { consentStatus: 'GRANTED', consentGrantedAt: new Date() },
      }),
      prisma.consentRequest.update({ where: { token: request.token }, data: { status: 'GRANTED' } }),
    ]);
  } else {
    // DPDP: a declined parental consent request erases the child's account entirely.
    await eraseUser(request.userId);
  }

  res.json({ ok: true });
});

export default router;
