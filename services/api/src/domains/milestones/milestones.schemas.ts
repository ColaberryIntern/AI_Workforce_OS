import { z } from 'zod';

/**
 * Zod schemas for the Milestones domain.
 * Spec: /directives/milestones.md.
 *
 * Models the project milestones from Build Guide §10 §Milestone Definitions.
 * Each milestone has a phase (1..4) and a unique code like '1.2'.
 */

const statusEnum = z.enum(['planned', 'in_progress', 'done', 'at_risk', 'skipped']);

export const milestoneCreateSchema = z.object({
  phase: z.number().int().min(1).max(20),
  code: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9.-]+$/, 'code must be alphanumeric / dot / dash'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  criteria: z.string().max(2000).nullable().optional(),
  deliverables: z.string().max(2000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: statusEnum.default('planned'),
  orderIndex: z.number().int().min(0).default(0),
});

export const milestoneUpdateSchema = milestoneCreateSchema.partial();

export const milestoneListQuerySchema = z.object({
  phase: z.coerce.number().int().min(1).max(20).optional(),
  status: statusEnum.optional(),
});

export const milestoneTransitionSchema = z.object({
  status: statusEnum,
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export type MilestoneStatus = z.infer<typeof statusEnum>;
export type MilestoneCreate = z.infer<typeof milestoneCreateSchema>;
export type MilestoneUpdate = z.infer<typeof milestoneUpdateSchema>;
export type MilestoneListQuery = z.infer<typeof milestoneListQuerySchema>;
export type MilestoneTransition = z.infer<typeof milestoneTransitionSchema>;
