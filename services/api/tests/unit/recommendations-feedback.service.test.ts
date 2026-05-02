import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RecommendationsService } from '../../src/domains/recommendations/recommendations.service.js';

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>;

function makeDb(rows: Array<Record<string, unknown>>) {
  return {
    recommendation: {
      findMany: jest.fn<AnyAsyncFn>().mockResolvedValue(rows),
    },
  };
}

const stubRecommender = {
  recommend: jest.fn<AnyAsyncFn>().mockResolvedValue([]),
};

const baseRow = {
  modelName: 'popularity-baseline',
  modelVersion: '1.0.0',
};

describe('RecommendationsService.feedbackStats', () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
  });

  it('self scope: filters to the requesting userId in the where clause', async () => {
    const db = makeDb([]);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    await service.feedbackStats('user-1', false);

    const call = db.recommendation.findMany.mock.calls[0][0] as {
      where: { userId?: string };
    };
    expect(call.where.userId).toBe('user-1');
  });

  it('admin scope: no userId filter — system-wide aggregation', async () => {
    const db = makeDb([]);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    await service.feedbackStats('admin-1', true);

    const call = db.recommendation.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where).toEqual({});
  });

  it('self scope with null userId returns zeroed stats (no DB call)', async () => {
    const db = makeDb([]);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    const stats = await service.feedbackStats(null, false);

    expect(db.recommendation.findMany).not.toHaveBeenCalled();
    expect(stats.overall).toEqual({
      total: 0,
      accepted: 0,
      rejected: 0,
      pending: 0,
      acceptanceRate: null,
    });
    expect(stats.byKind).toEqual([]);
  });

  it('aggregates total / accepted / rejected / pending and computes acceptanceRate (pending excluded from denominator)', async () => {
    const rows = [
      { kind: 'allocation', accepted: true, ...baseRow, createdAt: new Date(now) },
      { kind: 'allocation', accepted: true, ...baseRow, createdAt: new Date(now) },
      { kind: 'allocation', accepted: false, ...baseRow, createdAt: new Date(now) },
      { kind: 'allocation', accepted: null, ...baseRow, createdAt: new Date(now) },
      { kind: 'reschedule', accepted: false, ...baseRow, createdAt: new Date(now) },
      { kind: 'reschedule', accepted: false, ...baseRow, createdAt: new Date(now) },
    ];
    const db = makeDb(rows);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    const stats = await service.feedbackStats('u', false);

    expect(stats.overall.total).toBe(6);
    expect(stats.overall.accepted).toBe(2);
    expect(stats.overall.rejected).toBe(3);
    expect(stats.overall.pending).toBe(1);
    // acceptanceRate excludes pending: 2 / (2+3) = 0.4
    expect(stats.overall.acceptanceRate).toBe(0.4);

    const allocation = stats.byKind.find((b) => b.kind === 'allocation');
    expect(allocation).toMatchObject({ total: 4, accepted: 2, rejected: 1, pending: 1 });
    // 2 / (2+1) = 0.667
    expect(allocation?.acceptanceRate).toBeCloseTo(0.667, 2);

    const reschedule = stats.byKind.find((b) => b.kind === 'reschedule');
    expect(reschedule).toMatchObject({ total: 2, accepted: 0, rejected: 2, pending: 0 });
    expect(reschedule?.acceptanceRate).toBe(0);
  });

  it('windowed.last30d only counts items inside the 30-day window', async () => {
    const rows = [
      // inside window
      { kind: 'allocation', accepted: true, ...baseRow, createdAt: new Date(now - 5 * 86_400_000) },
      // outside window (older than 30d)
      { kind: 'allocation', accepted: true, ...baseRow, createdAt: new Date(now - 60 * 86_400_000) },
    ];
    const db = makeDb(rows);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    const stats = await service.feedbackStats('u', false);

    expect(stats.windowed.last30d.total).toBe(1);
    expect(stats.windowed.last30d.accepted).toBe(1);
    expect(stats.windowed.last30d.acceptanceRate).toBe(1);
  });

  it('byKind is ordered by total desc; modelMix counts by name@version', async () => {
    const rows = [
      { kind: 'allocation', accepted: true, ...baseRow, createdAt: new Date(now) },
      {
        kind: 'training',
        accepted: null,
        modelName: 'other',
        modelVersion: '0.1',
        createdAt: new Date(now),
      },
      { kind: 'allocation', accepted: true, ...baseRow, createdAt: new Date(now) },
    ];
    const db = makeDb(rows);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    const stats = await service.feedbackStats('u', false);
    expect(stats.byKind[0].kind).toBe('allocation');
    expect(stats.byKind[0].total).toBe(2);
    expect(stats.modelMix.length).toBe(2);
    const popularity = stats.modelMix.find((m) => m.modelName === 'popularity-baseline');
    expect(popularity?.count).toBe(2);
  });

  it('reports the correct scope label', async () => {
    const db = makeDb([]);
    const service = new RecommendationsService(db as never, stubRecommender as never);

    expect((await service.feedbackStats('u', false)).scope).toBe('self');
    expect((await service.feedbackStats('u', true)).scope).toBe('system');
  });
});
