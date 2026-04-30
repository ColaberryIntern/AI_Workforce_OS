import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { getPrisma } from '../db/prisma.js';

/**
 * Audit log middleware. Persists immutable records of mutating actions.
 * Spec: Build Guide §4 #10 + §8 + /directives/audit_logging.md.
 *
 * Writes happen AFTER res.finish so they never block the user-visible flow.
 * Failure to write the audit log must NOT crash the request.
 */
export function audit(action: string, resourceFn: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const entry = {
        userId: req.user?.userId ?? null,
        action,
        resource: safeResource(req, resourceFn),
        metadata: { method: req.method, path: req.path, status: res.statusCode },
        ipAddress: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null,
      };
      Promise.resolve()
        .then(() => getPrisma().auditLog.create({ data: entry }))
        .catch((err) => logger.error({ err, action }, 'Failed to write audit log'));
    });
    next();
  };
}

function safeResource(req: Request, fn: (req: Request) => string): string {
  try {
    return fn(req);
  } catch {
    return 'unknown';
  }
}
