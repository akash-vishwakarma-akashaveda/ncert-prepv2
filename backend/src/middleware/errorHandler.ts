import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../shared/logger.js';

// Registered last, after every route. express-async-errors forwards rejected promises from async
// route handlers here too — without it, an unhandled rejection in any route (a DB blip, a bad
// query) would crash the whole process instead of just failing that one request.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: 'Already exists' });
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
};
