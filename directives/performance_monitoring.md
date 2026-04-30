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
| GET | `/api/performance` | monitoring.read | Aggregated metrics: by service / endpoint / metric / window |

## Default thresholds

- p95 < 200ms (Build Guide §6 #1)
- error rate < 1%

## Verification

- Endpoint returns aggregations from `PerfMetric`
- Synthetic latency injection → alert fires within 1 minute (Phase 4 alerter)
