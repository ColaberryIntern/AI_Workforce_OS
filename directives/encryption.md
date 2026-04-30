# Directive: Encryption at Rest

**Build Guide reference**: §4 #9 + §8
**Module**: `services/api/src/lib/encryption.ts`, `services/api/src/domains/encryption/`

## Goal

AES-256-GCM authenticated encryption. Tampering detected via auth tag. Rotation-friendly via version prefix.

## Algorithm

- `aes-256-gcm`
- Key: 32 bytes from `ENCRYPTION_KEY` (hex). Required in production. Dev/test derives from JWT_SECRET.
- IV: 12 bytes random per encryption
- Auth tag: 16 bytes
- Format: `v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`

## Application

- `Notification.body` — encrypted before insert; transparently decrypted on read via `maybeDecrypt()`
- Future (Phase 5): `AuditLog.metadata` PII fields, file uploads

## API

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/encrypt` | admin only | Utility: encrypt or decrypt a JSON body for admin tooling |

## Edge cases

- Tampered ciphertext → `decrypt()` throws (auth tag mismatch)
- Missing ENCRYPTION_KEY in prod → boot fails
- Empty string → encrypts to a valid v1 payload (round-trip OK)

## Verification

- Round-trip: `encrypt(s) === decrypt(...)`
- Tamper: any byte flip → throws
- Distinct IVs: 30 encrypts of same plaintext → 30 distinct ciphertexts
- Format: starts with `v1:` and has 4 colon-separated hex parts
