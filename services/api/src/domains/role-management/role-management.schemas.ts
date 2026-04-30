import { z } from 'zod';

export const roleCreateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});

export const roleUpdateSchema = roleCreateSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });

export const userIdRoleIdParamSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export const setPermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).min(0),
});

export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
