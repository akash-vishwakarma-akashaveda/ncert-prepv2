import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, clearSessionCookie } from '../middleware/auth.js';
import { sendEmail } from '../shared/email.js';
import { eraseUser } from '../shared/erase-user.js';
import { toPublicUser } from '../shared/publicUser.js';

const RECENT_LOGIN_WINDOW_SECONDS = 5 * 60;

const router = Router();
router.use(requireAuth);

const NOTICE_VERSION = process.env.DPDP_NOTICE_VERSION ?? '2026-01';
const CONSENT_REQUEST_TTL_DAYS = 14;

const profileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  photoUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  classGrade: z.number().int().min(1).max(12).optional(),
  studyGoalMinutes: z.number().int().min(0).optional(),
  focusSubjects: z.array(z.string()).optional(),
  lastWatchedVideo: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  streak: z.number().int().min(0).optional(),
  lastActiveDate: z.string().optional(),
});

router.patch('/me/profile', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.update({ where: { id: req.user!.userId }, data: parsed.data });
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

  await sendEmail(
    parentEmail,
    'Approve your child’s NCERT Prep account',
    `${process.env.FRONTEND_ORIGIN}/parent-consent?token=${token}`,
  );

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
