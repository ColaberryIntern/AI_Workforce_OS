import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * JWT auth middleware. Spec: Build Guide §8 + /directives/security.md.
 *
 * Reads `Authorization: Bearer <token>`, verifies, attaches req.user.
 */

export interface AuthClaims {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthClaims;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }
  const env = loadEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthClaims & jwt.JwtPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles ?? [],
      permissions: decoded.permissions ?? [],
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired', 'TOKEN_EXPIRED'));
    }
    next(new UnauthorizedError('Invalid token'));
  }
}

/**
 * Optional auth — populates req.user when a valid token is present, but
 * does not reject on missing/invalid. Useful for endpoints that personalize
 * for logged-in users but also serve anonymous traffic.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();
  const env = loadEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthClaims & jwt.JwtPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles ?? [],
      permissions: decoded.permissions ?? [],
    };
  } catch {
    // ignore — leave req.user unset
  }
  next();
}
