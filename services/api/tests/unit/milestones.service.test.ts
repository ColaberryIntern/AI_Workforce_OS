import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MilestonesService } from '../../src/domains/milestones/milestones.service.js';
import { ConflictError, NotFoundError } from '../../src/lib/errors.js';

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>;

function makeDb() {
  return {
    milestone: {
      findMany: jest.fn<AnyAsyncFn>(),
      findUnique: jest.fn<AnyAsyncFn>(),
      create: jest.fn<AnyAsyncFn>(),
      update: jest.fn<AnyAsyncFn>(),
      delete: jest.fn<AnyAsyncFn>(),
    },
  };
}

describe('MilestonesService', () => {
  let db: ReturnType<typeof makeDb>;
  let service: MilestonesService;

  beforeEach(() => {
    db = makeDb();
    service = new MilestonesService(db as never);
  });

  it('list forwards phase + status filters', async () => {
    db.milestone.findMany.mockResolvedValue([{ id: 'm1', code: '1.1' }]);
    await service.list({ phase: 1, status: 'in_progress' });
    expect(db.milestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phase: 1, status: 'in_progress' },
        orderBy: [{ phase: 'asc' }, { orderIndex: 'asc' }, { code: 'asc' }],
      }),
    );
  });

  it('getById throws NotFound when missing', async () => {
    db.milestone.findUnique.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('create rejects duplicate code with Conflict', async () => {
    db.milestone.findUnique.mockResolvedValue({ id: 'm1', code: '1.1' });
    await expect(
      service.create({ phase: 1, code: '1.1', title: 'x', status: 'planned', orderIndex: 0 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(db.milestone.create).not.toHaveBeenCalled();
  });

  it('create coerces dueDate string to Date and sets completedAt only when status=done', async () => {
    db.milestone.findUnique.mockResolvedValue(null);
    db.milestone.create.mockImplementation((async (args: { data: Record<string, unknown> }) => args.data) as AnyAsyncFn);

    const planned = (await service.create({
      phase: 1,
      code: '1.1',
      title: 'x',
      status: 'planned',
      orderIndex: 0,
      dueDate: '2026-06-01T00:00:00.000Z',
    })) as { dueDate: Date | null; completedAt: Date | null };
    expect(planned.dueDate).toBeInstanceOf(Date);
    expect(planned.completedAt).toBeNull();

    db.milestone.findUnique.mockResolvedValue(null);
    const done = (await service.create({
      phase: 1,
      code: '1.2',
      title: 'y',
      status: 'done',
      orderIndex: 1,
    })) as { completedAt: Date | null };
    expect(done.completedAt).toBeInstanceOf(Date);
  });

  it('transition sets completedAt for done and clears it otherwise', async () => {
    db.milestone.findUnique.mockResolvedValue({ id: 'm1' });
    db.milestone.update.mockImplementation((async (args: { data: Record<string, unknown> }) => args.data) as AnyAsyncFn);

    const doneArgs = (await service.transition('m1', 'done')) as { status: string; completedAt: Date | null };
    expect(doneArgs.status).toBe('done');
    expect(doneArgs.completedAt).toBeInstanceOf(Date);

    const plannedArgs = (await service.transition('m1', 'planned')) as { completedAt: Date | null };
    expect(plannedArgs.completedAt).toBeNull();
  });

  it('summary buckets per phase × status and counts derived at_risk', async () => {
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    db.milestone.findMany.mockResolvedValue([
      { phase: 1, status: 'done', dueDate: past },
      { phase: 1, status: 'in_progress', dueDate: future },
      { phase: 1, status: 'planned', dueDate: past }, // overdue → counts as at-risk
      { phase: 2, status: 'planned', dueDate: future },
      { phase: 2, status: 'at_risk', dueDate: future }, // explicit at-risk
    ]);

    const summary = await service.summary();
    expect(summary.total).toBe(5);
    expect(summary.done).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.atRisk).toBe(2); // overdue planned + explicit at_risk
    expect(summary.donePct).toBe(20);

    const phase1 = summary.phases.find((p) => p.phase === 1);
    expect(phase1).toMatchObject({ total: 3, done: 1, in_progress: 1, planned: 1 });
    const phase2 = summary.phases.find((p) => p.phase === 2);
    expect(phase2).toMatchObject({ total: 2, planned: 1, at_risk: 1 });
  });

  it('delete throws NotFound for missing id (and does not call delete)', async () => {
    db.milestone.findUnique.mockResolvedValue(null);
    await expect(service.delete('nope')).rejects.toBeInstanceOf(NotFoundError);
    expect(db.milestone.delete).not.toHaveBeenCalled();
  });
});
