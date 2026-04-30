import type { PrismaClient, Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import type {
  MilestoneCreate,
  MilestoneUpdate,
  MilestoneListQuery,
  MilestoneStatus,
} from './milestones.schemas.js';

/**
 * Milestones service. Spec: /directives/milestones.md.
 *
 * Pure CRUD over Postgres + a small `transition()` helper that owns the
 * `completedAt` side-effect when a milestone moves into the `done` state
 * (or back out of it). The UI doesn't need to manage `completedAt` itself.
 */
export class MilestonesService {
  constructor(private readonly db: PrismaClient) {}

  list(filter: MilestoneListQuery) {
    return this.db.milestone.findMany({
      where: {
        ...(filter.phase !== undefined ? { phase: filter.phase } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ phase: 'asc' }, { orderIndex: 'asc' }, { code: 'asc' }],
    });
  }

  async getById(id: string) {
    const found = await this.db.milestone.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Milestone ${id} not found`);
    return found;
  }

  async create(data: MilestoneCreate) {
    const existing = await this.db.milestone.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictError(`Milestone code '${data.code}' already exists`);
    return this.db.milestone.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.status === 'done' ? new Date() : null,
      },
    });
  }

  async update(id: string, data: MilestoneUpdate) {
    await this.getById(id);
    const updates: Prisma.MilestoneUpdateInput = { ...data };
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.status !== undefined) {
      updates.completedAt = this.completedAtFor(data.status);
    }
    return this.db.milestone.update({ where: { id }, data: updates });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.db.milestone.delete({ where: { id } });
  }

  /** Convenience: change status only and update completedAt automatically. */
  async transition(id: string, status: MilestoneStatus) {
    await this.getById(id);
    return this.db.milestone.update({
      where: { id },
      data: { status, completedAt: this.completedAtFor(status) },
    });
  }

  /**
   * Counts grouped by phase × status — drives the dashboard KPI cards.
   * Always includes phases that have at least one milestone, plus a totals row.
   */
  async summary() {
    const items = await this.db.milestone.findMany({
      select: { phase: true, status: true, dueDate: true },
    });
    const now = new Date();
    const byPhase = new Map<
      number,
      { total: number; planned: number; in_progress: number; done: number; at_risk: number; skipped: number }
    >();
    let total = 0;
    let done = 0;
    let inProgress = 0;
    let atRiskDerived = 0;

    for (const m of items) {
      total++;
      if (m.status === 'done') done++;
      if (m.status === 'in_progress') inProgress++;
      const isOverdue = m.dueDate !== null && m.dueDate < now && m.status !== 'done' && m.status !== 'skipped';
      if (m.status === 'at_risk' || isOverdue) atRiskDerived++;
      const cell = byPhase.get(m.phase) ?? {
        total: 0,
        planned: 0,
        in_progress: 0,
        done: 0,
        at_risk: 0,
        skipped: 0,
      };
      cell.total++;
      cell[m.status as keyof typeof cell]++;
      byPhase.set(m.phase, cell);
    }

    return {
      total,
      done,
      inProgress,
      atRisk: atRiskDerived,
      donePct: total === 0 ? 0 : Math.round((done / total) * 100),
      phases: [...byPhase.entries()]
        .sort(([a], [b]) => a - b)
        .map(([phase, counts]) => ({ phase, ...counts })),
    };
  }

  // --- helpers ---

  private completedAtFor(status: MilestoneStatus): Date | null {
    return status === 'done' ? new Date() : null;
  }
}
