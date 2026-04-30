import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Tiny wrapper that ensures async handler rejections are forwarded to the
 * Express error middleware. We also import 'express-async-errors' in server.ts
 * for belt-and-suspenders coverage; this helper is for cases where we want
 * the wrapper to be explicit.
 */
type AsyncHandler<P = unknown> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<P>;

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
