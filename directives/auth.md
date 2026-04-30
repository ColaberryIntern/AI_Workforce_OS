# Directive: Authentication

**Build Guide reference**: §8 Authentication & Authorization
**Module**: `services/api/src/domains/auth/`

## Goal

Issue access + refresh tokens via JWT. Hash passwords with bcrypt. Rotate refresh tokens on every use.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Register new user (gets `viewer` role by default) |
| POST | `/api/auth/login` | public | Exchange email+password for `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | public | Rotate refresh token, return new access+refresh pair |
| POST | `/api/auth/logout` | requireAuth | Revoke refresh token (server-side) |
| GET  | `/api/auth/me` | requireAuth | Return current user + effective roles & permissions |
| POST | `/api/auth/change-password` | requireAuth | Change own password |

## Tokens

- **Access token**: JWT (HS256), `JWT_EXPIRES_IN` (default 1h), claims: `userId`, `email`, `roles`, `permissions`
- **Refresh token**: opaque random 32-byte hex string. Stored sha256-hashed in `RefreshToken`. Rotated on every refresh.
- The effective `permissions` claim is the union of all assigned roles' permissions (own + ancestors via parent chain).

## Edge cases

- Login with wrong password → 401 with generic "Invalid credentials" (no enumeration)
- Inactive user → 403 with `ACCOUNT_DISABLED`
- Expired access token → 401 with `code: TOKEN_EXPIRED`
- Reused/revoked refresh token → 401 + invalidate the entire refresh chain (security alarm)

## Safety constraints

- Auth endpoints rate-limited (10 req/min/IP)
- Generic error messages on login (no user enumeration)
- Bcrypt cost factor 10
- Refresh token hashed at rest with sha256 (raw token never persisted)
- Audit log entries on register, login (success only), logout, password-change

## Verification

- Unit: bcrypt round-trip; JWT issue+verify
- Integration: register → login → /me happy path; bad password 401; protected route requires Bearer; expired token 401; refresh rotates
