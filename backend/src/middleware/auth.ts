import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export interface SessionPayload {
  userId: string;
  role: 'STUDENT' | 'ADMIN';
  sessionVersion: number;
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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  let session: SessionPayload;
  try {
    session = verifySessionToken(token);
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }

  // A stateless JWT alone can't be revoked; sessionVersion gives us "log out of all devices" —
  // bumping it on the user record invalidates every token issued before that point.
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { sessionVersion: true } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
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
