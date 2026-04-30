import { Router } from 'express';
import { z } from 'zod';
import { getPrisma } from '../../db/prisma.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { audit } from '../../middleware/auditLog.js';
import { ok } from '../../lib/envelope.js';
import { NotFoundError } from '../../lib/errors.js';

/**
 * RBAC composite endpoint. Spec: /directives/rbac.md.
 *
 * `POST /api/access` — atomic "change a user's access" — assignments + per-role
 * permission sets in one transactional call.
 */
export const rbacRouter = Router();

const accessChangeSchema = z.object({
  userId: z.string().min(1),
  add: z.array(z.string().min(1)).optional(),
  remove: z.array(z.string().min(1)).optional(),
  setRolePermissions: z
    .array(
      z.object({
        roleId: z.string().min(1),
        permissionKeys: z.array(z.string().min(1)),
      }),
    )
    .optional(),
});

rbacRouter.post(
  '/',
  requireAuth,
  requirePermission('permission.write'),
  validateBody(accessChangeSchema),
  audit('access.change', (req) => `user:${(req.body as { userId: string }).userId}`),
  async (req, res) => {
    const db = getPrisma();
    const body = req.body as z.infer<typeof accessChangeSchema>;

    const user = await db.user.findUnique({ where: { id: body.userId } });
    if (!user) throw new NotFoundError(`User ${body.userId} not found`);

    await db.$transaction(async (tx) => {
      // Add role assignments
      for (const roleId of body.add ?? []) {
        await tx.roleAssignment.upsert({
          where: { userId_roleId: { userId: body.userId, roleId } },
          create: { userId: body.userId, roleId },
          update: {},
        });
      }
      // Remove role assignments
      for (const roleId of body.remove ?? []) {
        await tx.roleAssignment
          .delete({
            where: { userId_roleId: { userId: body.userId, roleId } },
          })
          .catch(() => undefined); // idempotent
      }
      // Replace permission sets per role
      for (const set of body.setRolePermissions ?? []) {
        const perms = await tx.permission.findMany({
          where: { key: { in: set.permissionKeys } },
        });
        await tx.rolePermission.deleteMany({ where: { roleId: set.roleId } });
        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: set.roleId, permissionId: p.id })),
          });
        }
      }
    });

    res.json(ok({ userId: body.userId, applied: true }));
  },
);
