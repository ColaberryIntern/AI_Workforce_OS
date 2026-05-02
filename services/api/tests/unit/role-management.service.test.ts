import { describe, it, expect } from '@jest/globals';
import { assertProtectedAdminPermsIntact } from '../../src/domains/role-management/role-management.service.js';
import { ForbiddenError } from '../../src/lib/errors.js';

/**
 * Build Guide §4 #8 §Edge Cases — "Attempting to remove permissions from an
 * admin role should return a specific error message."
 */
describe('assertProtectedAdminPermsIntact', () => {
  const ALL_CORE = ['permission.write', 'role.write', 'role.assign'];

  it('admin role: throws when permission.write is missing', () => {
    expect(() =>
      assertProtectedAdminPermsIntact({ name: 'admin', isSystem: true }, ['role.write']),
    ).toThrow(ForbiddenError);
  });

  it('admin role: error message names the missing keys', () => {
    try {
      assertProtectedAdminPermsIntact({ name: 'admin', isSystem: true }, []);
      throw new Error('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as Error).message).toContain('permission.write');
      expect((err as Error).message).toContain('role.write');
      expect((err as Error).message).toContain('role.assign');
      expect((err as Error).message).toContain('admin');
    }
  });

  it('admin role: passes when all core perms remain (additional perms allowed)', () => {
    expect(() =>
      assertProtectedAdminPermsIntact({ name: 'admin', isSystem: true }, [
        ...ALL_CORE,
        'audit.read',
      ]),
    ).not.toThrow();
  });

  it('non-system manager role: passes regardless of perms (only admin/system roles are guarded)', () => {
    expect(() =>
      assertProtectedAdminPermsIntact({ name: 'manager', isSystem: false }, []),
    ).not.toThrow();
  });

  it('arbitrary system role missing core perms: still guarded', () => {
    expect(() =>
      assertProtectedAdminPermsIntact({ name: 'super-ops', isSystem: true }, ['audit.read']),
    ).toThrow(ForbiddenError);
  });

  it('admin role: missing role.assign alone still triggers guard', () => {
    expect(() =>
      assertProtectedAdminPermsIntact({ name: 'admin', isSystem: true }, [
        'permission.write',
        'role.write',
      ]),
    ).toThrow(ForbiddenError);
  });
});
