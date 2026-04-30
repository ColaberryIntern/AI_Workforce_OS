# Directive: Webhooks

**Build Guide reference**: §4 #5
**Module**: `services/api/src/domains/webhooks/`, `services/worker/src/webhooks/`

## Goal

External services subscribe to events and receive HTTP callbacks. ≥90% delivery within 2 seconds; up to 4 attempts on transient failure.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST   | `/api/webhooks` | webhook.write | Register; secret returned ONCE in response |
| GET    | `/api/webhooks` | webhook.read | List (secrets never returned) |
| GET    | `/api/webhooks/:id` | webhook.read | Get (secret never returned) |
| PATCH  | `/api/webhooks/:id` | webhook.write | Update url/events/active |
| DELETE | `/api/webhooks/:id` | webhook.write | Delete |
| POST   | `/api/webhooks/:id/test` | webhook.write | Enqueue a synthetic delivery |
| GET    | `/api/webhooks/:id/deliveries` | webhook.read | List recent delivery attempts |

## Signing

Outgoing payload signed with HMAC-SHA256 using the webhook's secret:
- `X-AIWOS-Signature: <hex>`
- `X-AIWOS-Event: <eventType>`
- `X-AIWOS-Delivery: <deliveryId>`
- `X-AIWOS-Timestamp: <unixSeconds>`

Subscribers verify by HMAC-ing the raw body with the same secret.

## Retry policy

- Attempt 1 → on failure schedule attempt 2 in 1s
- Attempt 2 → in 4s
- Attempt 3 → in 16s
- Attempt 4 → final; on failure mark `failed`
- 24 consecutive failed deliveries → auto-disable webhook, notify subscriber

## SSRF protection

- Production: HTTPS-only, reject private IPs (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, IPv6 loopback / ULA / link-local), reject metadata IPs
- Dev/test: allow http + private (so local testing works)

## Edge cases

- Registration with `http://10.0.0.1` in production → 422
- Subscriber returns non-2xx → counts as failure for retry
- Subscriber returns 410 Gone → final fail (do not retry)
- Connection timeout → counts as failure

## Verification

- Unit: HMAC signature stable for known input; timing-safe verify
- Unit: SSRF guard rejects private + cloud-metadata
- Worker integration: pending delivery → success after one tick (mocked fetch)
- Worker integration: 503 from subscriber → attempts incremented, scheduled for retry
