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
| GET | `/api/data` | public | Catalog: list every feature endpoint + method + auth requirement. Optional `?area=<name>` filter. |

### Request params (Build Guide §4 #4 §I/O)

`requestParams: Object (optional)`:
- `area` (string, optional) — when provided, return only the surface whose
  `area` matches exactly. Empty surfaces array when no match (200, never 404).

### Response shape

`responseData: Object`:

```
{
  "data": {
    "apiVersion": "v1",
    "baseUrl": "/api",
    "surfaces": [ { area, directive, endpoints: [ { method, path, auth } ] } ]
  },
  "meta": { "area": "<filter>", "matched": <count> }   // only when ?area is set
}
```

### Error handling

- Unsupported HTTP method → 404 NOT_FOUND (envelope shape: `{ "error": { "code", "message" } }`)
- Generic envelope for 4xx/5xx — `error: String (if applicable)` per Build Guide §4 #4

## Edge cases

- `?area=` provided but no surface matches → 200 with empty `surfaces` array (not 404)
- Missing or malformed query string → treated as no filter

## Versioning

- Implicit v1 at `/api/...`
- Path-based for breaking changes (`/api/v2/...`)

## Verification

- Smoke: catalog includes every Build-Guide-spec path that's mounted
- Smoke: `?area=auth` returns only the auth surface
- Contract: 4xx/5xx always return the canonical error envelope
- Rate limit: triggers 429 after configured threshold
