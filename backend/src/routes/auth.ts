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

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ponytail: in-memory per-instance limiter is enough for one server; move to a shared store if this ever runs behind more than one instance.
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));

function sendVerifyEmail(userId: string, email: string) {
  const verifyToken = jwt.sign({ userId, purpose: 'verify-email' }, process.env.SESSION_SECRET!, { expiresIn: '1d' });
  return sendEmail(
    email,
    'Verify your NCERT Prep account',
    `${process.env.FRONTEND_ORIGIN}/verify-email?token=${verifyToken}`,
  );
}

router.post('/google', async (req, res) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' });
  }
  if (!payload?.email) return res.status(401).json({ error: 'Invalid Google token' });

  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: { googleId: payload.sub },
    create: {
      email: payload.email,
      googleId: payload.sub,
      displayName: payload.name,
      photoUrl: payload.picture,
      emailVerified: true,
    },
  });

  setSessionCookie(res, { userId: user.id, role: user.role });
  res.json(toPublicUser(user));
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80).optional(),
  classGrade: z.number().int().min(1).max(12).optional(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, displayName, classGrade } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName, classGrade } });

  await sendVerifyEmail(user.id, email);

  setSessionCookie(res, { userId: user.id, role: user.role });
  res.status(201).json(toPublicUser(user));
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!valid || !user) return res.status(401).json({ error: 'Invalid email or password' });

  setSessionCookie(res, { userId: user.id, role: user.role });
  res.json(toPublicUser(user));
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.emailVerified) return res.json({ ok: true });
  await sendVerifyEmail(user.id, user.email);
  res.json({ ok: true });
});

router.post('/verify-email', async (req, res) => {
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

router.post('/forgot-password', async (req, res) => {
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
    await sendEmail(
      email,
      'Reset your NCERT Prep password',
      `${process.env.FRONTEND_ORIGIN}/reset-password?token=${resetToken}`,
    );
  }
  // Same response whether or not the account exists / has a password, so this can't be used to enumerate emails.
  res.json({ ok: true });
});

const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

router.post('/reset-password', async (req, res) => {
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
  await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash } });
  res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(toPublicUser(user));
});

export default router;
