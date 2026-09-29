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
import curriculumRouter from './routes/curriculum.js';
import notesRouter from './routes/notes.js';
import textbooksRouter from './routes/textbooks.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';
import { sheetSyncRouter } from './routes/sheet-sync.js';
import { startSheetSyncScheduler } from './shared/sheetScheduler.js';
import { startReminderScheduler } from './jobs/reminders.js';
import { SESSION_COOKIE, verifySessionToken } from './middleware/auth.js';

const app = express();
// Nginx sits in front of this process (see guide/AWS_FROM_SCRATCH.md) and sets X-Forwarded-For.
// Trusting exactly one hop lets express-rate-limit key on the real client IP instead of Nginx's
// localhost address, and stops it throwing on an unexpected X-Forwarded-For header.
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
// Default 100kb limit is too small for the admin's curriculum batch-create (900+ records at once).
app.use(express.json({ limit: '5mb' }));
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
app.use('/api/curriculum', curriculumRouter);
app.use('/api/notes', notesRouter);
app.use('/api/textbooks', textbooksRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);
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
startSheetSyncScheduler();
startReminderScheduler();
