import type { PrismaClient } from '@prisma/client';
import type {
  RoleCreate,
  RoleUpdate,
  AssignRoleInput,
} from './role-management.schemas.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../lib/errors.js';

/**
 * Role-management service. Spec: /directives/role_management.md.
 *
 * - Hierarchical roles (parent/child)
 * - Hard-block deleting system roles
 * - Idempotent role assignments
 * - Transactional permission set replacement
 */
export class RoleManagementService {
  constructor(private readonly db: PrismaClient) {}

  listRoles() {
    return this.db.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        children: { select: { id: true, name: true } },
      },
    });
  }

  async getRole(id: string) {
    const role = await this.db.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        children: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });
    if (!role) throw new NotFoundError(`Role ${id} not found`);
    return role;
  }

  async createRole(input: RoleCreate) {
    const existing = await this.db.role.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`Role '${input.name}' already exists`);
    if (input.parentId) {
      const parent = await this.db.role.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new NotFoundError(`Parent role ${input.parentId} not found`);
    }
    return this.db.role.create({ data: input });
  }

  async updateRole(id: string, input: RoleUpdate) {
    await this.getRole(id);
    if (input.parentId) {
      if (input.parentId === id) throw new ConflictError('Role cannot be its own parent');
      const parent = await this.db.role.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new NotFoundError(`Parent role ${input.parentId} not found`);
      // cycle check
      let cursor: string | null = parent.parentId;
      let depth = 0;
      while (cursor && depth < 16) {
        if (cursor === id) throw new ConflictError('Cycle detected in role hierarchy');
        const next = await this.db.role.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        cursor = next?.parentId ?? null;
        depth++;
      }
    }
    return this.db.role.update({ where: { id }, data: input });
  }

  async deleteRole(id: string) {
    const role = await this.getRole(id);
    if (role.isSystem) throw new ConflictError('System roles cannot be deleted');
    return this.db.role.delete({ where: { id } });
  }

  async assignRoleToUser(input: AssignRoleInput) {
    const [user, role] = await Promise.all([
      this.db.user.findUnique({ where: { id: input.userId } }),
      this.db.role.findUnique({ where: { id: input.roleId } }),
    ]);
    if (!user) throw new NotFoundError(`User ${input.userId} not found`);
    if (!role) throw new NotFoundError(`Role ${input.roleId} not found`);

    return this.db.roleAssignment.upsert({
      where: { userId_roleId: { userId: input.userId, roleId: input.roleId } },
      create: input,
      update: {},
    });
  }

  async unassignRoleFromUser(userId: string, roleId: string) {
    const existing = await this.db.roleAssignment.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (!existing) throw new NotFoundError('Role assignment not found');
    await this.db.roleAssignment.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async setRolePermissions(roleId: string, permissionKeys: string[]) {
    await this.getRole(roleId);
    if (permissionKeys.length > 0) {
      const permissions = await this.db.permission.findMany({
        where: { key: { in: permissionKeys } },
      });
      const found = new Set(permissions.map((p) => p.key));
      const missing = permissionKeys.filter((k) => !found.has(k));
      if (missing.length > 0) {
        throw new BadRequestError(`Unknown permission keys: ${missing.join(', ')}`);
      }
      await this.db.$transaction([
        this.db.rolePermission.deleteMany({ where: { roleId } }),
        this.db.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        }),
      ]);
    } else {
      await this.db.rolePermission.deleteMany({ where: { roleId } });
    }
  }
}
