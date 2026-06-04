# Phase 3 - Security Hardening

## Status

Complete for Track A pilot baseline.

## Changes Implemented

### Refresh Token Protection

- Refresh tokens are now stored hashed in the database using SHA-256.
- Raw refresh tokens are used only to set the HttpOnly cookie.
- Login and refresh responses no longer expose the refresh token in the JSON response body.
- Refresh token rotation still occurs on refresh.

Existing users with old plaintext refresh tokens must log in again after deployment.

### Password Verification

- Removed fallback acceptance of plaintext placeholder passwords such as `CHANGE_ME` and `hash`.
- Invalid BCrypt hashes now fail login instead of permitting direct string comparison.

### Cookie Policy

- Development:
  - `SameSite=Lax`
  - `Secure=false`
- Production:
  - `SameSite=None`
  - `Secure=true`

This keeps local development usable while enforcing secure cross-site cookie behavior in production.

### JWT Signing Key

- API startup now rejects JWT keys shorter than 32 characters.

### CORS

- Production CORS now requires explicit configured origins.
- Configure with:
  - `AllowedOrigins` in configuration; or
  - `ALLOWED_ORIGINS` environment variable.
- Development still allows localhost, local IP, and ngrok-style dev tunnels.

## Remaining Security Work

- Add audit logging for failed login attempts.
- Add password change flow and force first-login password change for seeded/default admin.
- Remove default admin credentials from production seed flow.
- Add stricter security headers at the final reverse proxy.
- Add automated security tests for endpoint authorization.

