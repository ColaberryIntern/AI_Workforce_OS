import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

/**
 * Role-gating middleware. Use AFTER requireAuth.
 *     router.post('/', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    const ok = (req.user.roles ?? []).some((r) => allowed.includes(r));
    if (!ok) {
      return next(new ForbiddenError(`Requires one of roles: ${allowed.join(', ')}`));
    }
    next();
  };
}
