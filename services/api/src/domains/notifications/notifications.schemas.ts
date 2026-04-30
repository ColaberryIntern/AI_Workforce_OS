import { z } from 'zod';

export const channelEnum = z.enum(['email', 'in_app', 'sms']);

export const sendNotificationSchema = z.object({
  userId: z.string().min(1),
  channel: channelEnum,
  eventType: z.string().min(1).max(120),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(8000),
});

export const listNotificationsQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['pending', 'sent', 'failed', 'skipped']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const updatePreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      channel: channelEnum,
      eventType: z.string().nullable().optional(),
      enabled: z.boolean(),
    }),
  ),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
