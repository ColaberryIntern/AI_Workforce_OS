# Directive: API Access

**Build Guide reference**: §4 #4, §6 #1, §7 API Design
**Module**: `services/api/src/domains/api-access/`

## Goal

Provide a discoverable RESTful API surface. The Build Guide §4 #4 specifies `GET /api/data`; we use it as a **catalog** endpoint that returns the list of public surfaces and their methods so third-party clients can introspect.

## API platform contract

- All responses use the JSON envelope from `lib/envelope.ts`
- All errors return appropriate HTTP status (400, 401, 403, 404, 409, 422, 429, 500, 503)
- All endpoints rate-limited (default 600/min/IP)
- All requests logged with method, path, status, duration_ms, request_id
- p95 latency < 200 ms (NFR Build Guide §6 #1)

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/data` | public | Catalog: list every feature endpoint + method + auth requirement |

## Versioning

- Implicit v1 at `/api/...`
- Path-based for breaking changes (`/api/v2/...`)

## Verification

- Smoke: catalog includes every Build-Guide-spec path that's mounted
- Contract: 4xx/5xx always return the canonical error envelope
- Rate limit: triggers 429 after configured threshold
