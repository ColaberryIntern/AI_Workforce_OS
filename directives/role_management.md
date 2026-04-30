# Directive: Role Management

**Build Guide reference**: §4 #1
**Module**: `services/api/src/domains/role-management/`

## Goal

Admins create, update, and delete roles; assign roles to users; manage each role's permission set. Roles support a parent/child hierarchy.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET    | `/api/roles` | role.read | List roles |
| POST   | `/api/roles` | role.write | Create |
| GET    | `/api/roles/:id` | role.read | Get one (with permissions + children) |
| PATCH  | `/api/roles/:id` | role.write | Update |
| DELETE | `/api/roles/:id` | role.write | Delete (system roles refused with 409) |
| POST   | `/api/roles/assignments` | role.assign | Assign role to user |
| DELETE | `/api/roles/assignments/:userId/:roleId` | role.assign | Unassign |
| PUT    | `/api/roles/:id/permissions` | permission.write | Replace full permission set |

## Edge cases

- Duplicate role name → 409
- Self-parent → 409
- Non-existent user/role on assignment → 404
- Delete `isSystem` role → 409
- Reassign existing → idempotent upsert

## Safety constraints

- All endpoints require auth + appropriate permission
- Every mutation produces an audit log entry

## Verification

- Unit: service edge cases with mocked Prisma
- Integration: full CRUD + assignment with mocked Prisma + auth + 401/403/409
