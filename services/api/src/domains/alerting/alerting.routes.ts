import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';
import { NotFoundError } from '../../lib/errors.js';

/** Spec: /directives/alerting_system.md */
export const alertingRouter = Router();

const ruleCreateSchema = z.object({
  name: z.string().min(1).max(120),
  source: z.enum(['apm', 'model', 'business']),
  metric: z.string().min(1).max(120),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  threshold: z.number(),
  windowSecs: z.number().int().min(30).max(86400).default(300),
  severity: z.enum(['info', 'warning', 'critical']),
  isActive: z.boolean().default(true),
});

const ruleUpdateSchema = ruleCreateSchema.partial();

const idParamSchema = z.object({ id: z.string().min(1) });

alertingRouter.use(requireAuth);

// --- Alert lifecycle ---

alertingRouter.get('/', requirePermission('monitoring.read'), async (req, res) => {
  const status = req.query.status as string | undefined;
  const items = await getPrisma().alert.findMany({
    where: status ? { status } : undefined,
    orderBy: { triggeredAt: 'desc' },
    take: 200,
  });
  res.json(ok(items, { count: items.length }));
});

alertingRouter.post(
  '/:id/acknowledge',
  requirePermission('monitoring.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const id = (req.params as { id: string }).id;
    const a = await getPrisma().alert.findUnique({ where: { id } });
    if (!a) throw new NotFoundError('Alert not found');
    const updated = await getPrisma().alert.update({
      where: { id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
    res.json(ok(updated));
  },
);

alertingRouter.post(
  '/:id/resolve',
  requirePermission('monitoring.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const id = (req.params as { id: string }).id;
    const a = await getPrisma().alert.findUnique({ where: { id } });
    if (!a) throw new NotFoundError('Alert not found');
    const updated = await getPrisma().alert.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    res.json(ok(updated));
  },
);

// --- Alert rule CRUD ---

alertingRouter.get('/rules', requirePermission('alert.write'), async (_req, res) => {
  const rules = await getPrisma().alertRule.findMany({ orderBy: { name: 'asc' } });
  res.json(ok(rules, { count: rules.length }));
});

alertingRouter.post(
  '/rules',
  requirePermission('alert.write'),
  validateBody(ruleCreateSchema),
  async (req, res) => {
    const r = await getPrisma().alertRule.create({ data: req.body });
    res.status(201).json(ok(r));
  },
);

alertingRouter.patch(
  '/rules/:id',
  requirePermission('alert.write'),
  validateParams(idParamSchema),
  validateBody(ruleUpdateSchema),
  async (req, res) => {
    const id = (req.params as { id: string }).id;
    const r = await getPrisma().alertRule.update({ where: { id }, data: req.body });
    res.json(ok(r));
  },
);

alertingRouter.delete(
  '/rules/:id',
  requirePermission('alert.write'),
  validateParams(idParamSchema),
  async (req, res) => {
    const id = (req.params as { id: string }).id;
    await getPrisma().alertRule.delete({ where: { id } });
    res.status(204).send();
  },
);
