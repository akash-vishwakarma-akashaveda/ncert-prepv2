import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { prisma } from './db.js';
import { logger, requestLogger } from './shared/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import consentRouter from './routes/consent.js';
import progressRouter from './routes/progress.js';
import leaderboardRouter from './routes/leaderboard.js';
import doubtsRouter from './routes/doubts.js';
import feedbackRouter from './routes/feedback.js';
import videosRouter from './routes/videos.js';
import { sheetSyncRouter } from './routes/sheet-sync.js';
import { SESSION_COOKIE, verifySessionToken } from './middleware/auth.js';

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get('/api/health', async (_req, res) => {
  const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW()`;
  res.json({ ok: true, dbTime: now });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/consent', consentRouter);
app.use('/api/progress', progressRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/doubts', doubtsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/videos', videosRouter);
app.use('/api/admin/sync-sheet', sheetSyncRouter);

app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.FRONTEND_ORIGIN, credentials: true } });
app.set('io', io);

function readSessionCookie(cookieHeader?: string): string | undefined {
  return cookieHeader?.split('; ').find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

// Every socket authenticates off the same session cookie the REST API uses, then joins its own
// user-id room (for doubt replies) and the shared "admins" room (for the new-doubt queue).
io.use((socket, next) => {
  const token = readSessionCookie(socket.handshake.headers.cookie);
  if (!token) return next(new Error('unauthorized'));
  try {
    socket.data.user = verifySessionToken(token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user as { userId: string; role: 'STUDENT' | 'ADMIN' };
  socket.join(user.userId);
  if (user.role === 'ADMIN') socket.join('admins');
});

const port = process.env.PORT ?? 4000;
httpServer.listen(port, () => logger.info(`API listening on :${port}`));
