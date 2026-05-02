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

/**
 * JobType is a closed enum tied to the domains we know how to ingest from.
 * `custom` is an escape hatch for ad-hoc one-off pipelines that don't map
 * to a built-in source kind.
 */
const jobTypeEnum = z.enum([
  'staffing_events',
  'recommendations',
  'forecast_inputs',
  'analytics_events',
  'audit_logs',
  'custom',
]);

/**
 * Source identifier format. Permissive enough for URIs, file paths, and
 * table names; strict enough to block injection-flavored garbage.
 *   Build Guide §4 #13 §Error Handling — "Invalid raw data sources should
 *   return a 400 Bad Request response."
 */
const SOURCE_PATTERN = /^[a-zA-Z0-9._:/-]{1,200}$/;

export const enqueueSchema = z
  .object({
    jobType: jobTypeEnum,
    sources: z
      .array(
        z
          .string()
          .min(1)
          .max(200)
          .regex(SOURCE_PATTERN, 'Source must be 1–200 chars of alphanumeric/./_/:/-//'),
      )
      .min(1, 'sources must contain at least one entry')
      .max(100, 'sources cannot exceed 100 entries'),
  })
  .superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (const s of val.sources) {
      if (seen.has(s)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sources'],
          message: `Duplicate source identifier: '${s}'`,
        });
        return;
      }
      seen.add(s);
    }
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
  // Build Guide §4 #13 §Edge Cases — "If no data is available for processing,
  // return a message indicating that."
  const meta: Record<string, unknown> = { count: jobs.length };
  if (jobs.length === 0) meta.message = 'No ETL jobs yet.';
  res.json(ok(jobs, meta));
});

dataPipelineRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const job = await getPrisma().etlJob.findUnique({
    where: { id: (req.params as { id: string }).id },
  });
  if (!job) throw new NotFoundError('ETL job not found');

  // Surface async-failure context. The GET itself is still 200 (the resource
  // exists); callers detect failure via `status: 'failed'` + `failureReason`.
  // Build Guide §4 #13 §Error Handling — failures are recorded on the row,
  // not returned as a 500 from a successful GET.
  if (job.status === 'failed') {
    const failureReason = describeFailure(job);
    res.json(ok({ ...job, failureReason }));
    return;
  }
  res.json(ok(job));
});

interface EtlJobLike {
  errors: number;
  recordsIn: number;
  qualityScore: number | null;
  finishedAt: Date | null;
}

function describeFailure(job: EtlJobLike): string {
  if (job.errors > 0) return `ETL surfaced ${job.errors} record-level errors`;
  if (job.recordsIn === 0) return 'ETL completed with no input records';
  if (job.qualityScore !== null && job.qualityScore < 0.5) {
    return `ETL quality score ${(job.qualityScore * 100).toFixed(1)}% below threshold`;
  }
  return 'ETL job failed; check worker logs';
}
