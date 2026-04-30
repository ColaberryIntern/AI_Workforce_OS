import { describe, it, expect, jest } from '@jest/globals';
import { EtlRunner, StubFetcher, __testables } from '../src/etl/runner.js';
import type { PrismaClient } from '@prisma/client';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('EtlRunner', () => {
  it('transform produces expected counts on clean records', () => {
    const records = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const r = __testables.transform(records);
    expect(r.recordsIn).toBe(10);
    expect(r.recordsOut).toBe(10);
    expect(r.errors).toBe(0);
    expect(r.qualityScore).toBe(1);
  });

  it('runDue moves a pending job to success and writes counts', async () => {
    const job = { id: 'j1', sources: ['a', 'b'], status: 'pending', recordsIn: 0, recordsOut: 0, errors: 0 };
    const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];
    const db = {
      etlJob: {
        findMany: jest.fn<AnyAsync>().mockResolvedValue([job]),
        update: jest.fn<AnyAsync>().mockImplementation((async (args: { where: { id: string }; data: Record<string, unknown> }) => {
          updates.push(args);
          return { ...job, ...args.data };
        }) as AnyAsync),
      },
    } as unknown as PrismaClient;

    const runner = new EtlRunner(db, new StubFetcher());
    const result = await runner.runDue();
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    // First update sets status running, second sets status success
    expect(updates).toHaveLength(2);
    expect(updates[0].data.status).toBe('running');
    expect(updates[1].data.status).toBe('success');
    expect(typeof updates[1].data.recordsIn).toBe('number');
    expect(typeof updates[1].data.qualityScore).toBe('number');
  });

  it('fetcher is deterministic for the same source identifier', async () => {
    const f = new StubFetcher();
    const a = await f.fetch('source-x');
    const b = await f.fetch('source-x');
    expect(a).toEqual(b);
  });
});
