import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { BaselineForecastProvider } from '../../lib/providers/ForecastProvider.js';
import { ok } from '../../lib/envelope.js';
import {
  InsufficientHistoryError,
} from '../../lib/ml/movingAverageForecaster.js';
import { NotFoundError, UnprocessableEntityError } from '../../lib/errors.js';

/** Spec: /directives/time_series_forecasting.md */
export const forecastingRouter = Router();

const provider = new BaselineForecastProvider();

const computeSchema = z.object({
  scope: z.string().min(1).max(120),
  horizonDays: z.number().int().min(1).max(365),
  series: z
    .array(z.object({ date: z.string(), value: z.number() }))
    .min(1)
    .max(10000),
  externalFactors: z.record(z.unknown()).optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

forecastingRouter.use(requireAuth);

forecastingRouter.post(
  '/',
  requirePermission('forecast.write'),
  validateBody(computeSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof computeSchema>;
    let result;
    try {
      result = await provider.forecast({ series: body.series, horizonDays: body.horizonDays });
    } catch (err) {
      if (err instanceof InsufficientHistoryError) {
        throw new UnprocessableEntityError(err.message, { code: err.code, have: err.have, need: err.need });
      }
      throw err;
    }
    const persisted = await getPrisma().forecast.create({
      data: {
        scope: body.scope,
        horizonDays: body.horizonDays,
        modelName: result.modelName,
        modelVersion: result.modelVersion,
        payload: result.forecast as unknown as Prisma.InputJsonValue,
        ciLower: result.ciLower as unknown as Prisma.InputJsonValue,
        ciUpper: result.ciUpper as unknown as Prisma.InputJsonValue,
      },
    });
    res.status(201).json(ok({ ...persisted, forecast: result.forecast, ciLower: result.ciLower, ciUpper: result.ciUpper }));
  },
);

forecastingRouter.get(
  '/:id',
  requirePermission('forecast.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const found = await getPrisma().forecast.findUnique({ where: { id: (req.params as { id: string }).id } });
    if (!found) throw new NotFoundError('Forecast not found');
    res.json(ok(found));
  },
);
