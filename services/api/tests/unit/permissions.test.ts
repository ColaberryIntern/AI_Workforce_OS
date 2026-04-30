import { describe, it, expect, jest } from '@jest/globals';
import { getEffectivePermissions } from '../../src/lib/permissions.js';
import type { PrismaClient } from '@prisma/client';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

function mockDb(opts: {
  assignments: Array<{ roleId: string; role: { name: string } }>;
  parents: Record<string, string | null>; // roleId -> parentId
  rolePerms: Array<{ roleId: string; permission: { key: string } }>;
}): PrismaClient {
  return {
    roleAssignment: {
      findMany: jest.fn<AnyAsync>().mockResolvedValue(opts.assignments),
    },
    role: {
      findMany: jest.fn<AnyAsync>().mockImplementation((async (args: { where: { id: { in: string[] } } }) => {
        return args.where.id.in.map((id) => ({ parentId: opts.parents[id] ?? null }));
      }) as AnyAsync),
    },
    rolePermission: {
      findMany: jest.fn<AnyAsync>().mockImplementation((async (args: { where: { roleId: { in: string[] } } }) => {
        return opts.rolePerms.filter((rp) => args.where.roleId.in.includes(rp.roleId));
      }) as AnyAsync),
    },
  } as unknown as PrismaClient;
}

describe('getEffectivePermissions', () => {
  it('returns no permissions for a user with no role assignments', async () => {
    const db = mockDb({ assignments: [], parents: {}, rolePerms: [] });
    const result = await getEffectivePermissions(db, 'user-1');
    expect(result.roles).toEqual([]);
    expect(result.permissions).toEqual([]);
  });

  it('returns own role permissions', async () => {
    const db = mockDb({
      assignments: [{ roleId: 'r1', role: { name: 'editor' } }],
      parents: { r1: null },
      rolePerms: [{ roleId: 'r1', permission: { key: 'role.read' } }],
    });
    const result = await getEffectivePermissions(db, 'u');
    expect(result.roles).toEqual(['editor']);
    expect(result.permissions.sort()).toEqual(['role.read']);
  });

  it('inherits parent role permissions', async () => {
    const db = mockDb({
      assignments: [{ roleId: 'child', role: { name: 'manager' } }],
      parents: { child: 'parent', parent: 'grandparent', grandparent: null },
      rolePerms: [
        { roleId: 'child', permission: { key: 'p.child' } },
        { roleId: 'parent', permission: { key: 'p.parent' } },
        { roleId: 'grandparent', permission: { key: 'p.gp' } },
      ],
    });
    const result = await getEffectivePermissions(db, 'u');
    expect(result.roles).toEqual(['manager']);
    expect(result.permissions.sort()).toEqual(['p.child', 'p.gp', 'p.parent']);
  });

  it('breaks parent cycles safely (depth cap)', async () => {
    const db = mockDb({
      assignments: [{ roleId: 'a', role: { name: 'role-a' } }],
      parents: { a: 'b', b: 'a' }, // cycle a -> b -> a
      rolePerms: [
        { roleId: 'a', permission: { key: 'p.a' } },
        { roleId: 'b', permission: { key: 'p.b' } },
      ],
    });
    const result = await getEffectivePermissions(db, 'u');
    expect(result.permissions.sort()).toEqual(['p.a', 'p.b']);
  });
});
