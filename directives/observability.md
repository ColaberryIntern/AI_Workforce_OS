# Directive: Observability

**Build Guide reference**: §6 Monitoring & Alerting
**Module**: `services/api/src/config/logger.ts`, `services/api/src/middleware/requestLogger.ts`

## Logging

- **Format**: JSON (Pino)
- **Level**: `LOG_LEVEL` env (default `info`)
- **Required fields per request**: `req.id`, `method`, `url`, `status`, `responseTime`, `service`
- **Redaction**: `authorization`, `cookie`, `password*`, `token`, `refreshToken` redacted at logger config
- **No PII at info** — only at debug, only in non-production

## Metrics

- Per-request: latency + status → captured by `requestLogger`
- Per-domain: business metrics → `PerfMetric` / `ModelMetric` rows
- Aggregation: vendor APM (Phase 5; deferred until vendor selected)

## Tracing

- Phase 5 candidate: OpenTelemetry SDK across services as we split

## Alerting policy

Default thresholds (configurable via `AlertRule`):
- p95 latency > 200 ms over 5 min
- Error rate > 1% over 5 min
- DB connection failures > 5 in 1 min
- Audit log write failures > 0 in 1 min (zero tolerance)

## Verification

- Smoke: every request produces exactly one log line with `responseTime > 0`
- Redaction test: `authorization` never appears in any log payload
