# Directive: AI Model Monitoring

**Build Guide reference**: §4 #15
**Module**: `services/api/src/domains/model-monitoring/`

## Goal

Track model accuracy, drift, prediction confidence. Evaluate at least weekly. Alert on drift or confidence regression.

## Inputs

- Predictions (we already write these to `Recommendation` and `Forecast`)
- Outcomes (feedback signal: was the recommendation accepted? was the forecast accurate?)

## Outputs

- `ModelMetric` rows: `accuracy`, `precision`, `recall`, `auc`, `drift_*`
- Alerts when any metric drops by > X% relative to a 4-week baseline

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/model/monitor` | monitoring.read | Record predictions vs outcomes batch |
| GET  | `/api/model/monitor` | monitoring.read | List recent model metrics |

## Edge cases

- < 30 outcomes → skip evaluation window with a flag
- New model version → require warm-up period before drift comparison
- Skewed feedback → flag bias risk

## Verification

- Batch produces `ModelMetric` rows
- Drift detection: simulated 20% accuracy drop → drift alert
