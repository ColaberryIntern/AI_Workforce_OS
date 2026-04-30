import type { PrismaClient, Prisma } from '@prisma/client';
import type { ListAuditQuery, AppendAuditInput } from './audit-log.schemas.js';

/** Append-only audit log service. Spec: /directives/audit_logging.md. */
export class AuditLogService {
  constructor(private readonly db: PrismaClient) {}

  async list(filter: ListAuditQuery) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.action) where.action = filter.action;
    if (filter.from || filter.to) {
      where.occurredAt = {};
      if (filter.from) where.occurredAt.gte = new Date(filter.from);
      if (filter.to) where.occurredAt.lte = new Date(filter.to);
    }

    const items = await this.db.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: filter.limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > filter.limit;
    const page = hasMore ? items.slice(0, filter.limit) : items;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return { items: page, nextCursor };
  }

  append(userId: string | null, input: AppendAuditInput) {
    return this.db.auditLog.create({
      data: {
        userId,
        action: input.action,
        resource: input.resource,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
