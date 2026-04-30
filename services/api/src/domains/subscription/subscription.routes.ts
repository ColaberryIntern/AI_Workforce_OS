import { Router } from 'express';
import { SubscriptionService } from './subscription.service.js';
import {
  idParamSchema,
  subscriptionTierCreateSchema,
  subscriptionTierUpdateSchema,
  subscriptionTierListQuerySchema,
  addOnCreateSchema,
  addOnUpdateSchema,
  addOnListQuerySchema,
  marketingChannelCreateSchema,
  marketingChannelUpdateSchema,
  marketingChannelListQuerySchema,
  partnershipCreateSchema,
  partnershipUpdateSchema,
  partnershipListQuerySchema,
  eventCreateSchema,
  eventUpdateSchema,
  eventListQuerySchema,
  consultingServiceCreateSchema,
  consultingServiceUpdateSchema,
  trainingProgramCreateSchema,
  trainingProgramUpdateSchema,
  trainingProgramListQuerySchema,
  competitorInsightCreateSchema,
  competitorInsightUpdateSchema,
  competitorInsightListQuerySchema,
} from './subscription.schemas.js';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/**
 * Subscription / commercial routers.
 * Spec: /directives/subscription_tiers.md.
 *
 * Mount points (set in src/routes/index.ts):
 *   /api/subscription-tiers      public reads, content.write mutates
 *   /api/add-ons                 public reads, content.write mutates
 *   /api/events                  public reads, content.write mutates
 *   /api/consulting-services     public reads, content.write mutates
 *   /api/training-programs       public reads, content.write mutates
 *   /api/marketing-channels      requireAuth reads, content.write mutates
 *   /api/partnerships            requireAuth reads, content.write mutates
 *   /api/competitor-insights     requireAuth reads, content.write mutates
 */

const service = new SubscriptionService(getPrisma());

export const subscriptionTiersRouter = Router();
export const addOnsRouter = Router();
export const eventsRouter = Router();
export const consultingServicesRouter = Router();
export const trainingProgramsRouter = Router();
export const marketingChannelsRouter = Router();
export const partnershipsRouter = Router();
export const competitorInsightsRouter = Router();

// =================================================================
// SubscriptionTier — public reads
// =================================================================

subscriptionTiersRouter.get('/', validateQuery(subscriptionTierListQuerySchema), async (req, res) => {
  const items = await service.listTiers(req.query as never);
  res.json(ok(items, { count: items.length }));
});

subscriptionTiersRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getTier((req.params as { id: string }).id);
  res.json(ok(item));
});

subscriptionTiersRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(subscriptionTierCreateSchema),
  audit('subscription_tier.create', (req) => `subscription_tier:${(req.body as { key: string }).key}`),
  async (req, res) => {
    const created = await service.createTier(req.body);
    res.status(201).json(ok(created));
  },
);

subscriptionTiersRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(subscriptionTierUpdateSchema),
  audit('subscription_tier.update', (req) => `subscription_tier:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateTier((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

subscriptionTiersRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('subscription_tier.delete', (req) => `subscription_tier:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteTier((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// AddOn — public reads
// =================================================================

addOnsRouter.get('/', validateQuery(addOnListQuerySchema), async (req, res) => {
  const items = await service.listAddOns(req.query as never);
  res.json(ok(items, { count: items.length }));
});

addOnsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getAddOn((req.params as { id: string }).id);
  res.json(ok(item));
});

addOnsRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(addOnCreateSchema),
  audit('add_on.create', (req) => `add_on:${(req.body as { name: string }).name}`),
  async (req, res) => {
    const created = await service.createAddOn(req.body);
    res.status(201).json(ok(created));
  },
);

addOnsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(addOnUpdateSchema),
  audit('add_on.update', (req) => `add_on:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateAddOn((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

addOnsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('add_on.delete', (req) => `add_on:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteAddOn((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// Event (webinars + demos) — public reads
// =================================================================

eventsRouter.get('/', validateQuery(eventListQuerySchema), async (req, res) => {
  const items = await service.listEvents(req.query as never);
  res.json(ok(items, { count: items.length }));
});

eventsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getEvent((req.params as { id: string }).id);
  res.json(ok(item));
});

eventsRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(eventCreateSchema),
  audit('event.create', (req) => `event:${(req.body as { title: string }).title}`),
  async (req, res) => {
    const created = await service.createEvent(req.body);
    res.status(201).json(ok(created));
  },
);

eventsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(eventUpdateSchema),
  audit('event.update', (req) => `event:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateEvent((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

eventsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('event.delete', (req) => `event:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteEvent((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// ConsultingService — public reads
// =================================================================

consultingServicesRouter.get('/', async (_req, res) => {
  const items = await service.listConsultingServices();
  res.json(ok(items, { count: items.length }));
});

consultingServicesRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getConsultingService((req.params as { id: string }).id);
  res.json(ok(item));
});

consultingServicesRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(consultingServiceCreateSchema),
  audit('consulting_service.create', (req) => `consulting_service:${(req.body as { name: string }).name}`),
  async (req, res) => {
    const created = await service.createConsultingService(req.body);
    res.status(201).json(ok(created));
  },
);

consultingServicesRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(consultingServiceUpdateSchema),
  audit('consulting_service.update', (req) => `consulting_service:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateConsultingService((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

consultingServicesRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('consulting_service.delete', (req) => `consulting_service:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteConsultingService((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// TrainingProgram — public reads
// =================================================================

trainingProgramsRouter.get('/', validateQuery(trainingProgramListQuerySchema), async (req, res) => {
  const items = await service.listTrainingPrograms(req.query as never);
  res.json(ok(items, { count: items.length }));
});

trainingProgramsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getTrainingProgram((req.params as { id: string }).id);
  res.json(ok(item));
});

trainingProgramsRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(trainingProgramCreateSchema),
  audit('training_program.create', (req) => `training_program:${(req.body as { title: string }).title}`),
  async (req, res) => {
    const created = await service.createTrainingProgram(req.body);
    res.status(201).json(ok(created));
  },
);

trainingProgramsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(trainingProgramUpdateSchema),
  audit('training_program.update', (req) => `training_program:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateTrainingProgram((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

trainingProgramsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('training_program.delete', (req) => `training_program:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteTrainingProgram((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// MarketingChannel — internal (requireAuth) reads
// =================================================================

marketingChannelsRouter.use(requireAuth);

marketingChannelsRouter.get('/', validateQuery(marketingChannelListQuerySchema), async (req, res) => {
  const items = await service.listMarketingChannels(req.query as never);
  res.json(ok(items, { count: items.length }));
});

marketingChannelsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getMarketingChannel((req.params as { id: string }).id);
  res.json(ok(item));
});

marketingChannelsRouter.post(
  '/',
  requirePermission('content.write'),
  validateBody(marketingChannelCreateSchema),
  audit('marketing_channel.create', (req) => `marketing_channel:${(req.body as { name: string }).name}`),
  async (req, res) => {
    const created = await service.createMarketingChannel(req.body);
    res.status(201).json(ok(created));
  },
);

marketingChannelsRouter.patch(
  '/:id',
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(marketingChannelUpdateSchema),
  audit('marketing_channel.update', (req) => `marketing_channel:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateMarketingChannel((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

marketingChannelsRouter.delete(
  '/:id',
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('marketing_channel.delete', (req) => `marketing_channel:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteMarketingChannel((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// Partnership — internal (requireAuth) reads
// =================================================================

partnershipsRouter.use(requireAuth);

partnershipsRouter.get('/', validateQuery(partnershipListQuerySchema), async (req, res) => {
  const items = await service.listPartnerships(req.query as never);
  res.json(ok(items, { count: items.length }));
});

partnershipsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getPartnership((req.params as { id: string }).id);
  res.json(ok(item));
});

partnershipsRouter.post(
  '/',
  requirePermission('content.write'),
  validateBody(partnershipCreateSchema),
  audit('partnership.create', (req) => `partnership:${(req.body as { name: string }).name}`),
  async (req, res) => {
    const created = await service.createPartnership(req.body);
    res.status(201).json(ok(created));
  },
);

partnershipsRouter.patch(
  '/:id',
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(partnershipUpdateSchema),
  audit('partnership.update', (req) => `partnership:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updatePartnership((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

partnershipsRouter.delete(
  '/:id',
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('partnership.delete', (req) => `partnership:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deletePartnership((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// =================================================================
// CompetitorInsight — internal (requireAuth) reads
// =================================================================

competitorInsightsRouter.use(requireAuth);

competitorInsightsRouter.get('/', validateQuery(competitorInsightListQuerySchema), async (req, res) => {
  const items = await service.listCompetitorInsights(req.query as never);
  res.json(ok(items, { count: items.length }));
});

competitorInsightsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getCompetitorInsight((req.params as { id: string }).id);
  res.json(ok(item));
});

competitorInsightsRouter.post(
  '/',
  requirePermission('content.write'),
  validateBody(competitorInsightCreateSchema),
  audit('competitor_insight.create', (req) => `competitor:${(req.body as { competitorId: string }).competitorId}`),
  async (req, res) => {
    const created = await service.createCompetitorInsight(req.body);
    res.status(201).json(ok(created));
  },
);

competitorInsightsRouter.patch(
  '/:id',
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(competitorInsightUpdateSchema),
  audit('competitor_insight.update', (req) => `competitor_insight:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateCompetitorInsight((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

competitorInsightsRouter.delete(
  '/:id',
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('competitor_insight.delete', (req) => `competitor_insight:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteCompetitorInsight((req.params as { id: string }).id);
    res.status(204).send();
  },
);
