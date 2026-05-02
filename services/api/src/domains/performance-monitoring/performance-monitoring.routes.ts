import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { validateBody, validateQuery } from '../../middleware/validate.js';
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

/**
 * Ingest schema for POST /api/performance/metrics.
 *   Build Guide §4 #14 §Error Handling — "Invalid metrics input should
 *   return a 400 Bad Request response."
 *
 * `metricValue` must be finite (refuses NaN / Infinity).
 */
export const ingestMetricSchema = z.object({
  service: z.string().min(1).max(120),
  endpoint: z.string().max(200).optional(),
  metricName: z.string().min(1).max(120),
  metricValue: z
    .number()
    .refine((n) => Number.isFinite(n), { message: 'metricValue must be a finite number' }),
  labels: z.record(z.unknown()).optional(),
});

performanceMonitoringRouter.use(requireAuth);

performanceMonitoringRouter.get(
  '/',
  requirePermission('monitoring.read'),
  validateQuery(querySchema),
  async (req, res) => {
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

    // Build Guide §4 #14 §Edge Cases — "If no performance data is available,
    // return a message indicating that."
    const meta: Record<string, unknown> = { count: items.length };
    if (items.length === 0) meta.message = 'No performance metrics yet.';
    res.json(ok({ items, aggregates }, meta));
  },
);

performanceMonitoringRouter.post(
  '/metrics',
  requirePermission('monitoring.write'),
  validateBody(ingestMetricSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof ingestMetricSchema>;
    const metric = await getPrisma().perfMetric.create({
      data: {
        service: body.service,
        endpoint: body.endpoint ?? null,
        metricName: body.metricName,
        metricValue: body.metricValue,
        labels: (body.labels ?? null) as Prisma.InputJsonValue,
      },
    });
    res.status(201).json(ok(metric));
  },
);
