import { z } from 'zod';

export const analyticsEventSchema = z.object({
  userId: z.string().nullable().optional(),
  eventName: z.string().min(1).max(120),
  payload: z.record(z.unknown()).default({}),
  sessionId: z.string().max(120).optional(),
  occurredAt: z.string().datetime().optional(),
});

export const ingestSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(500),
});

export const querySchema = z.object({
  eventName: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
export type IngestInput = z.infer<typeof ingestSchema>;
export type QueryInput = z.infer<typeof querySchema>;
