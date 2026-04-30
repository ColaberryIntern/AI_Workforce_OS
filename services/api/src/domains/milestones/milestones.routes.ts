import { Router } from 'express';
import { MilestonesService } from './milestones.service.js';
import {
  idParamSchema,
  milestoneCreateSchema,
  milestoneListQuerySchema,
  milestoneTransitionSchema,
  milestoneUpdateSchema,
} from './milestones.schemas.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/**
 * Milestones API. Spec: /directives/milestones.md.
 *
 *   GET    /api/milestones                  milestone.read   list (filter by phase/status)
 *   GET    /api/milestones/summary          milestone.read   counts by phase × status
 *   GET    /api/milestones/:id              milestone.read   get one
 *   POST   /api/milestones                  milestone.write  create
 *   PATCH  /api/milestones/:id              milestone.write  update
 *   POST   /api/milestones/:id/transition   milestone.write  status-only update
 *   DELETE /api/milestones/:id              milestone.write  delete
 */
export const milestonesRouter = Router();

const service = new MilestonesService(getPrisma());

milestonesRouter.use(requireAuth);

// /summary must come before /:id so it's not captured by the param route
milestonesRouter.get('/summary', requirePermission('milestone.read'), async (_req, res) => {
  const summary = await service.summary();
  res.json(ok(summary));
});

milestonesRouter.get(
  '/',
  requirePermission('milestone.read'),
  validateQuery(milestoneListQuerySchema),
  async (req, res) => {
    const items = await service.list(req.query as never);
    res.json(ok(items, { count: items.length }));
  },
);

milestonesRouter.get(
  '/:id',
  requirePermission('milestone.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const item = await service.getById((req.params as { id: string }).id);
    res.json(ok(item));
  },
);

milestonesRouter.post(
  '/',
  requirePermission('milestone.write'),
  validateBody(milestoneCreateSchema),
  audit('milestone.create', (req) => `milestone:${(req.body as { code: string }).code}`),
  async (req, res) => {
    const created = await service.create(req.body);
    res.status(201).json(ok(created));
  },
);

milestonesRouter.patch(
  '/:id',
  requirePermission('milestone.write'),
  validateParams(idParamSchema),
  validateBody(milestoneUpdateSchema),
  audit('milestone.update', (req) => `milestone:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.update((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

milestonesRouter.post(
  '/:id/transition',
  requirePermission('milestone.write'),
  validateParams(idParamSchema),
  validateBody(milestoneTransitionSchema),
  audit('milestone.transition', (req) => `milestone:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.transition(
      (req.params as { id: string }).id,
      (req.body as { status: 'planned' | 'in_progress' | 'done' | 'at_risk' | 'skipped' }).status,
    );
    res.json(ok(updated));
  },
);

milestonesRouter.delete(
  '/:id',
  requirePermission('milestone.write'),
  validateParams(idParamSchema),
  audit('milestone.delete', (req) => `milestone:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.delete((req.params as { id: string }).id);
    res.status(204).send();
  },
);
