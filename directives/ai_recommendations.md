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
| GET  | `/api/recommendations/feedback-stats` | recommendation.read | Aggregate accept/reject signal — self-scoped, system-wide for admins |

## Feedback loop (Build Guide §4 #11 acceptance — "must be updated based on user feedback")

The recommender ingests feedback automatically. Every accept/reject persists to
the `Recommendation` row, and the next call to `POST /api/recommendations`
fetches recent history and feeds it through the popularity scorer with
exponential recency decay (14-day half-life). High-acceptance kinds rise
to the top; low-acceptance kinds drop. No manual retraining needed for the
baseline model.

The `GET /api/recommendations/feedback-stats` endpoint surfaces the
aggregated signal so callers can verify the loop is healthy:

```
{
  "scope": "self" | "system",
  "overall": { total, accepted, rejected, pending, acceptanceRate },
  "byKind":  [ { kind, total, accepted, rejected, pending, acceptanceRate } ],
  "windowed": { "last30d": { total, accepted, acceptanceRate } },
  "modelMix": [ { modelName, modelVersion, count } ]
}
```

`acceptanceRate` is `accepted / (accepted + rejected)` — pending items are
excluded from the denominator. `null` when there are no resolved items.

## Acceptance (Build Guide §4 #2)

- Response < 2s (p95)
- ≥70% acceptance rate over time
- Confidence scores included on every item

## Edge cases

- No history → cold-start fallback (low confidence)
- Recommender unreachable → 503
- Stale staffing event → flagged but allowed
- Feedback-stats with no recommendations → empty buckets, `acceptanceRate: null`

## Safety

- Authenticated users only
- Hard filters before scoring: labor-law caps (overtime, minor restrictions) — not yet wired (Phase 4 candidate)
- Every output written to `Recommendation` table with model name + version

## Verification

- Contract: returns array, every item has `confidence in [0,1]`
- Latency: p95 < 2000ms
- Persistence: each call creates corresponding `Recommendation` rows
