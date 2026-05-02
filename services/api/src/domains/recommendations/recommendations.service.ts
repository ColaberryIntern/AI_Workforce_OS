import type { PrismaClient, Prisma } from '@prisma/client';
import type { GenerateInput, ListInput } from './recommendations.schemas.js';
import type { RecommenderProvider } from '../../lib/providers/RecommenderProvider.js';
import { NotFoundError } from '../../lib/errors.js';

export class RecommendationsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly recommender: RecommenderProvider,
  ) {}

  async generate(input: GenerateInput) {
    const user = await this.db.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundError(`User ${input.userId} not found`);

    const recentHistory = await this.db.recommendation.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const items = await this.recommender.recommend({
      user: {
        userId: input.userId,
        role: input.context.role,
        location: input.context.location,
        skills: input.context.skills,
      },
      history: recentHistory.map((h) => ({
        kind: h.kind,
        accepted: h.accepted,
        occurredAt: h.createdAt,
      })),
      k: input.k,
    });

    // Persist
    const created = await this.db.$transaction(
      items.map((it) =>
        this.db.recommendation.create({
          data: {
            userId: input.userId,
            staffingEventId: input.staffingEventId ?? null,
            kind: it.kind,
            payload: it.payload as Prisma.InputJsonValue,
            confidence: it.confidence,
            modelName: it.modelName,
            modelVersion: it.modelVersion,
          },
        }),
      ),
    );
    return created;
  }

  list(filter: ListInput, requestingUserId?: string, isAdmin = false) {
    const where: Prisma.RecommendationWhereInput = {};
    if (!isAdmin && requestingUserId) where.userId = requestingUserId;
    if (filter.userId && (isAdmin || filter.userId === requestingUserId)) where.userId = filter.userId;
    return this.db.recommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
    });
  }

  async getById(id: string, requestingUserId?: string, isAdmin = false) {
    const found = await this.db.recommendation.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Recommendation ${id} not found`);
    if (!isAdmin && requestingUserId && found.userId !== requestingUserId) {
      throw new NotFoundError(`Recommendation ${id} not found`);
    }
    return found;
  }

  async accept(id: string, userId: string) {
    const r = await this.getById(id, userId, false);
    return this.db.recommendation.update({
      where: { id: r.id },
      data: { accepted: true },
    });
  }

  async reject(id: string, userId: string, feedback?: string) {
    const r = await this.getById(id, userId, false);
    return this.db.recommendation.update({
      where: { id: r.id },
      data: { accepted: false, feedback: feedback ?? null },
    });
  }

  /**
   * Aggregate feedback signal — surfaces the accept/reject pattern that the
   * recommender uses internally so callers can verify "the model is learning
   * from my feedback" without inspecting individual rows.
   *
   * Build Guide §4 #11 Recommender Acceptance — "Recommendations must be
   * updated based on user feedback."
   *
   * Self-scoped by default (`isAdmin=false` and `userId` provided).
   * System-wide when `isAdmin=true`.
   */
  async feedbackStats(userId: string | null, isAdmin: boolean) {
    const where: Prisma.RecommendationWhereInput = {};
    if (!isAdmin) {
      if (!userId) return this.emptyStats();
      where.userId = userId;
    }

    const items = await this.db.recommendation.findMany({
      where,
      select: {
        kind: true,
        accepted: true,
        modelName: true,
        modelVersion: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const since30 = new Date(Date.now() - 30 * 86_400_000);

    const overall = { total: 0, accepted: 0, rejected: 0, pending: 0 };
    const byKindMap = new Map<
      string,
      { kind: string; total: number; accepted: number; rejected: number; pending: number }
    >();
    const modelMixMap = new Map<string, { modelName: string; modelVersion: string; count: number }>();
    let last30Total = 0;
    let last30Accepted = 0;

    for (const r of items) {
      overall.total++;
      const kindBucket = byKindMap.get(r.kind) ?? {
        kind: r.kind,
        total: 0,
        accepted: 0,
        rejected: 0,
        pending: 0,
      };
      kindBucket.total++;
      if (r.accepted === true) {
        overall.accepted++;
        kindBucket.accepted++;
      } else if (r.accepted === false) {
        overall.rejected++;
        kindBucket.rejected++;
      } else {
        overall.pending++;
        kindBucket.pending++;
      }
      byKindMap.set(r.kind, kindBucket);

      const modelKey = `${r.modelName}@${r.modelVersion}`;
      const modelBucket = modelMixMap.get(modelKey) ?? {
        modelName: r.modelName,
        modelVersion: r.modelVersion,
        count: 0,
      };
      modelBucket.count++;
      modelMixMap.set(modelKey, modelBucket);

      if (r.createdAt >= since30) {
        last30Total++;
        if (r.accepted === true) last30Accepted++;
      }
    }

    const acceptanceRate = (acc: number, total: number) =>
      total === 0 ? null : Math.round((acc / total) * 1000) / 1000;

    return {
      scope: isAdmin ? ('system' as const) : ('self' as const),
      overall: {
        ...overall,
        acceptanceRate: acceptanceRate(overall.accepted, overall.accepted + overall.rejected),
      },
      byKind: [...byKindMap.values()]
        .map((b) => ({
          ...b,
          acceptanceRate: acceptanceRate(b.accepted, b.accepted + b.rejected),
        }))
        .sort((a, b) => b.total - a.total),
      windowed: {
        last30d: {
          total: last30Total,
          accepted: last30Accepted,
          acceptanceRate: acceptanceRate(last30Accepted, last30Total),
        },
      },
      modelMix: [...modelMixMap.values()].sort((a, b) => b.count - a.count),
    };
  }

  private emptyStats() {
    return {
      scope: 'self' as const,
      overall: { total: 0, accepted: 0, rejected: 0, pending: 0, acceptanceRate: null },
      byKind: [] as Array<{
        kind: string;
        total: number;
        accepted: number;
        rejected: number;
        pending: number;
        acceptanceRate: number | null;
      }>,
      windowed: { last30d: { total: 0, accepted: 0, acceptanceRate: null } },
      modelMix: [] as Array<{ modelName: string; modelVersion: string; count: number }>,
    };
  }
}
