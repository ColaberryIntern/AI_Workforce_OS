import { Router } from 'express';
import { RoleManagementService } from './role-management.service.js';
import {
  roleCreateSchema,
  roleUpdateSchema,
  idParamSchema,
  userIdRoleIdParamSchema,
  assignRoleSchema,
  setPermissionsSchema,
} from './role-management.schemas.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/** Role Management API. Spec: /directives/role_management.md. */
export const rolesRouter = Router();

const service = new RoleManagementService(getPrisma());

rolesRouter.use(requireAuth);

rolesRouter.get('/', requirePermission('role.read'), async (_req, res) => {
  const roles = await service.listRoles();
  res.json(ok(roles, { count: roles.length }));
});

rolesRouter.get(
  '/:id',
  requirePermission('role.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const role = await service.getRole((req.params as { id: string }).id);
    res.json(ok(role));
  },
);

rolesRouter.post(
  '/',
  requirePermission('role.write'),
  validateBody(roleCreateSchema),
  audit('role.create', (req) => `role:${(req.body as { name: string }).name}`),
  async (req, res) => {
    const created = await service.createRole(req.body);
    res.status(201).json(ok(created));
  },
);

rolesRouter.patch(
  '/:id',
  requirePermission('role.write'),
  validateParams(idParamSchema),
  validateBody(roleUpdateSchema),
  audit('role.update', (req) => `role:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateRole((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

rolesRouter.delete(
  '/:id',
  requirePermission('role.write'),
  validateParams(idParamSchema),
  audit('role.delete', (req) => `role:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteRole((req.params as { id: string }).id);
    res.status(204).send();
  },
);

rolesRouter.post(
  '/assignments',
  requirePermission('role.assign'),
  validateBody(assignRoleSchema),
  audit('role.assign', (req) => `user:${(req.body as { userId: string }).userId}`),
  async (req, res) => {
    const assignment = await service.assignRoleToUser(req.body);
    res.status(201).json(ok(assignment));
  },
);

rolesRouter.delete(
  '/assignments/:userId/:roleId',
  requirePermission('role.assign'),
  validateParams(userIdRoleIdParamSchema),
  audit('role.unassign', (req) => `user:${(req.params as { userId: string }).userId}`),
  async (req, res) => {
    const { userId, roleId } = req.params as { userId: string; roleId: string };
    await service.unassignRoleFromUser(userId, roleId);
    res.status(204).send();
  },
);

rolesRouter.put(
  '/:id/permissions',
  requirePermission('permission.write'),
  validateParams(idParamSchema),
  validateBody(setPermissionsSchema),
  audit('role.permissions.set', (req) => `role:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const id = (req.params as { id: string }).id;
    const { permissionKeys } = req.body as { permissionKeys: string[] };
    await service.setRolePermissions(id, permissionKeys);
    res.status(204).send();
  },
);
