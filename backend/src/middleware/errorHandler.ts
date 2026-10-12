import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { logger } from '../shared/logger.js';

// Registered last, after every route. express-async-errors forwards rejected promises from async
// route handlers here too — without it, an unhandled rejection in any route (a DB blip, a bad
// query) would crash the whole process instead of just failing that one request.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.flatten() });
  }
  if (err instanceof MulterError) {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already exists' });
    // P2025: the row to update/delete does not exist (e.g. an unknown doubt or feedback id).
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    // P2023/P2007/P2000/P2020: malformed id, invalid value for a column, value too long or out of range.
    if (['P2000', 'P2007', 'P2020', 'P2023'].includes(err.code)) return res.status(400).json({ error: 'Invalid value' });
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Invalid value' });
  }
  // body-parser and friends tag client errors (malformed JSON = 400, oversized body = 413).
  const status = typeof err?.status === 'number' ? err.status : typeof err?.statusCode === 'number' ? err.statusCode : 500;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? 'Request too large' : 'Invalid request' });
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
};
