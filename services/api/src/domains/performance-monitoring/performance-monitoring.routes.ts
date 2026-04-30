import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { validateQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/performance_monitoring.md */
export const performanceMonitoringRouter = Router();

const querySchema = z.object({
  service: z.string().optional(),
  endpoint: z.string().optional(),
  metricName: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
});

performanceMonitoringRouter.use(requireAuth, requirePermission('monitoring.read'));

performanceMonitoringRouter.get('/', validateQuery(querySchema), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof querySchema>;
  const where: Prisma.PerfMetricWhereInput = {};
  if (q.service) where.service = q.service;
  if (q.endpoint) where.endpoint = q.endpoint;
  if (q.metricName) where.metricName = q.metricName;
  if (q.from || q.to) {
    where.recordedAt = {};
    if (q.from) where.recordedAt.gte = new Date(q.from);
    if (q.to) where.recordedAt.lte = new Date(q.to);
  }
  const items = await getPrisma().perfMetric.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    take: q.limit,
  });

  // Quick aggregates
  const byMetric = new Map<string, { sum: number; n: number; max: number; min: number }>();
  for (const m of items) {
    const t = byMetric.get(m.metricName) ?? { sum: 0, n: 0, max: -Infinity, min: Infinity };
    t.sum += m.metricValue;
    t.n += 1;
    t.max = Math.max(t.max, m.metricValue);
    t.min = Math.min(t.min, m.metricValue);
    byMetric.set(m.metricName, t);
  }
  const aggregates: Record<string, { avg: number; min: number; max: number; n: number }> = {};
  for (const [k, v] of byMetric) {
    aggregates[k] = { avg: v.sum / v.n, min: v.min, max: v.max, n: v.n };
  }

  res.json(ok({ items, aggregates }, { count: items.length }));
});
