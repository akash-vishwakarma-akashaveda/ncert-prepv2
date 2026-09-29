import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin, clearSessionCookie } from '../middleware/auth.js';
import { sendEmail } from '../shared/email.js';
import { eraseUser } from '../shared/erase-user.js';
import { toPublicUser } from '../shared/publicUser.js';

const RECENT_LOGIN_WINDOW_SECONDS = 5 * 60;

const router = Router();
router.use(requireAuth);

const NOTICE_VERSION = process.env.DPDP_NOTICE_VERSION ?? '2026-01';

router.get('/count-by-class', requireAdmin, async (_req, res) => {
  const groups = await prisma.user.groupBy({ by: ['classGrade'], _count: { _all: true } });
  const byClass: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    total += g._count._all;
    if (g.classGrade != null) byClass[String(g.classGrade).padStart(2, '0')] = g._count._all;
  }
  res.json({ total, byClass });
});

router.get('/me/referral-stats', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { referralCode: true } });
  if (!user?.referralCode) return res.json({ code: null, referredThisMonth: 0, referredTotal: 0 });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [referredThisMonth, referredTotal] = await Promise.all([
    prisma.user.count({ where: { referredByCode: user.referralCode, createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { referredByCode: user.referralCode } }),
  ]);
  res.json({ code: user.referralCode, referredThisMonth, referredTotal });
});

const monthParamSchema = z.string().regex(/^\d{4}-\d{2}$/);

// Per-referral-code registration counts for one calendar month (defaults to the current month).
router.get('/referrals', requireAdmin, async (req, res) => {
  const monthParam = typeof req.query.month === 'string' ? req.query.month : undefined;
  const parsedMonth = monthParam ? monthParamSchema.safeParse(monthParam) : null;
  const now = new Date();
  const [year, month] = parsedMonth?.success
    ? parsedMonth.data.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const label = `${year}-${String(month).padStart(2, '0')}`;

  const grouped = await prisma.user.groupBy({
    by: ['referredByCode'],
    where: { referredByCode: { not: null }, createdAt: { gte: monthStart, lt: monthEnd } },
    _count: { _all: true },
  });
  if (grouped.length === 0) return res.json({ month: label, rows: [] });

  const codes = grouped.map((g) => g.referredByCode!).filter(Boolean);
  const owners = await prisma.user.findMany({
    where: { referralCode: { in: codes } },
    select: { referralCode: true, displayName: true, email: true },
  });
  const ownerByCode = new Map(owners.map((o) => [o.referralCode, o]));

  const rows = grouped
    .map((g) => {
      const owner = ownerByCode.get(g.referredByCode!);
      return {
        code: g.referredByCode!,
        ownerName: owner?.displayName || null,
        ownerEmail: owner?.email || null,
        count: g._count._all,
      };
    })
    .sort((a, b) => b.count - a.count);

  res.json({ month: label, rows });
});

const CONSENT_REQUEST_TTL_DAYS = 14;

const profileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  // Either a real Google profile picture URL, or a built-in avatar id like "owl" (data/avatars.tsx)
  // — not always a URL, so no .url() constraint.
  photoUrl: z.string().max(500).optional(),
  phoneNumber: z.string().optional(),
  classGrade: z.number().int().min(1).max(12).optional(),
  studyGoalMinutes: z.number().int().min(0).optional(),
  focusSubjects: z.array(z.string()).optional(),
  // '' clears the choice; the frontend's STREAMS list is the source of these ids.
  stream: z.enum(['science', 'commerce', 'humanities', '']).optional(),
  lastWatchedVideo: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  streak: z.number().int().min(0).optional(),
  lastActiveDate: z.string().optional(),
});

router.patch('/me/profile', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // '' means "no stream": store it as null rather than an empty string nothing else understands.
  const { stream, ...rest } = parsed.data;
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { ...rest, ...(stream !== undefined ? { stream: stream || null } : {}) },
  });
  res.json(toPublicUser(user));
});

const settingsSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  reminderFrequency: z.enum(['daily', 'weekly']).optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
});

router.patch('/me/settings', async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.update({ where: { id: req.user!.userId }, data: parsed.data });
  res.json(toPublicUser(user));
});

const adultConsentSchema = z.object({ language: z.enum(['en', 'hi']).default('en') });

router.post('/me/consent/adult', async (req, res) => {
  const parsed = adultConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      consentStatus: 'GRANTED',
      consentAgeGroup: 'adult',
      consentMethod: 'self',
      consentNoticeVersion: NOTICE_VERSION,
      consentLanguage: parsed.data.language,
      consentGrantedAt: new Date(),
    },
  });
  res.json(toPublicUser(user));
});

const parentConsentSchema = z.object({
  parentName: z.string().min(1),
  parentEmail: z.string().email(),
  language: z.enum(['en', 'hi']).default('en'),
});

router.post('/me/consent/parent-request', async (req, res) => {
  const parsed = parentConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { parentName, parentEmail, language } = parsed.data;

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + CONSENT_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        consentAgeGroup: 'child',
        consentMethod: 'parent',
        consentNoticeVersion: NOTICE_VERSION,
        consentLanguage: language,
        consentParentName: parentName,
        consentParentEmail: parentEmail,
        consentRequestedAt: new Date(),
      },
    }),
    prisma.consentRequest.create({
      data: { token, userId: req.user!.userId, status: 'PENDING', expiresAt },
    }),
  ]);

  const sent = await sendEmail(parentEmail, 'Approve your child’s NCERT Prep account', {
    heading: `Hello ${parentName}, your child wants to use NCERT Prep`,
    lines: [
      'Your child has signed up for NCERT Prep, a free learning app with NCERT video lessons for their class.',
      'Because they are under 18, we need your permission before they can use their account. Please review what we collect and approve or decline.',
    ],
    action: { label: 'Review and approve', url: `${process.env.FRONTEND_ORIGIN}/parent-consent?token=${token}` },
    footnote: `This link expires in ${CONSENT_REQUEST_TTL_DAYS} days. If you do not recognise this request, you can ignore this email.`,
  });
  if (!sent) return res.status(502).json({ error: 'We could not send the email to your parent right now. Please try again later.' });

  res.json({ parentEmail });
});

router.delete('/me', async (req, res) => {
  // Same idea as Firebase's requires-recent-login: the session must have been issued within the
  // last 5 minutes, so a stolen long-lived session cookie alone can't delete the account. The
  // client re-establishes recency by signing in again (password login or a fresh Google token),
  // which reissues the session cookie with a new iat.
  const iat = req.user!.iat ?? 0;
  if (Date.now() / 1000 - iat > RECENT_LOGIN_WINDOW_SECONDS) {
    return res.status(401).json({ error: 'requires-recent-login' });
  }
  await eraseUser(req.user!.userId);
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
