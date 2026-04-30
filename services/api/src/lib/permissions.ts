import type { PrismaClient } from '@prisma/client';

/**
 * Effective permission resolver. For a given user, walks every assigned role
 * up its parent chain (cycle-safe, max depth 16) and returns the union of
 * `Permission.key` values granted by any role in that closure.
 *
 * Spec: /directives/rbac.md.
 */
const MAX_DEPTH = 16;

export async function getEffectivePermissions(
  db: PrismaClient,
  userId: string,
): Promise<{ roles: string[]; permissions: string[] }> {
  // 1. Direct role assignments
  const assignments = await db.roleAssignment.findMany({
    where: { userId },
    include: { role: true },
  });
  const directRoleIds = assignments.map((a) => a.roleId);
  const directRoleNames = assignments.map((a) => a.role.name);

  // 2. Resolve full role-id closure (parents up the chain)
  const closure = new Set<string>(directRoleIds);
  const queue = [...directRoleIds];
  let depth = 0;
  while (queue.length > 0 && depth < MAX_DEPTH) {
    const ids = queue.splice(0);
    const parents = await db.role.findMany({
      where: { id: { in: ids } },
      select: { parentId: true },
    });
    for (const { parentId } of parents) {
      if (parentId && !closure.has(parentId)) {
        closure.add(parentId);
        queue.push(parentId);
      }
    }
    depth++;
  }

  // 3. Permission keys for any role in the closure
  if (closure.size === 0) return { roles: directRoleNames, permissions: [] };
  const rolePerms = await db.rolePermission.findMany({
    where: { roleId: { in: [...closure] } },
    include: { permission: true },
  });
  const keys = new Set<string>();
  for (const rp of rolePerms) keys.add(rp.permission.key);

  return { roles: directRoleNames, permissions: [...keys] };
}
