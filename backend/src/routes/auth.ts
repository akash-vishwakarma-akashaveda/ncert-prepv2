import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db.js';
import { setSessionCookie, clearSessionCookie, requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../shared/email.js';
import { toPublicUser } from '../shared/publicUser.js';
import { bumpStat } from '../shared/stats.js';
import { generateReferralCode } from '../shared/referral.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Only on the credential/email endpoints. It used to wrap the whole router, so the /me check every
// page load makes (plus logout) burned the budget and signed-in users got 429s after a few
// refreshes; a school sharing one IP hit it even sooner.
// ponytail: in-memory per-instance limiters are enough for one server; move to a shared store if this ever runs behind more than one instance.
const limiterOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
} as const;
/** Sign-in style endpoints: only failed attempts count, so brute force is capped but real users never are. */
const authLimiter = rateLimit({ ...limiterOptions, skipSuccessfulRequests: true });
/** Endpoints that send an email or create an account: every call counts, so they can't be used to spam. */
const emailLimiter = rateLimit(limiterOptions);

function sendVerifyEmail(userId: string, email: string) {
  const verifyToken = jwt.sign({ userId, purpose: 'verify-email' }, process.env.SESSION_SECRET!, { expiresIn: '1d' });
  return sendEmail(email, 'Verify your NCERT Prep account', {
    heading: 'Confirm your email address',
    lines: ['Welcome to NCERT Prep! Please confirm this is your email address to finish setting up your account.'],
    action: { label: 'Verify email', url: `${process.env.FRONTEND_ORIGIN}/verify-email?token=${verifyToken}` },
    footnote: 'This link expires in 24 hours. If you did not create an account, you can ignore this email.',
  });
}

router.post('/google', authLimiter, async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  if (!accessToken) return res.status(400).json({ error: 'accessToken required' });

  // The token is minted in the browser by Google's popup flow, so it could be one issued to any
  // other site. getTokenInfo checks it against Google and reports the audience it was issued to;
  // that audience MUST be our own client id, or a token from another app would sign its holder in.
  let payload: { email?: string; sub?: string; name?: string; picture?: string };
  try {
    const info = await googleClient.getTokenInfo(accessToken);
    if (info.aud !== process.env.GOOGLE_CLIENT_ID || !info.email) throw new Error('wrong audience');
    // getTokenInfo has the identity but not the display name or avatar, which userinfo carries.
    const profile = (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    }).then((r) => (r.ok ? r.json() : {}))) as { name?: string; picture?: string };
    payload = { email: info.email, sub: info.sub, name: profile.name, picture: profile.picture };
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' });
  }
  if (!payload.email) return res.status(401).json({ error: 'Invalid Google token' });

  const existingByEmail = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: { googleId: payload.sub },
    create: {
      email: payload.email,
      googleId: payload.sub,
      displayName: payload.name,
      photoUrl: payload.picture,
      emailVerified: true,
      referralCode: await generateReferralCode(),
    },
  });
  if (!existingByEmail) void bumpStat('registrations');

  setSessionCookie(res, { userId: user.id, role: user.role, sessionVersion: user.sessionVersion });
  res.json(toPublicUser(user));
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80).optional(),
  classGrade: z.number().int().min(1).max(12).optional(),
  referralCode: z.string().trim().max(20).optional(),
});

router.post('/register', emailLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, displayName, classGrade, referralCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  let referredByCode: string | undefined;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() }, select: { id: true } });
    if (!referrer) return res.status(400).json({ error: 'Invalid referral code' });
    referredByCode = referralCode.toUpperCase();
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName, classGrade, referredByCode, referralCode: await generateReferralCode() },
  });
  void bumpStat('registrations');

  // sendEmail never throws: the account exists now, so a mail failure must not turn this into a 500
  // (the retry would then hit "Email already registered"). They can resend from the app.
  await sendVerifyEmail(user.id, email);

  setSessionCookie(res, { userId: user.id, role: user.role, sessionVersion: user.sessionVersion });
  res.status(201).json(toPublicUser(user));
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!valid || !user) return res.status(401).json({ error: 'Invalid email or password' });

  setSessionCookie(res, { userId: user.id, role: user.role, sessionVersion: user.sessionVersion });
  res.json(toPublicUser(user));
});

router.post('/resend-verification', emailLimiter, requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.emailVerified) return res.json({ ok: true });
  if (!(await sendVerifyEmail(user.id, user.email))) {
    return res.status(502).json({ error: 'We could not send the email right now. Please try again later.' });
  }
  res.json({ ok: true });
});

router.post('/verify-email', authLimiter, async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET!) as { userId: string; purpose: string };
    if (decoded.purpose !== 'verify-email') throw new Error('wrong token purpose');
    await prisma.user.update({ where: { id: decoded.userId }, data: { emailVerified: true } });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post('/forgot-password', emailLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.passwordHash) {
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'reset-password' },
      process.env.SESSION_SECRET!,
      { expiresIn: '1h' },
    );
    await sendEmail(email, 'Reset your NCERT Prep password', {
      heading: 'Reset your password',
      lines: ['We received a request to reset the password for your NCERT Prep account.'],
      action: { label: 'Choose a new password', url: `${process.env.FRONTEND_ORIGIN}/reset-password?token=${resetToken}` },
      footnote: 'This link expires in 1 hour. If you did not ask for this, you can ignore this email and your password stays the same.',
    });
  }
  // Same response whether or not the account exists / has a password, so this can't be used to enumerate emails.
  res.json({ ok: true });
});

const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

router.post('/reset-password', authLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { token, password } = parsed.data;

  let decoded: { userId: string; purpose: string };
  try {
    decoded = jwt.verify(token, process.env.SESSION_SECRET!) as { userId: string; purpose: string };
    if (decoded.purpose !== 'reset-password') throw new Error('wrong token purpose');
  } catch {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Resetting the password also logs out every other device/session.
  await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.post('/logout-all', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user!.userId }, data: { sessionVersion: { increment: 1 } } });
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(toPublicUser(user));
});

export default router;
