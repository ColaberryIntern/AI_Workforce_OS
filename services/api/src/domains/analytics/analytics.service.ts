import type { PrismaClient, Prisma } from '@prisma/client';
import type { IngestInput, QueryInput, AnalyticsEventInput } from './analytics.schemas.js';

const PII_KEYS = new Set(['email', 'password', 'phone', 'ssn', 'token']);

function scrubPii(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (PII_KEYS.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

export class AnalyticsService {
  constructor(private readonly db: PrismaClient) {}

  async ingest(input: IngestInput) {
    const data = input.events.map((e: AnalyticsEventInput) => ({
      userId: e.userId ?? null,
      eventName: e.eventName,
      payload: scrubPii(e.payload) as Prisma.InputJsonValue,
      sessionId: e.sessionId ?? null,
      occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
    }));
    const result = await this.db.analyticsEvent.createMany({ data });
    return { accepted: result.count };
  }

  async query(filter: QueryInput) {
    const where: Prisma.AnalyticsEventWhereInput = {};
    if (filter.eventName) where.eventName = filter.eventName;
    if (filter.userId) where.userId = filter.userId;
    if (filter.sessionId) where.sessionId = filter.sessionId;
    if (filter.from || filter.to) {
      where.occurredAt = {};
      if (filter.from) where.occurredAt.gte = new Date(filter.from);
      if (filter.to) where.occurredAt.lte = new Date(filter.to);
    }
    return this.db.analyticsEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: filter.limit,
    });
  }

  async summary(now: Date = new Date()) {
    const day = 86_400_000;
    const since1 = new Date(now.getTime() - day);
    const since7 = new Date(now.getTime() - 7 * day);
    const since30 = new Date(now.getTime() - 30 * day);

    const [dau, wau, mau, topEvents] = await Promise.all([
      this.db.analyticsEvent.findMany({
        where: { occurredAt: { gte: since1 }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.db.analyticsEvent.findMany({
        where: { occurredAt: { gte: since7 }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.db.analyticsEvent.findMany({
        where: { occurredAt: { gte: since30 }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.db.analyticsEvent.groupBy({
        by: ['eventName'],
        where: { occurredAt: { gte: since7 } },
        _count: { _all: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      windowEnd: now.toISOString(),
      dau: dau.length,
      wau: wau.length,
      mau: mau.length,
      topEvents: topEvents.map((e) => ({ eventName: e.eventName, count: e._count._all })),
    };
  }
}
