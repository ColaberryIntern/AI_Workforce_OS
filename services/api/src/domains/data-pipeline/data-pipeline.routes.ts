import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';
import { NotFoundError } from '../../lib/errors.js';

/** Spec: /directives/data_pipeline.md */
export const dataPipelineRouter = Router();

const enqueueSchema = z.object({
  jobType: z.string().min(1).max(120),
  sources: z.array(z.string().min(1)).min(1).max(100),
});

const idParamSchema = z.object({ id: z.string().min(1) });

dataPipelineRouter.use(requireAuth, requirePermission('pipeline.run'));

dataPipelineRouter.post('/', validateBody(enqueueSchema), async (req, res) => {
  const body = req.body as z.infer<typeof enqueueSchema>;
  const job = await getPrisma().etlJob.create({
    data: {
      jobType: body.jobType,
      sources: body.sources,
      status: 'pending',
    },
  });
  res.status(201).json(ok(job));
});

dataPipelineRouter.get('/', async (_req, res) => {
  const jobs = await getPrisma().etlJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(ok(jobs, { count: jobs.length }));
});

dataPipelineRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const job = await getPrisma().etlJob.findUnique({
    where: { id: (req.params as { id: string }).id },
  });
  if (!job) throw new NotFoundError('ETL job not found');
  res.json(ok(job));
});
