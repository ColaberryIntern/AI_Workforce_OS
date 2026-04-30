# Directive: Alerting System

**Build Guide reference**: §4 #16
**Module**: `services/api/src/domains/alerting/`, `services/worker/src/alerter/`

## Goal

Fire alerts on metric threshold breaches within 1 minute. Route via vendor (PagerDuty/Opsgenie — Wave-2) or fall back to console.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET    | `/api/alerts` | monitoring.read | List alerts (open / all) |
| POST   | `/api/alerts/rules` | alert.write | Register threshold rule |
| GET    | `/api/alerts/rules` | alert.write | List rules |
| PATCH  | `/api/alerts/rules/:id` | alert.write | Update rule |
| DELETE | `/api/alerts/rules/:id` | alert.write | Delete rule |
| POST   | `/api/alerts/:id/acknowledge` | monitoring.read | Acknowledge an alert |
| POST   | `/api/alerts/:id/resolve` | monitoring.read | Resolve |

## Worker

`services/worker/src/alerter/runner.ts` evaluates active rules every 60s against `PerfMetric` / `ModelMetric` aggregates. Creates `Alert` rows on breach.

## Edge cases

- Vendor unreachable → log + email fallback
- Flapping → debounce 5min window
- Storm → group by source, suppress duplicates

## Verification

- Synthetic breach creates alert within one tick
- Resolve closes alert
- Re-evaluating same condition while alert is open → no duplicate
