import { z } from 'zod';

export const listAuditQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().optional(),
});

export const appendAuditSchema = z.object({
  action: z.string().min(1).max(120),
  resource: z.string().min(1).max(200),
  metadata: z.record(z.unknown()).default({}),
});

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
export type AppendAuditInput = z.infer<typeof appendAuditSchema>;
