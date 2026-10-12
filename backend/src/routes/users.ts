import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin, requireConsent, clearSessionCookie } from '../middleware/auth.js';
import { sendEmail } from '../shared/email.js';
import { eraseUser } from '../shared/erase-user.js';
import { toPublicUser } from '../shared/publicUser.js';

const RECENT_LOGIN_WINDOW_SECONDS = 5 * 60;

const router = Router();
router.use(requireAuth);

// Must match NOTICE_VERSION in frontend/src/data/privacyNotice.ts; the app asks for consent again
// whenever the version a user consented to is older than the current one.
const NOTICE_VERSION = process.env.DPDP_NOTICE_VERSION ?? '2026-10';

// Every consent route can email a parent: cap them per account so they cannot be used to spam.
const consentEmailLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.userId,
  message: { error: 'Too many requests today. Try again tomorrow.' },
});

/** Consent is only taken from an account whose email is confirmed (Google sign-ins always are). */
async function emailVerified(userId: string): Promise<boolean> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  return Boolean(me?.emailVerified);
}

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
  // Only real sign-ups count: a confirmed email and recorded consent, so throwaway accounts do not.
  const real = { referredByCode: user.referralCode, emailVerified: true, consentStatus: 'GRANTED' as const };
  const [referredThisMonth, referredTotal] = await Promise.all([
    prisma.user.count({ where: { ...real, createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: real }),
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
    where: { referredByCode: { not: null }, emailVerified: true, consentStatus: 'GRANTED', createdAt: { gte: monthStart, lt: monthEnd } },
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

// A built-in avatar id like "owl" (frontend data/avatars.tsx), or a Google profile photo. Nothing else:
// the photo is shown to classmates on the leaderboard, so it must not point at an arbitrary server.
const GOOGLE_PHOTO = /^https:\/\/lh\d\.googleusercontent\.com\/[^\s"'<>]+$/;
const AVATAR_ID = /^[a-z0-9-]{1,30}$/;

// Text without control characters (NUL bytes break Postgres text columns).
const plainText = (max: number) => z.string().max(max).refine((v) => !/[\u0000-\u001f]/.test(v), 'Invalid characters');

const profileSchema = z.object({
  displayName: plainText(80).pipe(z.string().min(1)).optional(),
  photoUrl: z.string().max(500).refine((v) => AVATAR_ID.test(v) || GOOGLE_PHOTO.test(v), 'Choose one of the avatars').optional(),
  // '' clears it.
  phoneNumber: z.string().trim().regex(/^(\+?[0-9][0-9\s-]{6,18})?$/, 'Enter a valid phone number').optional(),
  city: z.string().trim().max(80).refine((v) => !/[\u0000-\u001f]/.test(v), 'Invalid characters').optional(),
  classGrade: z.number().int().min(1).max(12).optional(),
  studyGoalMinutes: z.number().int().min(0).max(24 * 60).optional(),
  focusSubjects: z.array(plainText(60)).max(30).optional(),
  // '' clears the choice; the frontend's STREAMS list is the source of these ids.
  stream: z.enum(['science', 'commerce', 'humanities', '']).optional(),
  lastWatchedVideo: z.string().regex(/^([A-Za-z0-9_-]{11})?$/).optional(),
  // One-way: setup cannot be reopened (that would reopen the once-only referral window).
  onboardingCompleted: z.boolean().transform((v) => v || undefined).optional(),
  // streak / lastActiveDate are server-owned now: POST /api/progress/activity maintains them.
});

router.patch('/me/profile', requireConsent, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // '' means "no stream": store it as null rather than an empty string nothing else understands.
  const { stream, city, ...rest } = parsed.data;
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      ...rest,
      ...(stream !== undefined ? { stream: stream || null } : {}),
      ...(city !== undefined ? { city: city || null } : {}),
    },
  });
  res.json(toPublicUser(user));
});

const referralSchema = z.object({ code: z.string().trim().min(1).max(20) });

/**
 * A new account can add the code of whoever referred it, once, during setup. This covers Google sign-ups,
 * which never see the register form's referral field.
 */
router.post('/me/referral', requireConsent, async (req, res) => {
  const parsed = referralSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a referral code' });
  const code = parsed.data.code.toUpperCase();
  const me = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!me) return res.status(404).json({ error: 'Account not found' });
  if (me.referredByCode) return res.status(409).json({ error: 'A referral code is already on your account' });
  if (me.onboardingCompleted) return res.status(409).json({ error: 'Referral codes can only be added while setting up a new account' });
  if (me.referralCode === code) return res.status(400).json({ error: 'You cannot use your own referral code' });
  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, referredByCode: true } });
  if (!referrer) return res.status(400).json({ error: 'That referral code was not found' });
  if (me.referralCode && referrer.referredByCode === me.referralCode) {
    return res.status(400).json({ error: 'You cannot use the code of someone you referred' });
  }
  // Conditional write: of several parallel requests only one can set the code.
  const { count } = await prisma.user.updateMany({
    where: { id: me.id, referredByCode: null, onboardingCompleted: false },
    data: { referredByCode: code },
  });
  if (count !== 1) return res.status(409).json({ error: 'A referral code is already on your account' });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  res.json(toPublicUser(user));
});

const settingsSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  reminderFrequency: z.enum(['daily', 'weekly']).optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
});

router.patch('/me/settings', requireConsent, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.update({ where: { id: req.user!.userId }, data: parsed.data });
  res.json(toPublicUser(user));
});

// 13 and over consent for themselves (owner's rule, 2026-10-06); the age band is still recorded.
const adultConsentSchema = z.object({
  language: z.enum(['en', 'hi']).default('en'),
  ageBand: z.enum(['13-17', 'adult']).default('adult'),
});

router.post('/me/consent/adult', async (req, res) => {
  const parsed = adultConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = req.user!.userId;
  if (!(await emailVerified(userId))) return res.status(403).json({ error: 'Confirm your email address first.' });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { classGrade: true, consentAgeGroup: true, consentMethod: true } });
  // Self-consent is for 13 and over. It cannot replace a parent's consent already on record (an
  // under-13 cannot "become" an adult to drop the parent), and the class must fit the age given.
  if (me.consentMethod === 'parent' || me.consentMethod === 'parent_notified' || me.consentAgeGroup === 'under13' || me.consentAgeGroup === 'child') {
    return res.status(409).json({ error: "Your parent's details are already on your account." });
  }
  if (me.classGrade != null && (me.classGrade <= 6 || (parsed.data.ageBand === 'adult' && me.classGrade <= 10))) {
    return res.status(400).json({ error: 'For your class, a parent needs to give their details.' });
  }
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      consentStatus: 'GRANTED',
      consentAgeGroup: parsed.data.ageBand,
      consentMethod: 'self',
      consentNoticeVersion: NOTICE_VERSION,
      consentLanguage: parsed.data.language,
      consentGrantedAt: new Date(),
    },
  });
  res.json(toPublicUser(user));
});

// The notice changed since this account consented: record agreement to the current version. Only for
// an account that already has consent; how it consented (self, or a parent's details) is unchanged.
router.post('/me/consent/renew', async (req, res) => {
  const { count } = await prisma.user.updateMany({
    where: { id: req.user!.userId, consentStatus: 'GRANTED' },
    data: { consentNoticeVersion: NOTICE_VERSION },
  });
  if (count !== 1) return res.status(409).json({ error: 'No consent on record to renew' });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
  res.json(toPublicUser(user));
});

const OWN_EMAIL_ERROR = "Use your parent's or guardian's email address, not your own.";

/** A parent's email that is the student's own would let the student approve themselves. */
async function isOwnEmail(userId: string, email: string): Promise<boolean> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return Boolean(me && me.email.trim().toLowerCase() === email.trim().toLowerCase());
}

const parentConsentSchema = z.object({
  parentName: z.string().trim().min(1).max(80),
  parentEmail: z.string().trim().toLowerCase().email().max(254),
  language: z.enum(['en', 'hi']).default('en'),
});

router.post('/me/consent/parent-request', consentEmailLimiter, async (req, res) => {
  const parsed = parentConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { parentName, parentEmail, language } = parsed.data;
  if (!(await emailVerified(req.user!.userId))) return res.status(403).json({ error: 'Confirm your email address first.' });
  if (await isOwnEmail(req.user!.userId, parentEmail)) return res.status(400).json({ error: OWN_EMAIL_ERROR });

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

const minorConsentSchema = z.object({
  // Only under-13s give a parent's details; 13 and over consent for themselves (/me/consent/adult).
  ageBand: z.enum(['under13']),
  parentName: z.string().trim().min(1).max(80),
  parentEmail: z.string().trim().toLowerCase().email().max(254),
  parentPhone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,18}$/, 'Enter a valid phone number'),
  agreed: z.literal(true),
  language: z.enum(['en', 'hi']).default('en'),
});

/**
 * Under-18 onboarding without a parent sign-up: the student gives a parent's contact details and confirms
 * the parent agrees, and can start straight away. The parent gets a one-tap link to confirm (or refuse,
 * which erases the account) — the emailed link is the verification; no parent account is needed.
 */
router.post('/me/consent/minor', consentEmailLimiter, async (req, res) => {
  const parsed = minorConsentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Check the parent details' });
  const { ageBand, parentName, parentEmail, parentPhone, language } = parsed.data;
  if (!(await emailVerified(req.user!.userId))) return res.status(403).json({ error: 'Confirm your email address first.' });
  if (await isOwnEmail(req.user!.userId, parentEmail)) return res.status(400).json({ error: OWN_EMAIL_ERROR });

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        consentStatus: 'GRANTED',
        consentAgeGroup: ageBand,
        consentMethod: 'parent_notified',
        consentNoticeVersion: NOTICE_VERSION,
        consentLanguage: language,
        consentParentName: parentName,
        consentParentEmail: parentEmail,
        consentParentPhone: parentPhone,
        consentRequestedAt: new Date(),
        consentGrantedAt: new Date(),
      },
    }),
    prisma.consentRequest.create({ data: { token, userId: req.user!.userId, status: 'PENDING', expiresAt } }),
  ]);

  // Not awaited into the response: a slow or failed email must never block the student.
  void sendEmail(parentEmail, 'Your child joined NCERT Prep — please confirm', {
    heading: `Hello ${parentName}, your child has joined NCERT Prep`,
    lines: [
      'Your child signed up for NCERT Prep, a free learning app with NCERT video lessons for their class, and told us you agree.',
      'Please confirm with one tap. You can also see what we collect, or refuse, which deletes their account and data.',
    ],
    action: { label: 'Confirm in one tap', url: `${process.env.FRONTEND_ORIGIN}/parent-consent?token=${token}` },
    footnote: 'No account is needed. This link expires in 30 days.',
  }).catch(() => undefined);

  res.json(toPublicUser(user));
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
