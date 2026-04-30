# Directive: Microservices

**Build Guide reference**: §4 #7, §7 §Service Architecture
**Module**: `services/api/`, `services/worker/`

## Goal

Decompose into independently deployable service boundaries. Communicate via REST (sync) and async work loops (worker).

## Wave 1 reality

The current shape is **two services** — `services/api` (HTTP) and `services/worker` (background loops: notifications, webhooks, ETL, alerts, daily report). Build Guide §7 specifies more services; we'll extract per-domain services as scale demands.

## Split criteria (when to extract a domain)

- Independent scaling needs (analytics ingest scales differently from CRUD)
- Different runtime (Python ML for recommender / forecaster)
- Different team ownership
- Different release cadence / SLAs

## Likely first splits (Phase 3+)

1. AI plane (recommender, forecasting, model-monitoring) → Python service
2. Webhook delivery → standalone if volume warrants
3. ETL workers → standalone if pipeline gets heavy

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/services` | public | Service catalog: list registered services + health URL + version |

## Constraints

- All services produce structured JSON logs to a central aggregator
- All services expose `/health` (liveness + readiness)
- All services consume `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` from env
