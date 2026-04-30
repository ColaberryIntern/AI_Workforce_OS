# Directive: Usage Analytics

**Build Guide reference**: §4 #6
**Module**: `services/api/src/domains/analytics/`

## Goal

Track user engagement, retention, feature adoption. Reports generated within 1 hour of data collection.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/analytics` | analytics.write | Ingest one or many events |
| GET  | `/api/analytics` | analytics.read | Query: by event name + date range; by session |
| GET  | `/api/analytics/summary` | analytics.read | DAU/WAU/MAU + top events |

## Inputs

- `{ userId?, eventName, payload, sessionId? }`

## Edge cases

- Anonymous (no userId) accepted but flagged
- Replay (same eventId) → de-dup
- Burst (>1k/min from one source) → rate limit + reject

## Safety

- PII fields scrubbed before save (CLAUDE.md compliance)
- Honor user opt-out (Do Not Track) — drop opted-out events

## Verification

- Ingest test: accepted within 100 ms (single-event)
- Summary test: known fixture → known DAU/WAU
- Privacy test: PII fields stripped
