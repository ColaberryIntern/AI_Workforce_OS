# Directive: Milestones

**Build Guide reference**: §10 §Milestone Definitions
**Module**: `services/api/src/domains/milestones/`, `frontend/src/pages/MilestonesPage.tsx`

## Goal

Track and manage project delivery milestones across the four Build-Guide-§10 phases. Each milestone has a phase, code (e.g. `1.2`), title, criteria, deliverables, due date, and status. Status transitions follow a small state machine and update `completedAt` automatically when a milestone moves into `done`.

## Resource: `Milestone`

| Field | Notes |
|---|---|
| `phase` | int — 1..4 (Phase 1 / 2 / 3 / 4 from Build Guide §10) |
| `code` | unique — '1.1', '2.3', etc. Stable identifier across renames. |
| `title` | required |
| `description`, `criteria`, `deliverables` | optional rich text |
| `dueDate` | optional ISO datetime |
| `status` | `planned` \| `in_progress` \| `done` \| `at_risk` \| `skipped` |
| `completedAt` | auto-set when status becomes `done`; cleared otherwise |
| `orderIndex` | within a phase, lower comes first |

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET    | `/api/milestones` | milestone.read | list (filter `?phase=1&status=in_progress`) |
| GET    | `/api/milestones/summary` | milestone.read | totals + per-phase counts (drives dashboard) |
| GET    | `/api/milestones/:id` | milestone.read | get one |
| POST   | `/api/milestones` | milestone.write | create (409 on duplicate `code`) |
| PATCH  | `/api/milestones/:id` | milestone.write | update any field |
| POST   | `/api/milestones/:id/transition` | milestone.write | status-only update — `{status: 'done'}` |
| DELETE | `/api/milestones/:id` | milestone.write | delete |

## Permissions

Two new keys: `milestone.read`, `milestone.write`. Granted to:
- `admin` — both (admin gets every key)
- `manager` — both
- `viewer` — `milestone.read` only

## Edge cases

- Duplicate `code` on create → 409 Conflict
- Invalid phase or unknown status → 400 (Zod validation)
- Transition into `done` always overwrites `completedAt = now()`; transition out clears it
- `at_risk` is a writable status, AND derived in the summary when `dueDate < now && status not in (done, skipped)`

## Safety constraints

- All endpoints require authentication
- Mutations require `milestone.write` and produce an audit log entry
- No PII — schedule data only; safe to surface to all logged-in users with read access

## Frontend

`MilestonesPage` (`/milestones`) — gated by `milestone.read`. Layout:
1. KPI strip — Total / In-progress / Done / At risk + done %
2. Filter bar — phase + status
3. Cards grouped by phase, each showing code, title, due date, status badge, criteria, deliverables, action buttons (Start / Complete / Skip / Edit / Delete) gated by `milestone.write`
4. Inline create form behind a "New milestone" toggle, gated by `milestone.write`

Sidebar item lives under "Insights" (project-tracking flavor), permission-gated.

## Verification

- Unit tests: list filters; NotFound on missing id; Conflict on duplicate code; status→done sets completedAt; summary aggregation; dueDate string→Date coercion
- Smoke: `/api/milestones` returns 401 without auth; catalog at `/api/data` advertises the surface
- Frontend: smoke renders empty-state without crashing
