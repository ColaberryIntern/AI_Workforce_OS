import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/ai_model_monitoring.md */
export const modelMonitoringRouter = Router();

const recordBatchSchema = z.object({
  modelName: z.string().min(1).max(120),
  modelVersion: z.string().min(1).max(40),
  predictions: z.array(z.object({ id: z.string(), predicted: z.union([z.number(), z.boolean(), z.string()]) })).min(1),
  outcomes: z.array(z.object({ id: z.string(), actual: z.union([z.number(), z.boolean(), z.string()]) })).min(1),
});

const querySchema = z.object({
  modelName: z.string().optional(),
  metricName: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

modelMonitoringRouter.use(requireAuth, requirePermission('monitoring.read'));

modelMonitoringRouter.post('/', validateBody(recordBatchSchema), async (req, res) => {
  const body = req.body as z.infer<typeof recordBatchSchema>;
  const outcomeMap = new Map(body.outcomes.map((o) => [o.id, o.actual]));
  let matched = 0;
  let correct = 0;
  for (const p of body.predictions) {
    const a = outcomeMap.get(p.id);
    if (a === undefined) continue;
    matched++;
    if (a === p.predicted) correct++;
  }
  if (matched < 30) {
    res.json(ok({ skipped: true, reason: 'INSUFFICIENT_OUTCOMES', matched }, { warning: 'Need ≥30 matched outcomes' }));
    return;
  }
  const accuracy = correct / matched;

  const metric = await getPrisma().modelMetric.create({
    data: {
      modelName: body.modelName,
      modelVersion: body.modelVersion,
      metricName: 'accuracy',
      metricValue: accuracy,
      context: { matched, correct } as Prisma.InputJsonValue,
    },
  });
  res.status(201).json(ok(metric));
});

modelMonitoringRouter.get('/', validateQuery(querySchema), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof querySchema>;
  const where: Prisma.ModelMetricWhereInput = {};
  if (q.modelName) where.modelName = q.modelName;
  if (q.metricName) where.metricName = q.metricName;
  const items = await getPrisma().modelMetric.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    take: q.limit,
  });
  res.json(ok(items, { count: items.length }));
});
