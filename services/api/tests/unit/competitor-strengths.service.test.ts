import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ValuePropositionService } from '../../src/domains/value-proposition/value-proposition.service.js';
import { ConflictError, NotFoundError } from '../../src/lib/errors.js';

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>;

function makeDb() {
  return {
    competitorStrength: {
      findMany: jest.fn<AnyAsyncFn>(),
      findUnique: jest.fn<AnyAsyncFn>(),
      create: jest.fn<AnyAsyncFn>(),
      update: jest.fn<AnyAsyncFn>(),
      delete: jest.fn<AnyAsyncFn>(),
    },
  };
}

describe('ValuePropositionService — CompetitorStrength', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ValuePropositionService;

  beforeEach(() => {
    db = makeDb();
    service = new ValuePropositionService(db as never);
  });

  it('listStrengths forwards active filter to Prisma and orders by orderIndex', async () => {
    db.competitorStrength.findMany.mockResolvedValue([{ id: 's1' }]);
    await service.listStrengths({ active: true });
    expect(db.competitorStrength.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  });

  it('listStrengths with no filter does not constrain on isActive', async () => {
    db.competitorStrength.findMany.mockResolvedValue([]);
    await service.listStrengths({});
    expect(db.competitorStrength.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('getStrength throws NotFound on missing id', async () => {
    db.competitorStrength.findUnique.mockResolvedValue(null);
    await expect(service.getStrength('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('createStrength rejects duplicate title with Conflict', async () => {
    db.competitorStrength.findUnique.mockResolvedValue({ id: 's1', title: 'Brand recognition' });
    await expect(
      service.createStrength({
        title: 'Brand recognition',
        description: 'd',
        ourCounter: 'c',
        orderIndex: 0,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(db.competitorStrength.create).not.toHaveBeenCalled();
  });

  it('createStrength persists when title is new', async () => {
    db.competitorStrength.findUnique.mockResolvedValue(null);
    db.competitorStrength.create.mockResolvedValue({ id: 's1' });
    const result = await service.createStrength({
      title: 'New strength',
      description: 'd',
      ourCounter: 'c',
      orderIndex: 0,
      isActive: true,
    });
    expect(db.competitorStrength.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 's1' });
  });

  it('deleteStrength throws NotFound when missing (and never calls delete)', async () => {
    db.competitorStrength.findUnique.mockResolvedValue(null);
    await expect(service.deleteStrength('nope')).rejects.toBeInstanceOf(NotFoundError);
    expect(db.competitorStrength.delete).not.toHaveBeenCalled();
  });

  it('updateStrength returns the updated row', async () => {
    db.competitorStrength.findUnique.mockResolvedValue({ id: 's1' });
    db.competitorStrength.update.mockResolvedValue({ id: 's1', orderIndex: 7 });
    const result = await service.updateStrength('s1', { orderIndex: 7 });
    expect(result).toEqual({ id: 's1', orderIndex: 7 });
  });
});
