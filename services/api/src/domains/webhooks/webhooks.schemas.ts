import { z } from 'zod';

export const webhookCreateSchema = z.object({
  url: z.string().url().max(2000),
  events: z.array(z.string().min(1)).min(1).max(100),
  isActive: z.boolean().default(true),
});

export const webhookUpdateSchema = z.object({
  url: z.string().url().max(2000).optional(),
  events: z.array(z.string().min(1)).min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const triggerTestSchema = z.object({
  eventType: z.string().min(1).max(120).default('test.ping'),
  payload: z.record(z.unknown()).default({}),
});

export type WebhookCreate = z.infer<typeof webhookCreateSchema>;
export type WebhookUpdate = z.infer<typeof webhookUpdateSchema>;
