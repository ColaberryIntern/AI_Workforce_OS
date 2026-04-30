import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SubscriptionService } from '../../src/domains/subscription/subscription.service.js';
import { NotFoundError, ConflictError } from '../../src/lib/errors.js';

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>;

function mockEntity() {
  return {
    findMany: jest.fn<AnyAsyncFn>(),
    findUnique: jest.fn<AnyAsyncFn>(),
    findFirst: jest.fn<AnyAsyncFn>(),
    create: jest.fn<AnyAsyncFn>(),
    update: jest.fn<AnyAsyncFn>(),
    delete: jest.fn<AnyAsyncFn>(),
  };
}

function makeDb() {
  return {
    subscriptionTier: mockEntity(),
    addOn: mockEntity(),
    marketingChannel: mockEntity(),
    partnership: mockEntity(),
    event: mockEntity(),
    consultingService: mockEntity(),
    trainingProgram: mockEntity(),
    competitor: mockEntity(),
    competitorInsight: mockEntity(),
  };
}

describe('SubscriptionService', () => {
  let db: ReturnType<typeof makeDb>;
  let service: SubscriptionService;

  beforeEach(() => {
    db = makeDb();
    service = new SubscriptionService(db as never);
  });

  describe('SubscriptionTier', () => {
    it('listTiers forwards active filter to Prisma', async () => {
      db.subscriptionTier.findMany.mockResolvedValue([{ id: 't1', key: 'basic' }]);
      const items = await service.listTiers({ active: true });
      expect(db.subscriptionTier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: [{ orderIndex: 'asc' }, { monthlyPriceCents: 'asc' }],
        }),
      );
      expect(items).toHaveLength(1);
    });

    it('getTier throws NotFound when missing', async () => {
      db.subscriptionTier.findUnique.mockResolvedValue(null);
      await expect(service.getTier('missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('createTier rejects duplicate key with Conflict', async () => {
      db.subscriptionTier.findUnique.mockResolvedValue({ id: 't1', key: 'basic' });
      await expect(
        service.createTier({
          key: 'basic',
          name: 'Basic',
          monthlyPriceCents: 2900,
          features: [],
          orderIndex: 0,
          isActive: true,
        }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(db.subscriptionTier.create).not.toHaveBeenCalled();
    });

    it('createTier persists when key is new', async () => {
      db.subscriptionTier.findUnique.mockResolvedValue(null);
      db.subscriptionTier.create.mockResolvedValue({ id: 't1', key: 'pro' });
      const result = await service.createTier({
        key: 'pro',
        name: 'Professional',
        monthlyPriceCents: 7900,
        features: [],
        orderIndex: 1,
        isActive: true,
      });
      expect(db.subscriptionTier.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 't1', key: 'pro' });
    });
  });

  describe('AddOn', () => {
    it('listAddOns filters by tier using `has` operator', async () => {
      db.addOn.findMany.mockResolvedValue([{ id: 'a1', name: 'Advanced analytics' }]);
      await service.listAddOns({ tier: 'professional', active: true });
      expect(db.addOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, applicableTierKeys: { has: 'professional' } },
        }),
      );
    });
  });

  describe('CompetitorInsight', () => {
    it('createCompetitorInsight rejects unknown competitorId with NotFound', async () => {
      db.competitor.findUnique.mockResolvedValue(null);
      await expect(
        service.createCompetitorInsight({
          competitorId: 'missing',
          kind: 'strength',
          summary: 'x',
          orderIndex: 0,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(db.competitorInsight.create).not.toHaveBeenCalled();
    });

    it('createCompetitorInsight persists when competitor exists', async () => {
      db.competitor.findUnique.mockResolvedValue({ id: 'c1', name: 'Kronos' });
      db.competitorInsight.create.mockResolvedValue({ id: 'ci1' });
      const result = await service.createCompetitorInsight({
        competitorId: 'c1',
        kind: 'strength',
        summary: 'Strong brand',
        orderIndex: 0,
      });
      expect(db.competitorInsight.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'ci1' });
    });

    it('listCompetitorInsights forwards both filters', async () => {
      db.competitorInsight.findMany.mockResolvedValue([]);
      await service.listCompetitorInsights({ competitorId: 'c1', kind: 'weakness' });
      expect(db.competitorInsight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { competitorId: 'c1', kind: 'weakness' },
          include: expect.any(Object),
        }),
      );
    });
  });

  describe('Event upcoming filter', () => {
    it('upcoming=true narrows to scheduled and future', async () => {
      db.event.findMany.mockResolvedValue([]);
      await service.listEvents({ upcoming: true });
      const call = db.event.findMany.mock.calls[0][0] as { where: { status: string; scheduledAt: { gte: Date } } };
      expect(call.where.status).toBe('scheduled');
      expect(call.where.scheduledAt.gte).toBeInstanceOf(Date);
    });
  });

  describe('Partnership', () => {
    it('createPartnership rejects duplicate name with Conflict', async () => {
      db.partnership.findUnique.mockResolvedValue({ id: 'p1', name: 'Allegis' });
      await expect(
        service.createPartnership({
          name: 'Allegis',
          partnerType: 'consulting_firm',
          status: 'prospect',
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('createPartnership coerces startedAt string to Date', async () => {
      db.partnership.findUnique.mockResolvedValue(null);
      db.partnership.create.mockResolvedValue({ id: 'p1' });
      await service.createPartnership({
        name: 'New partner',
        partnerType: 'industry_association',
        status: 'active',
        startedAt: '2026-01-15T00:00:00.000Z',
      });
      const call = db.partnership.create.mock.calls[0][0] as { data: { startedAt: Date | null } };
      expect(call.data.startedAt).toBeInstanceOf(Date);
    });
  });
});
