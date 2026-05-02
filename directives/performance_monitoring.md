# Directive: Performance Monitoring

**Build Guide reference**: §4 #14, §6 (NFRs)
**Module**: `services/api/src/domains/performance-monitoring/`, `services/api/src/middleware/requestLogger.ts`

## Goal

Track latency, throughput, and error rates. Real-time updates. Alert on degradation.

## Inputs

- Per-request: emitted by `requestLogger`
- Per-domain: emitted explicitly by services (e.g. recommendation latency)
- Vendor APM SDK once vendor selected (Wave-2 question)

## Outputs

- `PerfMetric` rows for our own historical record
- Vendor dashboard (Phase 5)
- Alerts via `AlertRule` evaluation

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET  | `/api/performance` | monitoring.read | Aggregated metrics: by service / endpoint / metric / window |
| POST | `/api/performance/metrics` | monitoring.write | Ingest a single PerfMetric row |

### Ingest body (POST /api/performance/metrics)

| Field | Type | Constraint |
|---|---|---|
| `service` | string | 1–120 chars, required |
| `endpoint` | string | ≤200 chars, optional |
| `metricName` | string | 1–120 chars, required |
| `metricValue` | number | finite (NaN/Infinity rejected) |
| `labels` | object | optional |

## Error Handling (Build Guide §4 #14)

| Failure | Status | Code |
|---|---|---|
| Invalid metrics input (missing service/metricName, non-finite value, over-long fields) | **400** | `VALIDATION_ERROR` |
| Missing or invalid auth | 401 | `UNAUTHORIZED` |
| Caller lacks `monitoring.write` (POST) or `monitoring.read` (GET) | 403 | `FORBIDDEN` |
| DB unreachable / Prisma error | 500 | `INTERNAL_ERROR` |

The error envelope shape is the standard `{ error: { code, message, details? } }` from `lib/envelope.ts`.

## Edge cases (Build Guide §4 #14)

- **No data available** — `GET /api/performance` with empty result returns `meta.message: 'No performance metrics yet.'` alongside `data: { items: [], aggregates: {} }`. Build Guide §4 #14 §Edge Cases: "If no performance data is available, return a message indicating that."
- **Filter window outside data range** — same as above (empty + message).
- **NaN / Infinity in `metricValue`** — Zod's `.refine(Number.isFinite)` rejects → 400. JSON itself can't carry NaN/Infinity, but a client sending a string or `null` would also be rejected by the type check.

## Default thresholds

- p95 < 200ms (Build Guide §6 #1)
- error rate < 1%

## Verification

- Endpoint returns aggregations from `PerfMetric`
- Synthetic latency injection → alert fires within 1 minute (Phase 4 alerter)
- Schema validation matrix: `tests/unit/performance-monitoring.schemas.test.ts`
