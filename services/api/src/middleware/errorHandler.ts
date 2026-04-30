import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/envelope.js';
import { logger } from '../config/logger.js';

/**
 * Centralized error handler. Maps domain errors and Zod validation failures
 * to the consistent error envelope. Unknown errors → 500 with sanitized message.
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Application error');
    } else {
      logger.warn({ code: err.code, path: req.path, method: req.method }, err.message);
    }
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues, path: req.path }, 'Validation failed');
    res.status(400).json(
      fail('VALIDATION_ERROR', 'Request validation failed', {
        issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
      }),
    );
    return;
  }

  // Prisma known errors — translate the most useful ones
  const e = err as { code?: string; message?: string; meta?: unknown };
  if (e?.code === 'P2002') {
    res.status(409).json(fail('CONFLICT', 'Unique constraint violation', e.meta));
    return;
  }
  if (e?.code === 'P2025') {
    res.status(404).json(fail('NOT_FOUND', 'Record not found', e.meta));
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json(fail('INTERNAL_ERROR', 'Internal server error'));
};
