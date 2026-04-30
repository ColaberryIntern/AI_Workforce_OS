import { z } from 'zod';

const audienceEnum = z.enum(['hr_manager', 'operations', 'it_admin', 'executive', 'general']);
const matrixValueEnum = z.enum(['YES', 'NO', 'LIMITED', 'HIGH', 'MEDIUM', 'LOW']);

export const valuePropCreateSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  audience: audienceEnum,
  orderIndex: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const valuePropUpdateSchema = valuePropCreateSchema.partial();

export const valuePropListQuerySchema = z.object({
  audience: audienceEnum.optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const matrixCellUpsertSchema = z.object({
  value: matrixValueEnum,
  note: z.string().max(500).nullable().optional(),
});

export const matrixCellParamSchema = z.object({
  capabilityId: z.string().min(1),
  competitorId: z.string().min(1),
});

export const competitiveGapCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  ourAnswer: z.string().min(1).max(4000),
  orderIndex: z.number().int().min(0).default(0),
});

export const competitiveGapUpdateSchema = competitiveGapCreateSchema.partial();

export type ValuePropCreate = z.infer<typeof valuePropCreateSchema>;
export type ValuePropUpdate = z.infer<typeof valuePropUpdateSchema>;
export type ValuePropListQuery = z.infer<typeof valuePropListQuerySchema>;
export type CompetitiveGapCreate = z.infer<typeof competitiveGapCreateSchema>;
export type CompetitiveGapUpdate = z.infer<typeof competitiveGapUpdateSchema>;
export type MatrixCellUpsert = z.infer<typeof matrixCellUpsertSchema>;
