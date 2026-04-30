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
}
