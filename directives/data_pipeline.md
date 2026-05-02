# Directive: Data Pipeline

**Build Guide reference**: §4 #13
**Module**: `services/api/src/domains/data-pipeline/`, `services/worker/src/etl/`

## Goal

Ingest raw HRIS data, validate, sanitize, output cleaned rows ready for ML training. Each ETL job idempotent. Process within 1 hour for 1M-row datasets.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/data/pipeline` | pipeline.run | Enqueue an ETL job |
| GET  | `/api/data/pipeline` | pipeline.run | List recent jobs |
| GET  | `/api/data/pipeline/:id` | pipeline.run | Get job + quality report |

## Approach (Wave 1)

In-process queue + worker loop. Job rows tracked in `EtlJob` table with status `pending → running → success | failed`.

Future Phase 5 candidates: Kafka or SQS for cross-process queueing.

## Request schema (POST /api/data/pipeline)

| Field | Type | Constraint |
|---|---|---|
| `jobType` | enum | `staffing_events` \| `recommendations` \| `forecast_inputs` \| `analytics_events` \| `audit_logs` \| `custom` |
| `sources` | string[] | 1–100 entries; each matches `^[a-zA-Z0-9._:/-]{1,200}$`; no duplicates within the array |

## Error Handling (Build Guide §4 #13)

| Failure | Status | Code | Where it happens |
|---|---|---|---|
| Invalid raw data sources (bad jobType, bad source format, duplicate sources, empty sources) | **400** | `VALIDATION_ERROR` | Synchronous — Zod rejects at the route boundary |
| ETL process failure at the API layer (DB unreachable, Prisma error during enqueue) | **500** | `INTERNAL_ERROR` | Synchronous — caught by the global errorHandler |
| ETL process failure at the worker layer (async, after enqueue) | 200 (on `GET /:id`) | n/a | Surfaces through `status: 'failed'` + derived `failureReason` field on the row. The GET succeeded (the resource exists), so REST convention says 200 — callers detect failure by reading the body. |
| Job not found | 404 | `NOT_FOUND` | `getById` throws `NotFoundError` |

The error envelope shape is the standard `{ error: { code, message, details? } }` from `lib/envelope.ts`.

## Edge cases (Build Guide §4 #13)

- **Empty list** — `GET /api/data/pipeline` with no jobs returns `meta.message: 'No ETL jobs yet.'` alongside an empty `data` array. Build Guide §4 #13 §Edge Cases: "If no data is available for processing, return a message indicating that."
- **Job processed zero records** — runner sets `recordsIn: 0`, `recordsOut: 0`, `qualityScore: 1` (no errors among 0 inputs). Distinguishable from a real failure by `status: 'success'`.
- **Source unreachable** at run time → retry w/ backoff, mark `failed` and alert
- **Schema drift** → quarantine bad batch
- **Duplicate by source-id** within a job → request rejected at validation
- **Reused source identifier across jobs** → fine, deliberate (idempotent re-runs are a feature)

## Verification

- Idempotency: same job ID processed twice → same final state
- Quality report: per-run record counts + validation errors
- Schema validation matrix: `tests/unit/data-pipeline.schemas.test.ts`
