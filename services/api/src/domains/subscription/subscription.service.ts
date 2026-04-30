import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type {
  SubscriptionTierCreate,
  SubscriptionTierUpdate,
  SubscriptionTierListQuery,
  AddOnCreate,
  AddOnUpdate,
  AddOnListQuery,
  MarketingChannelCreate,
  MarketingChannelUpdate,
  MarketingChannelListQuery,
  PartnershipCreate,
  PartnershipUpdate,
  PartnershipListQuery,
  EventCreate,
  EventUpdate,
  EventListQuery,
  ConsultingServiceCreate,
  ConsultingServiceUpdate,
  TrainingProgramCreate,
  TrainingProgramUpdate,
  TrainingProgramListQuery,
  CompetitorInsightCreate,
  CompetitorInsightUpdate,
  CompetitorInsightListQuery,
} from './subscription.schemas.js';

/**
 * Service class covering the Subscription / commercial domain.
 * Spec: /directives/subscription_tiers.md.
 *
 * Methods grouped by entity. Pure functions over Prisma — same shape as
 * `ValuePropositionService` so domain conventions stay consistent.
 */
export class SubscriptionService {
  constructor(private readonly db: PrismaClient) {}

  // =================================================================
  // SubscriptionTier
  // =================================================================

  listTiers(filter: SubscriptionTierListQuery) {
    return this.db.subscriptionTier.findMany({
      where: { ...(filter.active !== undefined ? { isActive: filter.active } : {}) },
      orderBy: [{ orderIndex: 'asc' }, { monthlyPriceCents: 'asc' }],
    });
  }

  async getTier(id: string) {
    const found = await this.db.subscriptionTier.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Subscription tier ${id} not found`);
    return found;
  }

  async createTier(data: SubscriptionTierCreate) {
    const existing = await this.db.subscriptionTier.findUnique({ where: { key: data.key } });
    if (existing) throw new ConflictError(`Subscription tier '${data.key}' already exists`);
    return this.db.subscriptionTier.create({ data });
  }

  async updateTier(id: string, data: SubscriptionTierUpdate) {
    await this.getTier(id);
    return this.db.subscriptionTier.update({ where: { id }, data });
  }

  async deleteTier(id: string) {
    await this.getTier(id);
    await this.db.subscriptionTier.delete({ where: { id } });
  }

  // =================================================================
  // AddOn
  // =================================================================

  listAddOns(filter: AddOnListQuery) {
    const where: Prisma.AddOnWhereInput = {};
    if (filter.active !== undefined) where.isActive = filter.active;
    if (filter.tier) where.applicableTierKeys = { has: filter.tier };
    return this.db.addOn.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { monthlyPriceCents: 'asc' }],
    });
  }

  async getAddOn(id: string) {
    const found = await this.db.addOn.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Add-on ${id} not found`);
    return found;
  }

  async createAddOn(data: AddOnCreate) {
    const existing = await this.db.addOn.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError(`Add-on '${data.name}' already exists`);
    return this.db.addOn.create({ data });
  }

  async updateAddOn(id: string, data: AddOnUpdate) {
    await this.getAddOn(id);
    return this.db.addOn.update({ where: { id }, data });
  }

  async deleteAddOn(id: string) {
    await this.getAddOn(id);
    await this.db.addOn.delete({ where: { id } });
  }

  // =================================================================
  // MarketingChannel
  // =================================================================

  listMarketingChannels(filter: MarketingChannelListQuery) {
    return this.db.marketingChannel.findMany({
      where: {
        ...(filter.channelType ? { channelType: filter.channelType } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  async getMarketingChannel(id: string) {
    const found = await this.db.marketingChannel.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Marketing channel ${id} not found`);
    return found;
  }

  async createMarketingChannel(data: MarketingChannelCreate) {
    const existing = await this.db.marketingChannel.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError(`Marketing channel '${data.name}' already exists`);
    return this.db.marketingChannel.create({ data });
  }

  async updateMarketingChannel(id: string, data: MarketingChannelUpdate) {
    await this.getMarketingChannel(id);
    return this.db.marketingChannel.update({ where: { id }, data });
  }

  async deleteMarketingChannel(id: string) {
    await this.getMarketingChannel(id);
    await this.db.marketingChannel.delete({ where: { id } });
  }

  // =================================================================
  // Partnership
  // =================================================================

  listPartnerships(filter: PartnershipListQuery) {
    return this.db.partnership.findMany({
      where: {
        ...(filter.partnerType ? { partnerType: filter.partnerType } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async getPartnership(id: string) {
    const found = await this.db.partnership.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Partnership ${id} not found`);
    return found;
  }

  async createPartnership(data: PartnershipCreate) {
    const existing = await this.db.partnership.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError(`Partnership '${data.name}' already exists`);
    return this.db.partnership.create({
      data: {
        ...data,
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
      },
    });
  }

  async updatePartnership(id: string, data: PartnershipUpdate) {
    await this.getPartnership(id);
    return this.db.partnership.update({
      where: { id },
      data: {
        ...data,
        ...(data.startedAt !== undefined
          ? { startedAt: data.startedAt ? new Date(data.startedAt) : null }
          : {}),
      },
    });
  }

  async deletePartnership(id: string) {
    await this.getPartnership(id);
    await this.db.partnership.delete({ where: { id } });
  }

  // =================================================================
  // Event (webinars + demos)
  // =================================================================

  listEvents(filter: EventListQuery) {
    const where: Prisma.EventWhereInput = {};
    if (filter.eventType) where.eventType = filter.eventType;
    if (filter.status) where.status = filter.status;
    if (filter.upcoming === true) {
      where.scheduledAt = { gte: new Date() };
      where.status = where.status ?? 'scheduled';
    }
    return this.db.event.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getEvent(id: string) {
    const found = await this.db.event.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Event ${id} not found`);
    return found;
  }

  async createEvent(data: EventCreate) {
    return this.db.event.create({
      data: { ...data, scheduledAt: new Date(data.scheduledAt) },
    });
  }

  async updateEvent(id: string, data: EventUpdate) {
    await this.getEvent(id);
    return this.db.event.update({
      where: { id },
      data: {
        ...data,
        ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
      },
    });
  }

  async deleteEvent(id: string) {
    await this.getEvent(id);
    await this.db.event.delete({ where: { id } });
  }

  // =================================================================
  // ConsultingService
  // =================================================================

  listConsultingServices() {
    return this.db.consultingService.findMany({
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  async getConsultingService(id: string) {
    const found = await this.db.consultingService.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Consulting service ${id} not found`);
    return found;
  }

  async createConsultingService(data: ConsultingServiceCreate) {
    const existing = await this.db.consultingService.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError(`Consulting service '${data.name}' already exists`);
    return this.db.consultingService.create({ data });
  }

  async updateConsultingService(id: string, data: ConsultingServiceUpdate) {
    await this.getConsultingService(id);
    return this.db.consultingService.update({ where: { id }, data });
  }

  async deleteConsultingService(id: string) {
    await this.getConsultingService(id);
    await this.db.consultingService.delete({ where: { id } });
  }

  // =================================================================
  // TrainingProgram
  // =================================================================

  listTrainingPrograms(filter: TrainingProgramListQuery) {
    return this.db.trainingProgram.findMany({
      where: {
        ...(filter.format ? { format: filter.format } : {}),
        ...(filter.level ? { level: filter.level } : {}),
      },
      orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
    });
  }

  async getTrainingProgram(id: string) {
    const found = await this.db.trainingProgram.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Training program ${id} not found`);
    return found;
  }

  async createTrainingProgram(data: TrainingProgramCreate) {
    const existing = await this.db.trainingProgram.findUnique({ where: { title: data.title } });
    if (existing) throw new ConflictError(`Training program '${data.title}' already exists`);
    return this.db.trainingProgram.create({ data });
  }

  async updateTrainingProgram(id: string, data: TrainingProgramUpdate) {
    await this.getTrainingProgram(id);
    return this.db.trainingProgram.update({ where: { id }, data });
  }

  async deleteTrainingProgram(id: string) {
    await this.getTrainingProgram(id);
    await this.db.trainingProgram.delete({ where: { id } });
  }

  // =================================================================
  // CompetitorInsight
  // =================================================================

  listCompetitorInsights(filter: CompetitorInsightListQuery) {
    return this.db.competitorInsight.findMany({
      where: {
        ...(filter.competitorId ? { competitorId: filter.competitorId } : {}),
        ...(filter.kind ? { kind: filter.kind } : {}),
      },
      orderBy: [{ kind: 'asc' }, { orderIndex: 'asc' }],
      include: { competitor: { select: { id: true, name: true, isOwn: true } } },
    });
  }

  async getCompetitorInsight(id: string) {
    const found = await this.db.competitorInsight.findUnique({
      where: { id },
      include: { competitor: { select: { id: true, name: true, isOwn: true } } },
    });
    if (!found) throw new NotFoundError(`Competitor insight ${id} not found`);
    return found;
  }

  async createCompetitorInsight(data: CompetitorInsightCreate) {
    // Validate the competitor exists — the FK would catch this at DB time, but
    // returning a clean 404 is friendlier than letting Prisma throw P2003.
    const competitor = await this.db.competitor.findUnique({ where: { id: data.competitorId } });
    if (!competitor) throw new NotFoundError(`Competitor ${data.competitorId} not found`);
    return this.db.competitorInsight.create({ data });
  }

  async updateCompetitorInsight(id: string, data: CompetitorInsightUpdate) {
    await this.getCompetitorInsight(id);
    if (data.competitorId) {
      const competitor = await this.db.competitor.findUnique({ where: { id: data.competitorId } });
      if (!competitor) throw new NotFoundError(`Competitor ${data.competitorId} not found`);
    }
    return this.db.competitorInsight.update({ where: { id }, data });
  }

  async deleteCompetitorInsight(id: string) {
    await this.getCompetitorInsight(id);
    await this.db.competitorInsight.delete({ where: { id } });
  }
}
