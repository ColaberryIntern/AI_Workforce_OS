import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { ok } from '../../lib/envelope.js';
import { BaselineRecommenderProvider } from '../../lib/providers/RecommenderProvider.js';

/** Spec: /directives/recommender_system.md */
export const recommenderRouter = Router();

const provider = new BaselineRecommenderProvider();

const inputSchema = z.object({
  user: z.object({
    userId: z.string().min(1),
    role: z.string().optional(),
    location: z.string().optional(),
    skills: z.array(z.string()).optional(),
  }),
  history: z.array(
    z.object({
      kind: z.string(),
      payload: z.record(z.unknown()).optional(),
      accepted: z.boolean().nullable(),
      occurredAt: z.string().datetime(),
    }),
  ).default([]),
  k: z.number().int().min(1).max(50).optional(),
});

recommenderRouter.post(
  '/',
  requireAuth,
  requirePermission('recommendation.read'),
  validateBody(inputSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof inputSchema>;
    const items = await provider.recommend({
      user: body.user,
      history: body.history.map((h) => ({ ...h, occurredAt: new Date(h.occurredAt) })),
      k: body.k,
    });
    res.json(ok(items, { count: items.length }));
  },
);
