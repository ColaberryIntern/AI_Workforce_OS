# Directive: Notifications

**Build Guide reference**: §4 #3
**Module**: `services/api/src/domains/notifications/`, `services/worker/src/notifications/`

## Goal

Email + in-app alerts for critical events. ≥95% delivery within 5 minutes.

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/notifications` | notification.write | Enqueue a notification |
| GET  | `/api/notifications` | notification.read (or self) | List own / all (admin) |
| GET  | `/api/notifications/:id` | notification.read (or self) | Get one |
| GET  | `/api/notifications/preferences` | self | Get own preferences |
| PUT  | `/api/notifications/preferences` | self | Update own preferences |

## Provider abstraction

```ts
interface NotificationProvider {
  send(channel, recipient, subject, body): Promise<{ ok: boolean; messageId?: string; error?: string }>
}
```

- `ConsoleProvider` (default; logs to stdout) — Wave-1 default
- `EmailProvider` interface ready; SDK plug-in deferred (Wave-2 question: SendGrid/Postmark/SES)
- `SmsProvider` interface ready; deferred (Wave-2: Twilio?)

## Delivery loop

The worker (`services/worker/src/notifications/dispatchLoop.ts`) polls `Notification` for `status='pending'` rows, calls the provider, and updates status:
- success → `status='sent'`, `sentAt` set
- transient failure → bump `attempts`, retry with exponential backoff (5s, 30s, 5m, 30m), final fail at 4 attempts
- permanent failure (invalid recipient) → `status='failed'`

## Edge cases

- User opted out for channel/eventType → `status='skipped'`, no provider call
- Per-user rate cap (10/5min) → `status='skipped'` with reason `RATE_LIMITED`
- Body encrypted at rest (`encryption` lib) — decrypted before send

## Verification

- Unit: dispatch chooses provider for channel; opt-out short-circuits; rate cap enforced
- Worker integration: pending row → `sent` after one tick (with stub provider returning ok)
- Failure path: provider returns transient error → attempts incremented, retried
