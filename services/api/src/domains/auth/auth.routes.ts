import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from './auth.schemas.js';
import { validateBody } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';
import { BadRequestError } from '../../lib/errors.js';

/**
 * Auth API. Spec: /directives/auth.md.
 *
 *   POST /api/auth/register         public, rate-limited
 *   POST /api/auth/login            public, rate-limited
 *   POST /api/auth/refresh          public, rate-limited
 *   POST /api/auth/logout           requireAuth
 *   GET  /api/auth/me               requireAuth
 *   POST /api/auth/change-password  requireAuth
 */
export const authRouter = Router();

const service = new AuthService(getPrisma());

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts' } },
});

authRouter.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  audit('user.register', (req) => `user:${(req.body as { email: string }).email}`),
  async (req, res) => {
    const result = await service.register(req.body);
    res.status(201).json(ok(result));
  },
);

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  audit('user.login', (req) => `user:${(req.body as { email: string }).email}`),
  async (req, res) => {
    const result = await service.login(req.body);
    res.json(ok(result));
  },
);

authRouter.post('/refresh', authLimiter, validateBody(refreshSchema), async (req, res) => {
  const result = await service.refresh(req.body);
  res.json(ok(result));
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;
  if (!refreshToken) throw new BadRequestError('refreshToken required in body');
  await service.logout(refreshToken);
  res.status(204).send();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await service.me(req.user!.userId);
  res.json(ok({ user }));
});

authRouter.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  audit('user.password_change', (req) => `user:${req.user!.userId}`),
  async (req, res) => {
    await service.changePassword(req.user!.userId, req.body);
    res.status(204).send();
  },
);
