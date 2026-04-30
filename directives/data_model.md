# Directive: Data Model

**Build Guide reference**: §7 Database Schema
**Module**: `services/api/prisma/schema.prisma`

## Goal

A single Prisma schema is the source of truth for all persistent state. Domains access Postgres only through Prisma.

## Entities

### Identity & Access
- `User`, `Role`, `Permission`, `RolePermission` (N:M), `RoleAssignment` (user→role), `RefreshToken`

### Operational
- `StaffingEvent`, `Recommendation`, `Forecast`

### Comms
- `Notification`, `NotificationPreference`, `Webhook`, `WebhookDelivery`

### Analytics & Audit
- `AnalyticsEvent`, `AuditLog`

### Monitoring
- `ModelMetric`, `PerfMetric`, `AlertRule`, `Alert`

### Pipeline
- `EtlJob`

### Content
- `ValueProposition`, `Capability`, `Competitor`, `MatrixCell`, `CompetitiveGap`

## Conventions

- Primary keys: `cuid()`
- Timestamps: `createdAt` (default now()) and `updatedAt` (Prisma `@updatedAt`); append-only tables only have `createdAt` / `occurredAt`
- Foreign keys: `onDelete: Cascade` for owned children, `SetNull` for soft references (e.g. user attribution that should outlive the user row)
- Indexes: every table queried by a non-PK has explicit `@@index`

## Migrations

- Local: `npx prisma migrate dev`
- Prod: `npx prisma migrate deploy`

## Verification

- `npx prisma validate` passes (CI gate)
- Smoke: client connects, `SELECT 1` returns 1 (health route)
