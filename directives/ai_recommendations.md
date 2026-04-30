# Directive: AI Recommendations

**Build Guide reference**: §4 #2
**Module**: `services/api/src/domains/recommendations/`

## Goal

User-facing endpoint that composes the Recommender + Forecast services and returns confidence-scored items. Persists every output for audit + Model Monitoring.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/recommendations` | recommendation.read | Generate + persist a set of recs for a user/context |
| GET  | `/api/recommendations` | recommendation.read | List own (user) or all (admin) |
| GET  | `/api/recommendations/:id` | recommendation.read | Get one |
| POST | `/api/recommendations/:id/accept` | recommendation.write | Mark accepted (feeds back to monitoring) |
| POST | `/api/recommendations/:id/reject` | recommendation.write | Mark rejected with optional feedback |

## Acceptance (Build Guide §4 #2)

- Response < 2s (p95)
- ≥70% acceptance rate over time
- Confidence scores included on every item

## Edge cases

- No history → cold-start fallback (low confidence)
- Recommender unreachable → 503
- Stale staffing event → flagged but allowed

## Safety

- Authenticated users only
- Hard filters before scoring: labor-law caps (overtime, minor restrictions) — not yet wired (Phase 4 candidate)
- Every output written to `Recommendation` table with model name + version

## Verification

- Contract: returns array, every item has `confidence in [0,1]`
- Latency: p95 < 2000ms
- Persistence: each call creates corresponding `Recommendation` rows
