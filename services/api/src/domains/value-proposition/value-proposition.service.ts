import type { PrismaClient } from '@prisma/client';
import type {
  ValuePropCreate,
  ValuePropUpdate,
  ValuePropListQuery,
  MatrixCellUpsert,
  CompetitiveGapCreate,
  CompetitiveGapUpdate,
} from './value-proposition.schemas.js';
import { NotFoundError } from '../../lib/errors.js';

export class ValuePropositionService {
  constructor(private readonly db: PrismaClient) {}

  list(filter: ValuePropListQuery) {
    return this.db.valueProposition.findMany({
      where: {
        ...(filter.audience ? { audience: filter.audience } : {}),
        ...(filter.active !== undefined ? { isActive: filter.active } : {}),
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getById(id: string) {
    const found = await this.db.valueProposition.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Value proposition ${id} not found`);
    return found;
  }

  create(data: ValuePropCreate) {
    return this.db.valueProposition.create({ data });
  }

  async update(id: string, data: ValuePropUpdate) {
    await this.getById(id);
    return this.db.valueProposition.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.valueProposition.delete({ where: { id } });
  }

  async getMatrix() {
    const [capabilities, competitors, cells] = await Promise.all([
      this.db.capability.findMany({ orderBy: { orderIndex: 'asc' } }),
      this.db.competitor.findMany({ orderBy: [{ isOwn: 'desc' }, { orderIndex: 'asc' }] }),
      this.db.matrixCell.findMany(),
    ]);
    return { capabilities, competitors, cells };
  }

  async upsertCell(capabilityId: string, competitorId: string, data: MatrixCellUpsert) {
    const [cap, comp] = await Promise.all([
      this.db.capability.findUnique({ where: { id: capabilityId } }),
      this.db.competitor.findUnique({ where: { id: competitorId } }),
    ]);
    if (!cap) throw new NotFoundError(`Capability ${capabilityId} not found`);
    if (!comp) throw new NotFoundError(`Competitor ${competitorId} not found`);
    return this.db.matrixCell.upsert({
      where: { capabilityId_competitorId: { capabilityId, competitorId } },
      create: { capabilityId, competitorId, value: data.value, note: data.note ?? null },
      update: { value: data.value, note: data.note ?? null },
    });
  }

  listGaps() {
    return this.db.competitiveGap.findMany({
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createGap(data: CompetitiveGapCreate) {
    return this.db.competitiveGap.create({ data });
  }

  async updateGap(id: string, data: CompetitiveGapUpdate) {
    const found = await this.db.competitiveGap.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Competitive gap ${id} not found`);
    return this.db.competitiveGap.update({ where: { id }, data });
  }

  async deleteGap(id: string) {
    const found = await this.db.competitiveGap.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Competitive gap ${id} not found`);
    await this.db.competitiveGap.delete({ where: { id } });
  }
}
