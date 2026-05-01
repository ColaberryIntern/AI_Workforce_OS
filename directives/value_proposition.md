# Directive: Value Proposition

**Build Guide reference**: §1 Vision; §2.4.3 Unique Value Proposition; §2.5.1 Value Differentiation Matrix
**Module**: `services/api/src/domains/value-proposition/`

## Goal

Read-mostly content service for value-prop / differentiation matrix / competitive gaps. Pure CRUD over Postgres. No LLM in request path.

## Resources

| Resource | Purpose |
|---|---|
| `ValueProposition` | Per-audience benefit statement |
| `Capability` × `Competitor` × `MatrixCell` | Differentiation matrix |
| `CompetitiveGap` | Industry-wide weakness — gap our solution closes |
| `CompetitorStrength` | Industry-wide strength competitors share — and how we counter it (Build Guide §1 §Competitive Landscape) |

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET    | `/api/value-propositions` | public | list, filter by audience + active |
| GET    | `/api/value-propositions/:id` | public | get one |
| POST   | `/api/value-propositions` | content.write | create |
| PATCH  | `/api/value-propositions/:id` | content.write | update |
| DELETE | `/api/value-propositions/:id` | content.write | delete |
| GET    | `/api/differentiation-matrix` | public | full matrix |
| PUT    | `/api/differentiation-matrix/cells/:capId/:compId` | content.write | upsert cell |
| GET    | `/api/competitive-gaps` | public | list |
| POST   | `/api/competitive-gaps` | content.write | create |
| PATCH  | `/api/competitive-gaps/:id` | content.write | update |
| DELETE | `/api/competitive-gaps/:id` | content.write | delete |
| GET    | `/api/competitor-strengths` | public | list (filter `?active=true`) |
| GET    | `/api/competitor-strengths/:id` | public | get |
| POST   | `/api/competitor-strengths` | content.write | create (409 on duplicate `title`) |
| PATCH  | `/api/competitor-strengths/:id` | content.write | update |
| DELETE | `/api/competitor-strengths/:id` | content.write | delete |

## Verification

- Unit: service filter + ordering + NotFound; CompetitorStrength duplicate-title → Conflict
- Integration: full CRUD on each resource; auth gates respected; matrix shape `{ capabilities, competitors, cells }`
