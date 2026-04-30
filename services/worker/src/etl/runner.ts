import type { PrismaClient } from '@prisma/client';

/**
 * In-process ETL runner. Spec: /directives/data_pipeline.md.
 *
 * Pulls `EtlJob` rows in `pending`, runs them, writes back status + counts.
 * Idempotent at the job-id level (re-running the same id produces the same
 * result because we run the same pure transform over the same source list).
 */

export interface EtlSourceFetcher {
  /** Returns raw records for a given source identifier. Stub for Wave 1. */
  fetch(source: string): Promise<Array<Record<string, unknown>>>;
}

export class StubFetcher implements EtlSourceFetcher {
  async fetch(source: string): Promise<Array<Record<string, unknown>>> {
    // Deterministic fake records keyed by source, so re-runs are stable.
    const seed = source.length % 7;
    return Array.from({ length: 10 + seed }, (_, i) => ({
      id: `${source}:${i}`,
      ts: i,
      ok: i % 3 !== 0,
    }));
  }
}

export interface EtlJobReport {
  recordsIn: number;
  recordsOut: number;
  errors: number;
  qualityScore: number;
}

function transform(records: Array<Record<string, unknown>>): EtlJobReport {
  let errors = 0;
  const out: Array<Record<string, unknown>> = [];
  for (const r of records) {
    if (typeof r !== 'object' || !r) {
      errors++;
      continue;
    }
    out.push(r);
  }
  const qualityScore = records.length === 0 ? 1 : (records.length - errors) / records.length;
  return { recordsIn: records.length, recordsOut: out.length, errors, qualityScore };
}

export class EtlRunner {
  constructor(
    private readonly db: PrismaClient,
    private readonly fetcher: EtlSourceFetcher,
  ) {}

  async runDue(batchSize = 5): Promise<{ processed: number; succeeded: number; failed: number }> {
    const due = await this.db.etlJob.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let succeeded = 0;
    let failed = 0;

    for (const j of due) {
      await this.db.etlJob.update({
        where: { id: j.id },
        data: { status: 'running', startedAt: new Date() },
      });
      try {
        let totalIn = 0;
        let totalOut = 0;
        let totalErrors = 0;
        let weightedQ = 0;
        for (const src of j.sources) {
          const records = await this.fetcher.fetch(src);
          const report = transform(records);
          totalIn += report.recordsIn;
          totalOut += report.recordsOut;
          totalErrors += report.errors;
          weightedQ += report.qualityScore * report.recordsIn;
        }
        const qualityScore = totalIn === 0 ? 1 : weightedQ / totalIn;
        await this.db.etlJob.update({
          where: { id: j.id },
          data: {
            status: 'success',
            recordsIn: totalIn,
            recordsOut: totalOut,
            errors: totalErrors,
            qualityScore,
            finishedAt: new Date(),
          },
        });
        succeeded++;
      } catch (err) {
        await this.db.etlJob.update({
          where: { id: j.id },
          data: { status: 'failed', finishedAt: new Date() },
        });
        failed++;
      }
    }

    return { processed: due.length, succeeded, failed };
  }
}

export const __testables = { transform };
