# Directive: Recommender System

**Build Guide reference**: §4 #11, §5 (AI architecture)
**Module**: `services/api/src/domains/recommender/`, `services/api/src/lib/ml/popularityRecommender.ts`

## Goal

Provide ranked, confidence-scored recommendations. Used by the higher-level `/api/recommendations` endpoint.

## Approach (Wave 1)

Deterministic baseline:
- **Popularity-based**: count past acceptance rate per recommendation kind, blend with recency decay
- **Content-based**: simple feature matching (role, location, skills) against user profile
- **Provider interface** in `lib/providers/RecommenderProvider.ts` — real ML model swaps in later

## Inputs

- `userPreferences`: `{ role, location, skills[] }`
- `historicalData`: `Recommendation[]` for this user

## Outputs

- Ranked list `{ kind, payload, confidence, modelName, modelVersion }`
- Confidence in `[0, 1]`

## Edge cases

- Cold-start (no history) → fallback to default ranked set with low confidence (~0.3) + `cold_start: true` meta
- Empty candidate pool → `[]`, NOT an error

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/recommendations/system` | recommendation.read | Run the recommender for a given user/context |

## Verification

- Determinism: fixed input → fixed output (no randomness in core scoring)
- Cold-start: returns non-empty fallback
- Provider swap: changing the impl preserves the contract
