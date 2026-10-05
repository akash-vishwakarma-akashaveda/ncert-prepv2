import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { eraseUser } from '../shared/erase-user.js';

const router = Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

type PublicStatus = 'pending' | 'approved' | 'refused' | 'expired' | 'superseded';

async function publicStatus(request: { userId: string; status: string; expiresAt: Date; createdAt: Date }): Promise<PublicStatus> {
  if (request.status === 'GRANTED') return 'approved';
  if (request.status === 'DECLINED') return 'refused';
  if (request.expiresAt < new Date()) return 'expired';
  const newer = await prisma.consentRequest.findFirst({
    where: { userId: request.userId, status: 'PENDING', createdAt: { gt: request.createdAt } },
    select: { token: true },
  });
  return newer ? 'superseded' : 'pending';
}

router.get('/:token', async (req, res) => {
  const request = await prisma.consentRequest.findUnique({
    where: { token: req.params.token },
    include: { user: { select: { displayName: true, email: true, consentParentEmail: true } } },
  });
  if (!request) return res.status(404).json({ error: 'This link is not valid.' });

  res.json({
    childName: request.user.displayName ?? request.user.email,
    parentEmail: request.user.consentParentEmail ?? '',
    status: await publicStatus(request),
  });
});

const decideSchema = z.object({
  decision: z.enum(['approve', 'refuse']),
  declaredGuardian: z.boolean(),
  agreed: z.boolean(),
  language: z.enum(['en', 'hi']).default('en'),
});

// The token was emailed to the parent, so holding it is the proof: no parent account or sign-in is needed.
router.post('/:token/decide', async (req, res) => {
  const parsed = decideSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const request = await prisma.consentRequest.findUnique({
    where: { token: req.params.token },
    include: { user: { select: { consentParentEmail: true } } },
  });
  if (!request) return res.status(404).json({ error: 'This link is not valid.' });

  const status = await publicStatus(request);
  if (status !== 'pending') return res.status(409).json({ error: 'This request is no longer pending.', status });

  if (parsed.data.decision === 'approve') {
    if (!parsed.data.declaredGuardian || !parsed.data.agreed) {
      return res.status(400).json({ error: 'Both checkboxes must be confirmed to approve.' });
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: request.userId }, data: { consentStatus: 'GRANTED', consentMethod: 'parent', consentGrantedAt: new Date() } }),
      prisma.consentRequest.update({ where: { token: request.token }, data: { status: 'GRANTED' } }),
    ]);
    return res.json({ status: 'approved' as PublicStatus });
  }

  // DPDP: a refused parental consent request erases the child's account entirely.
  await prisma.consentRequest.update({ where: { token: request.token }, data: { status: 'DECLINED' } }).catch(() => undefined);
  await eraseUser(request.userId);
  res.json({ status: 'refused' as PublicStatus });
});

export default router;
