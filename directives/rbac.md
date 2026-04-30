# Directive: Role-Based Access Control (RBAC)

**Build Guide reference**: §4 #8 + §8
**Module**: `services/api/src/middleware/{requireRole,requirePermission}.ts`, `services/api/src/domains/rbac/`

## Goal

Enforce granular, hierarchical permissions. JWT carries the **effective permission set** (own + parent role permissions, walked recursively).

## Inputs

- JWT `roles[]` and `permissions[]` claims (set at login or refresh)
- Per-route guard: `requireRole(...)` or `requirePermission(...)`

## Outputs

- 401 on missing/invalid token
- 403 on missing role/permission
- Pass-through on success

## Effective permission resolution

Computed at login by `RoleManagementService.getEffectivePermissions(userId)`:

1. Find all `RoleAssignment` rows for user
2. For each, walk parent chain (cycle-safe, max depth 16)
3. Union all `RolePermission` keys

The set is baked into the JWT claim. New permissions take effect on next token issuance (login or refresh).

## API surface

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/access` | permission.write | Atomic "change a user's access": add/remove role assignments + replace role permissions in one transactional call |

## Edge cases

- Token expired → 401 `TOKEN_EXPIRED`
- Cycle in parent graph → broken at depth 16 (safety net), logged as warning
- Inactive user → mandate token re-issuance (out of scope this phase; revocation list = Phase 4 candidate)

## Verification

- Unit: `requireRole` / `requirePermission` allow/deny matrix
- Unit: effective-permission walker handles parent chains and cycles
- Integration: login → call protected route with insufficient permission → 403
