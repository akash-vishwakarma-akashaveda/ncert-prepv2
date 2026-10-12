import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export interface SessionPayload {
  userId: string;
  role: 'STUDENT' | 'ADMIN';
  sessionVersion: number;
  /** Filled in by requireAuth from the user row (not part of the signed token). */
  consentGranted?: boolean;
  /** Set by jwt.verify from the token's standard claim; used to gate recent-login-only actions (account deletion). */
  iat?: number;
}

export const SESSION_COOKIE = 'session';

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
}

export function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = jwt.sign(payload, sessionSecret(), { expiresIn: '30d' });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

export function verifySessionToken(token: string): SessionPayload {
  return jwt.verify(token, sessionSecret()) as SessionPayload;
}

export interface SessionUser {
  role: 'STUDENT' | 'ADMIN';
  consentGranted: boolean;
}

/**
 * Verifies a session token AND checks it against the user row: the token must still match the
 * user's sessionVersion (so "log out of all devices" and password resets revoke it), and the role
 * comes from the database, not the token (a demoted admin loses access on their next request).
 * Verify-email / reset-password tokens carry no sessionVersion, so they can never pass as a session.
 * Shared by REST (requireAuth) and socket.io.
 */
export async function loadSession(token: string): Promise<(SessionPayload & SessionUser) | null> {
  let session: SessionPayload;
  try {
    session = verifySessionToken(token);
  } catch {
    return null;
  }
  if (typeof session.sessionVersion !== 'number') return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true, role: true, consentStatus: true },
  });
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  return { ...session, role: user.role, consentGranted: user.consentStatus === 'GRANTED' };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  const session = await loadSession(token);
  if (!session) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
  req.user = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

/**
 * DPDP: a student's personal data is only processed once consent is recorded (self for 13+, a
 * parent's details for under-13s). The browser's ConsentGate is UX; this is the enforcement.
 * Use after requireAuth. Admins are staff accounts, not data principals of the learning flow.
 */
export function requireConsent(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'ADMIN' || req.user?.consentGranted) return next();
  return res.status(403).json({ error: 'consent-required' });
}
