import { Router } from 'express';
import { RecommendationsService } from './recommendations.service.js';
import {
  generateSchema,
  listSchema,
  idParamSchema,
  rejectSchema,
} from './recommendations.schemas.js';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { BaselineRecommenderProvider } from '../../lib/providers/RecommenderProvider.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/ai_recommendations.md */
export const recommendationsRouter = Router();

const service = new RecommendationsService(getPrisma(), new BaselineRecommenderProvider());

recommendationsRouter.use(requireAuth);

recommendationsRouter.post(
  '/',
  requirePermission('recommendation.read'),
  validateBody(generateSchema),
  audit('recommendation.generate', (req) => `user:${(req.body as { userId: string }).userId}`),
  async (req, res) => {
    const items = await service.generate(req.body);
    res.status(201).json(ok(items, { count: items.length }));
  },
);

recommendationsRouter.get(
  '/',
  requirePermission('recommendation.read'),
  validateQuery(listSchema),
  async (req, res) => {
    const isAdmin = (req.user!.permissions ?? []).includes('recommendation.write');
    const items = await service.list(req.query as never, req.user!.userId, isAdmin);
    res.json(ok(items, { count: items.length }));
  },
);

recommendationsRouter.get(
  '/:id',
  requirePermission('recommendation.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const isAdmin = (req.user!.permissions ?? []).includes('recommendation.write');
    const item = await service.getById((req.params as { id: string }).id, req.user!.userId, isAdmin);
    res.json(ok(item));
  },
);

recommendationsRouter.post(
  '/:id/accept',
  requirePermission('recommendation.write'),
  validateParams(idParamSchema),
  audit('recommendation.accept', (req) => `recommendation:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.accept((req.params as { id: string }).id, req.user!.userId);
    res.json(ok(updated));
  },
);

recommendationsRouter.post(
  '/:id/reject',
  requirePermission('recommendation.write'),
  validateParams(idParamSchema),
  validateBody(rejectSchema),
  audit('recommendation.reject', (req) => `recommendation:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.reject(
      (req.params as { id: string }).id,
      req.user!.userId,
      (req.body as { feedback?: string }).feedback,
    );
    res.json(ok(updated));
  },
);
