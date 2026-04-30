# Directive: Security

**Build Guide reference**: §8 Security & Compliance
**Module**: `services/api/src/middleware/`, `services/api/src/lib/encryption.ts`, `services/api/src/lib/hmac.ts`, `services/api/src/lib/ssrfGuard.ts`

## Pillars

1. **Authentication** — JWT (HS256) with bcrypt-hashed passwords. Tokens carry `userId`, `email`, `roles`, `permissions` (effective set). 1h access token + opaque refresh token (sha256-hashed at rest, rotated on use).
2. **Authorization** — RBAC: `requireRole(...)` for role gates, `requirePermission(...)` for fine-grained gates.
3. **Encryption in transit** — HTTPS-only in production (terminate at load balancer). HSTS via `helmet()`.
4. **Encryption at rest** — AES-256-GCM via `lib/encryption.ts`. Applied to `Notification.body` (PII). Format: `v1:<iv>:<tag>:<ciphertext>`.
5. **Headers** — `helmet()` for CSP, X-Frame-Options, X-Content-Type-Options, etc.
6. **Input validation** — Zod schemas at every route boundary.
7. **Rate limiting** — global per-IP (600 req/min); auth endpoints further limited (10 req/min) to slow brute force.
8. **Audit logging** — every successful mutation produces an `AuditLog` row.
9. **Secrets** — env vars only; never committed; production uses a secret manager (Wave-2 question: AWS Secrets Manager vs Vault).
10. **Outbound (webhooks)** — HMAC-SHA256 signed; SSRF guard rejects private/loopback/cloud-metadata addresses in production.

## Threat model (Build Guide §8)

| Threat | Mitigation |
|---|---|
| Data breach | Encryption + RBAC + audit + secret manager |
| DoS | Rate limiting + helmet + CDN (Phase 5) |
| Insider threat | RBAC + audit + retention |
| Malware in deps | Dependency scanning (Dependabot) |
| MitM | HTTPS-only + HSTS |
| SSRF (webhooks) | URL guard rejecting private ranges |

## Compliance commitments

- GDPR — right to access / rectify / delete
- CCPA — opt-in / opt-out of sale / privacy policy

## Verification

- Unit: bcrypt + JWT issue/verify, encryption round-trip + tamper, HMAC sign/verify, SSRF guard
- Integration: protected route requires auth + role/permission
- Penetration: scheduled before launch (Phase 4)
