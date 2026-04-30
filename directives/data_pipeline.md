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

## Edge cases

- Source unreachable → retry w/ backoff, mark `failed` and alert
- Schema drift → quarantine bad batch
- Duplicate by source-id → de-dup

## Verification

- Idempotency: same job ID processed twice → same final state
- Quality report: per-run record counts + validation errors
