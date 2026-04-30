# Directive: Audit Logging

**Build Guide reference**: §4 #10 + §8
**Module**: `services/api/src/middleware/auditLog.ts`, `services/api/src/domains/audit-log/`

## Goal

Append-only logs of all user actions and data modifications: timestamp, user ID, action, resource, IP, user agent, arbitrary metadata.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET  | `/api/audit` | audit.read | List with filters: userId / action / from / to; cursor pagination |
| POST | `/api/audit` | audit.read | Manual append for special cases |

## Auto-write

The `audit(action, resourceFn)` middleware writes a row after `res.finish` for any successful mutation. Failure to write must NOT crash the request.

## Edge cases

- Audit write fails → log error + alert ops; do not break user flow
- High volume → async write (post-finish), no extra request latency
- 4xx response → not audited as success (failure is logged by errorHandler)

## Safety constraints

- No passwords / tokens / full PII in `metadata` — store references like `user:abc123`
- Retention: 12 months minimum (Build Guide §8)
- Read access requires `audit.read` permission

## Verification

- Integration: any successful mutation produces an audit row
- Negative: 4xx response does NOT produce an audit row
- Filter test: `?action=role.create` returns only matching rows
- Pagination: cursor traversal is exhaustive and stable
