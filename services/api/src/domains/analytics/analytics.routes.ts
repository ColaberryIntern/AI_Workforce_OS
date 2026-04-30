import { Router } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { ingestSchema, querySchema } from './analytics.schemas.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/usage_analytics.md */
export const analyticsRouter = Router();

const service = new AnalyticsService(getPrisma());

analyticsRouter.use(requireAuth);

analyticsRouter.post(
  '/',
  requirePermission('analytics.write'),
  validateBody(ingestSchema),
  async (req, res) => {
    const result = await service.ingest(req.body);
    res.status(202).json(ok(result));
  },
);

analyticsRouter.get(
  '/',
  requirePermission('analytics.read'),
  validateQuery(querySchema),
  async (req, res) => {
    const items = await service.query(req.query as never);
    res.json(ok(items, { count: items.length }));
  },
);

analyticsRouter.get('/summary', requirePermission('analytics.read'), async (_req, res) => {
  const summary = await service.summary();
  res.json(ok(summary));
});
