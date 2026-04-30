import { z } from 'zod';

/**
 * Zod schemas for the Subscription / commercial domain.
 * Spec: /directives/subscription_tiers.md.
 *
 * Resources:
 *   - SubscriptionTier (Build Guide §1 §Subscription Tiers)
 *   - AddOn            (§1 §Revenue Streams)
 *   - MarketingChannel (§10 §Marketing Channels)
 *   - Partnership      (§10 §Marketing Channels)
 *   - Event            (§10 §Marketing Channels — webinars + demos)
 *   - ConsultingService (§1 §Revenue Streams)
 *   - TrainingProgram   (§1 §Revenue Streams)
 *   - CompetitorInsight (§1 §Competitive Landscape — Strengths of Competitors)
 */

export const idParamSchema = z.object({ id: z.string().min(1) });

// --- SubscriptionTier ---

export const subscriptionTierCreateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, 'key must be lowercase alphanumeric / dash / underscore'),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  monthlyPriceCents: z.number().int().min(0).max(10_000_000),
  yearlyPriceCents: z.number().int().min(0).max(120_000_000).nullable().optional(),
  features: z.array(z.string().min(1).max(200)).default([]),
  orderIndex: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export const subscriptionTierUpdateSchema = subscriptionTierCreateSchema.partial();
export const subscriptionTierListQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

// --- AddOn ---

export const addOnCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  monthlyPriceCents: z.number().int().min(0).max(10_000_000),
  applicableTierKeys: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().default(true),
  orderIndex: z.number().int().min(0).default(0),
});
export const addOnUpdateSchema = addOnCreateSchema.partial();
export const addOnListQuerySchema = z.object({
  tier: z.string().optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

// --- MarketingChannel ---

const channelTypeEnum = z.enum(['seo', 'content', 'social', 'paid', 'email', 'event']);
const channelStatusEnum = z.enum(['active', 'paused', 'archived']);

export const marketingChannelCreateSchema = z.object({
  name: z.string().min(1).max(120),
  channelType: channelTypeEnum,
  targetAudience: z.string().min(1).max(120),
  status: channelStatusEnum.default('active'),
  notes: z.string().max(4000).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
});
export const marketingChannelUpdateSchema = marketingChannelCreateSchema.partial();
export const marketingChannelListQuerySchema = z.object({
  channelType: channelTypeEnum.optional(),
  status: channelStatusEnum.optional(),
});

// --- Partnership ---

const partnerTypeEnum = z.enum(['consulting_firm', 'industry_association', 'reseller', 'tech_partner']);
const partnershipStatusEnum = z.enum(['prospect', 'active', 'paused', 'ended']);

export const partnershipCreateSchema = z.object({
  name: z.string().min(1).max(160),
  partnerType: partnerTypeEnum,
  status: partnershipStatusEnum.default('prospect'),
  contactName: z.string().max(120).nullable().optional(),
  contactEmail: z.string().email().max(254).nullable().optional(),
  agreementNotes: z.string().max(4000).nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
});
export const partnershipUpdateSchema = partnershipCreateSchema.partial();
export const partnershipListQuerySchema = z.object({
  partnerType: partnerTypeEnum.optional(),
  status: partnershipStatusEnum.optional(),
});

// --- Event (webinars + demos) ---

const eventTypeEnum = z.enum(['webinar', 'demo', 'workshop', 'conference']);
const eventStatusEnum = z.enum(['scheduled', 'live', 'completed', 'cancelled']);

export const eventCreateSchema = z.object({
  title: z.string().min(1).max(200),
  eventType: eventTypeEnum,
  description: z.string().max(4000).nullable().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(24 * 60).default(60),
  registrationUrl: z.string().url().max(2000).nullable().optional(),
  recordingUrl: z.string().url().max(2000).nullable().optional(),
  status: eventStatusEnum.default('scheduled'),
  attendeeCount: z.number().int().min(0).default(0),
});
export const eventUpdateSchema = eventCreateSchema.partial();
export const eventListQuerySchema = z.object({
  eventType: eventTypeEnum.optional(),
  status: eventStatusEnum.optional(),
  upcoming: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

// --- ConsultingService ---

const pricingModelEnum = z.enum(['hourly', 'project', 'retainer']);

export const consultingServiceCreateSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(4000),
  pricingModel: pricingModelEnum,
  audience: z.string().max(120).nullable().optional(),
  isActive: z.boolean().default(true),
  orderIndex: z.number().int().min(0).default(0),
});
export const consultingServiceUpdateSchema = consultingServiceCreateSchema.partial();

// --- TrainingProgram ---

const programFormatEnum = z.enum(['live', 'self_paced', 'blended']);
const programLevelEnum = z.enum(['intro', 'intermediate', 'advanced']);

export const trainingProgramCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  format: programFormatEnum,
  durationHours: z.number().int().min(1).max(500),
  level: programLevelEnum,
  audience: z.string().max(120).nullable().optional(),
  isActive: z.boolean().default(true),
  orderIndex: z.number().int().min(0).default(0),
});
export const trainingProgramUpdateSchema = trainingProgramCreateSchema.partial();
export const trainingProgramListQuerySchema = z.object({
  format: programFormatEnum.optional(),
  level: programLevelEnum.optional(),
});

// --- CompetitorInsight ---

const insightKindEnum = z.enum(['strength', 'weakness', 'opportunity', 'threat']);

export const competitorInsightCreateSchema = z.object({
  competitorId: z.string().min(1),
  kind: insightKindEnum,
  summary: z.string().min(1).max(400),
  detail: z.string().max(4000).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
});
export const competitorInsightUpdateSchema = competitorInsightCreateSchema.partial();
export const competitorInsightListQuerySchema = z.object({
  competitorId: z.string().optional(),
  kind: insightKindEnum.optional(),
});

// --- Inferred types ---

export type SubscriptionTierCreate = z.infer<typeof subscriptionTierCreateSchema>;
export type SubscriptionTierUpdate = z.infer<typeof subscriptionTierUpdateSchema>;
export type SubscriptionTierListQuery = z.infer<typeof subscriptionTierListQuerySchema>;
export type AddOnCreate = z.infer<typeof addOnCreateSchema>;
export type AddOnUpdate = z.infer<typeof addOnUpdateSchema>;
export type AddOnListQuery = z.infer<typeof addOnListQuerySchema>;
export type MarketingChannelCreate = z.infer<typeof marketingChannelCreateSchema>;
export type MarketingChannelUpdate = z.infer<typeof marketingChannelUpdateSchema>;
export type MarketingChannelListQuery = z.infer<typeof marketingChannelListQuerySchema>;
export type PartnershipCreate = z.infer<typeof partnershipCreateSchema>;
export type PartnershipUpdate = z.infer<typeof partnershipUpdateSchema>;
export type PartnershipListQuery = z.infer<typeof partnershipListQuerySchema>;
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
export type ConsultingServiceCreate = z.infer<typeof consultingServiceCreateSchema>;
export type ConsultingServiceUpdate = z.infer<typeof consultingServiceUpdateSchema>;
export type TrainingProgramCreate = z.infer<typeof trainingProgramCreateSchema>;
export type TrainingProgramUpdate = z.infer<typeof trainingProgramUpdateSchema>;
export type TrainingProgramListQuery = z.infer<typeof trainingProgramListQuerySchema>;
export type CompetitorInsightCreate = z.infer<typeof competitorInsightCreateSchema>;
export type CompetitorInsightUpdate = z.infer<typeof competitorInsightUpdateSchema>;
export type CompetitorInsightListQuery = z.infer<typeof competitorInsightListQuerySchema>;
