import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

/**
 * Permission-gating middleware. Use AFTER requireAuth.
 * Permissions are baked into the JWT at login time using the effective
 * permission set (own + inherited from parent roles).
 *
 *     router.post('/', requireAuth, requirePermission('role.write'), handler)
 */
export function requirePermission(...needed: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    const have = new Set(req.user.permissions ?? []);
    const ok = needed.every((p) => have.has(p));
    if (!ok) {
      return next(new ForbiddenError(`Missing permission: ${needed.join(', ')}`));
    }
    next();
  };
}
