# Directive: Time-Series Forecasting

**Build Guide reference**: §4 #12
**Module**: `services/api/src/domains/forecasting/`, `services/api/src/lib/ml/movingAverageForecaster.ts`

## Goal

Forecast staffing demand for a scope (global / team / location) over a horizon. Output point estimates + lower/upper confidence intervals.

## Approach (Wave 1)

Deterministic baseline:
- **Moving average + linear trend** over the historical series
- 95% CI from std-dev of residuals
- Provider interface (`lib/providers/ForecastProvider.ts`) so Prophet / ARIMA can swap in

## Inputs

- `scope`: `'global' | 'team:<id>' | 'location:<id>'`
- `horizonDays`: 1–365
- `externalFactors`: optional object (currently a passthrough to the model)

## Outputs

- `forecast`: `[{ date, value }, ...]`
- `confidenceInterval`: `{ lower: [...], upper: [...] }`
- `modelName`, `modelVersion` on every response

## Edge cases

- Insufficient history (< 14 points) → 422 `INSUFFICIENT_HISTORY`
- External factors missing → forecast still returned with a meta note
- Forecaster unreachable → 503

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/forecast` | forecast.write | Compute + persist forecast |
| GET  | `/api/forecast/:id` | forecast.read | Retrieve a stored forecast |

## Verification

- Determinism for fixed input
- CI calibration: 95% CI covers ~95% of held-out actuals on synthetic data
- 422 on too-short history
