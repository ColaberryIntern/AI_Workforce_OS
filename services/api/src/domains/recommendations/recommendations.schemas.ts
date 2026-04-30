import { z } from 'zod';

export const generateSchema = z.object({
  userId: z.string().min(1),
  staffingEventId: z.string().optional(),
  context: z
    .object({
      role: z.string().optional(),
      location: z.string().optional(),
      skills: z.array(z.string()).optional(),
    })
    .default({}),
  k: z.number().int().min(1).max(50).default(5),
});

export const listSchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const rejectSchema = z.object({
  feedback: z.string().max(2000).optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
export type ListInput = z.infer<typeof listSchema>;
