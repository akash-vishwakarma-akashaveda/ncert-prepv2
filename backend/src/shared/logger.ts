import pino from 'pino';
import { pinoHttp } from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Human-readable in dev, plain JSON (fast, structured, ready for CloudWatch) in production.
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});

// One line per request: method, path, status, timing. Not the default pino-http behaviour, which
// dumps every request/response header (including the raw Cookie header) on every line — noisy and
// a needless place to leak session tokens into log files.
export const requestLogger = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/api/health' },
  customSuccessMessage: (req, res, responseTime) => `${req.method} ${req.url} -> ${res.statusCode} (${Math.round(responseTime)}ms)`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
