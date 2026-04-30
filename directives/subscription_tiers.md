# Directive: Subscription Tiers (& commercial)

**Build Guide reference**: §1 §Business Model (Subscription Tiers, Customer Acquisition, Revenue Streams) + §10 §Marketing Channels
**Module**: `services/api/src/domains/subscription/`

## Goal

Cover the commercial / GTM surface of the platform: subscription tiers, add-ons, marketing channels, partnerships, events (webinars + demos), consulting services, training programs, and competitor strategic intel.

This is **read-mostly content** (like value-proposition). No LLM in the request path. Pure CRUD over Postgres.

## Resources

| Resource | Purpose |
|---|---|
| `SubscriptionTier` | The pricing tiers offered (Build Guide §1 — Basic / Professional / Enterprise) |
| `AddOn` | Optional features bundled into a tier subscription for an extra fee |
| `MarketingChannel` | Digital marketing channel (SEO / content / social / paid / email / event) tracked for GTM |
| `Partnership` | HR consulting firm / industry association / reseller / tech partner relationships |
| `Event` | Webinars + demos + workshops + conferences |
| `ConsultingService` | Service offerings sold alongside the platform |
| `TrainingProgram` | Educational programs for users / admins |
| `CompetitorInsight` | Per-competitor strengths / weaknesses / opportunities / threats (links to existing `Competitor`) |

## API

### Public (anonymous reads — render on the marketing site)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET   | `/api/subscription-tiers` | public | list tiers (filter `?active=true`) |
| GET   | `/api/subscription-tiers/:id` | public | get one |
| POST/PATCH/DELETE `/api/subscription-tiers[/:id]` | content.write | mutate |
| GET   | `/api/add-ons` | public | list (filter `?tier=professional&active=true`) |
| GET   | `/api/add-ons/:id` | public | get |
| POST/PATCH/DELETE `/api/add-ons[/:id]` | content.write | mutate |
| GET   | `/api/events` | public | list (filter `?eventType=webinar&upcoming=true`) |
| GET   | `/api/events/:id` | public | get |
| POST/PATCH/DELETE `/api/events[/:id]` | content.write | mutate |
| GET   | `/api/consulting-services` | public | list |
| GET   | `/api/consulting-services/:id` | public | get |
| POST/PATCH/DELETE `/api/consulting-services[/:id]` | content.write | mutate |
| GET   | `/api/training-programs` | public | list (filter `?format=live&level=intro`) |
| GET   | `/api/training-programs/:id` | public | get |
| POST/PATCH/DELETE `/api/training-programs[/:id]` | content.write | mutate |

### Internal (auth required — contains contact info / strategy)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET   | `/api/marketing-channels` | requireAuth | list (filter `?channelType=social&status=active`) |
| GET   | `/api/marketing-channels/:id` | requireAuth | get |
| POST/PATCH/DELETE `/api/marketing-channels[/:id]` | content.write | mutate |
| GET   | `/api/partnerships` | requireAuth | list |
| GET   | `/api/partnerships/:id` | requireAuth | get |
| POST/PATCH/DELETE `/api/partnerships[/:id]` | content.write | mutate |
| GET   | `/api/competitor-insights` | requireAuth | list (filter `?competitorId=...&kind=strength`) |
| GET   | `/api/competitor-insights/:id` | requireAuth | get |
| POST/PATCH/DELETE `/api/competitor-insights[/:id]` | content.write | mutate |

## Edge cases

- Duplicate `SubscriptionTier.key` / `AddOn.name` / `Partnership.name` / `MarketingChannel.name` / `ConsultingService.name` / `TrainingProgram.title` → 409 Conflict
- `CompetitorInsight.competitorId` references a missing competitor → 404 Not Found at create / update time
- `AddOn.applicableTierKeys` is a free-form `string[]` (matches `Webhook.events` precedent) — no FK constraint, but the marketing site uses tier keys to render which add-ons attach where
- Get-by-id of a non-existent record → 404
- `Event.upcoming=true` filter implies `status=scheduled` and `scheduledAt >= now`

## Safety constraints

- Public reads on tier/add-on/event/consulting/training surfaces (marketing site needs them anonymous)
- Internal surfaces (marketing-channels, partnerships, competitor-insights) require login
- All writes require `content.write` permission and produce an audit log entry
- Partnership records carry contact email — never returned to anonymous callers

## Verification

- Unit tests: list filters; NotFound on missing id; ConflictError on duplicate unique keys; competitor existence guard on `CompetitorInsight.create`/`update`; ordering by `orderIndex`
- Smoke tests: catalog at `/api/data` advertises every new surface; `GET /api/subscription-tiers` returns 200 anonymously; `GET /api/competitor-insights` returns 401 anonymously; `POST /api/subscription-tiers` without auth returns 401; envelope is consistent

## Determinism / Reliability

- Determinism: 9/10 — pure CRUD, validated input, typed output
- Reliability: 8/10 — DB-backed, structured errors
- AI Enhancement: N/A — content layer
- Automation: N/A — admin-curated content
