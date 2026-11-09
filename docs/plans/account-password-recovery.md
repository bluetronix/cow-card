# Account & Password Recovery — Execution Plan

Status: proposed  
Scope: account page, email capture, email verification, password recovery, session management  
Delivery target: Vercel API + Turso + Vue client

---

## 1. Objective

Add a secure, minimal account surface that enables:

- email-based password recovery
- email verification and email changes
- password changes
- active-session visibility and revocation
- logout from all devices

This is an **account security surface**, not a full social profile. Do not add
avatars, bios, social links, or unrelated profile fields.

---

## 2. Current state

- Auth uses `scrypt` password hashes and server-side sessions.
- `sessions` table exists with hashed session IDs, expiry and revocation.
- Sessions are random 256-bit IDs; the cookie is HttpOnly, SameSite=Lax and
  Secure in production.
- `POST /api/auth/logout-all` already revokes all user sessions.
- The dashboard already exposes “Logout all devices”.
- `users` has: `id`, `username`, `full_name`, `password_hash`, `created_at`,
  `updated_at`, `deleted_at`.
- **There is no `email` column and no account/profile page.**
- Resend is available for transactional email, but no email integration exists.
- Canonical env names are: `TURSO_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`,
  `IMGBB_API_KEY`, `VITE_API_URL`, `VITE_APP_URL`.

---

## 3. Scope

### In scope

- `users.email`, `users.email_verified_at`
- email verification tokens
- password reset tokens
- account page: email, password, sessions, logout-all
- forgot-password and reset-password pages
- email change with verification
- Resend email delivery
- request rate limiting for recovery endpoints
- tests and deployment steps

### Out of scope

- OAuth/social login
- MFA/TOTP
- SMS recovery
- full profile fields (avatar, address, bio)
- admin user-management UI
- email marketing

---

## 4. UX flows

### 4.1 Registration

1. User enters username, full name, email, password.
2. Email is normalized to lowercase and validated.
3. User + session are created atomically.
4. Verification email is sent.
5. User can log in immediately; recovery requires a verified email.

### 4.2 Add or change email

1. Account → Email section.
2. User enters a new email.
3. Server creates an email-verification token and sends a link to the new
   address.
4. Current email remains active until the new address is verified.
5. On verification:
   - update `users.email`
   - set `email_verified_at`
   - invalidate the token
   - notify the old email (optional but recommended)

### 4.3 Forgot password

1. User opens `/forgot-password`, enters email.
2. Server always returns the same generic response.
3. If a matching account has a **verified** email, create a reset token and send
   a link via Resend.
4. Link opens `/reset-password?token=...`.
5. User submits a new password.
6. Server:
   - validates the token hash, expiry and unused state
   - updates `password_hash` with scrypt
   - marks the token used
   - revokes **all** sessions
   - sends a confirmation email
7. User logs in with the new password.

### 4.4 Change password (logged in)

1. Account → Security.
2. User enters current password + new password.
3. Server verifies current password.
4. Updates the hash.
5. Revokes all **other** sessions and issues a fresh session for the current
   device.

### 4.5 Sessions

1. Account → Sessions lists active sessions:
   - created
   - last seen
   - user agent
   - IP (truncated)
   - current flag
3. User can revoke a single session.
4. “Logout all devices” revokes every session and clears the cookie.

---

## 5. Data model and migrations

### 5.1 Migration `005_account_recovery.sql`

```sql
ALTER TABLE users ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN email_verified_at TEXT DEFAULT '';

-- Partial unique index: multiple accounts may have no email yet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users(email) WHERE email <> '';

CREATE TABLE IF NOT EXISTS email_verifications (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT '',
  requested_ip TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT '',
  requested_ip TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON password_resets(user_id);
```

### 5.2 Schema baseline

Update `schema.sql` with the same columns/tables so fresh databases match
migrated databases.

### 5.3 Token storage

- Generate 32 random bytes, base64url encode.
- Store only `HMAC-SHA256(SESSION_SECRET, token)` in `id_hash`.
- Never store or log the raw token.
- Email links contain the raw token.
- Single-use; mark `used_at` when consumed.
- Expire verification tokens after 24 hours.
- Expire reset tokens after 20 minutes.
- Invalidate previous unused tokens for the same user when issuing a new one.

### 5.4 Session listing

Reuse `sessions.id_hash` as the public session identifier for list/revoke.
It is a hash of a random 256-bit token and is not usable as a credential.
Add `current: true` when the request cookie hashes to that row.

---

## 6. API design

### 6.1 Auth

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Accept email; create user + session; send verification |
| POST | `/api/auth/login` | public | Unchanged; return email verification state |
| GET | `/api/auth/me` | session | Include email + `email_verified_at` |
| POST | `/api/auth/logout` | optional | Revoke current session |
| POST | `/api/auth/logout-all` | session | Revoke all sessions |
| POST | `/api/auth/verify-email` | public | Consume verification token |
| POST | `/api/auth/forgot-password` | public | Generic response; send reset link if eligible |
| POST | `/api/auth/reset-password` | public | Consume reset token; update password; revoke all sessions |
| GET | `/api/auth/verify-email/validate` | public | Optional pre-check for the verification page |

### 6.2 Account

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/account` | session | Profile: username, full name, email, verified state |
| PUT | `/api/account/email` | session | Request email change; send verification |
| POST | `/api/account/change-password` | session | Verify current password; update; revoke other sessions |
| GET | `/api/account/sessions` | session | List active sessions |
| DELETE | `/api/account/sessions/:idHash` | session | Revoke one session (only own) |

### 6.3 Response rules

- Recovery endpoints always return a generic success response, even for unknown
  emails:
  `{ "success": true, "message": "If an account exists, a reset link was sent." }`
- Never return whether an email exists.
- 400 for invalid input; 429 for rate limit; 500 only for server faults.
- Use the existing `classifyError` helper for safe messages.

---

## 7. Resend integration

### 7.1 Environment

Add canonical server-side variables:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Bashe Dairy Farm <no-reply@yourdomain.com>
APP_URL=https://your-app.example.com
```

Update `api/_env.js`, `.env.example`, `README.md`, `scripts/check-env.js`, and
Vercel.

### 7.2 Email helper

Create `api/_email.js`:

```js
import { envValue } from './_env.js'

export async function sendEmail({ to, subject, html, text }) {
  const key = envValue('RESEND_API_KEY')
  const from = envValue('RESEND_FROM_EMAIL')
  if (!key || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured')
    }
    console.log(`[email:dev] to=${to} subject=${subject}`)
    return { id: 'dev' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return res.json()
}
```

### 7.3 Templates

- Verify email (24h link)
- Reset password (20 min link)
- Password changed confirmation
- Email changed notification to the old address

Keep templates plain HTML with a text fallback. Include expiry and “ignore if
you did not request this”. Do not include passwords.

### 7.4 Deliverability

- Verify the sending domain in Resend.
- Use a stable `from` address.
- Test with a real mailbox on staging.
- Handle Resend failures without leaking details to the client; log server-side.

---

## 8. Rate limiting

Add basic DB-backed rate limiting for recovery endpoints:

```sql
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
```

Rules:

- Forgot password: 3 requests / hour / email, 10 / hour / IP.
- Verify email resend: 3 / hour / user.
- Reset submit: 10 attempts / hour / IP.
- Registration: 5 / hour / IP (optional).
- Transactionally increment the counter; return 429 when exceeded.

Alternatively, count recent rows in `password_resets` / `email_verifications`
for a simpler first version, but a dedicated table is clearer.

---

## 9. Frontend plan

### 9.1 Routes

| Path | Page | Auth |
| --- | --- | --- |
| `/account` | `AccountPage.vue` | required |
| `/forgot-password` | `ForgotPasswordPage.vue` | public |
| `/reset-password` | `ResetPasswordPage.vue` | public |
| `/verify-email` | `VerifyEmailPage.vue` | public |

### 9.2 Login page

- Add “Forgot password?” link.
- Keep registration form; add email field.

### 9.3 Dashboard

- Add an Account link/button in the header.

### 9.4 Account page sections

1. **Profile**
   - username (read-only)
   - full name (optional editable)
   - email + verified badge
   - change-email form
2. **Security**
   - change password (current + new + confirm)
   - logout all devices
3. **Sessions**
   - list with created/last seen/device/IP
   - revoke button per session
   - current session marked

### 9.5 Client API helpers

Extend `src/db/turso.ts` or add `src/db/account.ts`:

- `getAccount()`
- `requestEmailChange(email)`
- `verifyEmail(token)`
- `forgotPassword(email)`
- `resetPassword(token, password)`
- `changePassword(currentPassword, newPassword)`
- `listSessions()`
- `revokeSession(idHash)`

Handle `ApiError` messages directly for 4xx/5xx as already done for auth.

---

## 10. Security requirements

- Password reset tokens: 32 random bytes, hashed at rest, single use, short TTL.
- Password change/reset revokes sessions.
- Generic responses for unknown emails.
- Rate limiting on all recovery endpoints.
- Email verification before recovery.
- HTTPS only; `APP_URL` must be HTTPS in production.
- Reset page: `Referrer-Policy: no-referrer`.
- Never log raw tokens, passwords, or full reset URLs.
- Do not return email existence, user IDs, or internal errors.
- Validate email format and normalize to lowercase.
- Enforce a minimum password length of 8 (recommended; current minimum is 6).
- Consider an Origin/CSRF check for cookie-authenticated account mutations.
- Keep `SESSION_SECRET` private; use it to HMAC token hashes.

---

## 11. Implementation phases

### Phase 1 — Schema and environment

1. Add `005_account_recovery.sql` and update `schema.sql`.
2. Add `email`, `email_verified_at`, verification/reset tables, rate-limit table.
3. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` to `_env.js`,
   `.env.example`, `check-env`, README.
4. Run local migration twice; verify idempotency.

**Acceptance:** fresh DB and migrated DB match; `npm run check:env` passes.

### Phase 2 — Email helper and tokens

1. Add `api/_email.js`.
2. Add token helpers in `api/_auth.js` or `api/_tokens.js`:
   - generate/hash/consume
   - verify/expire
   - rate-limit helpers
3. Unit-test token creation, hashing, expiry, reuse.

**Acceptance:** raw tokens are never stored; expired/used tokens fail.

### Phase 3 — Account API

1. Add `GET /api/account`.
2. Add `PUT /api/account/email`.
3. Add `POST /api/account/change-password`.
4. Add `GET /api/account/sessions`.
5. Add `DELETE /api/account/sessions/:idHash`.
6. Update `/api/auth/me` to include email state.

**Acceptance:** session list marks current; revoke only own sessions; password
change revokes other sessions.

### Phase 4 — Registration and verification

1. Accept email at registration.
2. Send verification email.
3. Add `POST /api/auth/verify-email`.
4. Add verification page.
5. Handle existing users without email (prompt on account page).

**Acceptance:** verified email updates `email_verified_at`; token is single use.

### Phase 5 — Forgot/reset flow

1. Add `POST /api/auth/forgot-password`.
2. Add `POST /api/auth/reset-password`.
3. Add forgot/reset pages and login link.
4. Add rate limiting.
5. Send confirmation email after reset.
6. Revoke all sessions after reset.

**Acceptance:** full flow works; unknown emails get generic response; reused and
expired tokens fail; sessions are revoked.

### Phase 6 — Verification and deployment

1. Local integration tests with a file DB.
2. Mock Resend; then test one real email on staging.
3. `npm run typecheck` and `npm run build`.
4. Apply migrations to production.
5. Deploy and verify `/api/health`, registration, verification, reset.
6. Document rollback.

**Acceptance:** all checks pass; account and recovery flows work in production.

---

## 12. Test matrix

- Register with email → verification email sent.
- Verify valid token → email verified.
- Verify expired token → 400.
- Verify reused token → 400.
- Forgot password for known verified email → email sent, generic response.
- Forgot password for unknown email → same generic response, no email.
- Reset with valid token → password changes, all sessions revoked.
- Reset with expired/reused token → 400.
- Change password with wrong current password → 400.
- Change password → other sessions revoked, current session remains valid.
- Session list → shows current session, others; revoke one.
- Revoke another user’s session ID → 404/403.
- Rate limit → 429 after threshold.
- Existing user without email → recovery unavailable with clear message.
- Email change → old email remains active until verification.
- Build/typecheck pass.

---

## 13. Deployment and rollback

Order:

1. Backup database.
2. Apply `005_account_recovery.sql` (and baseline) with `npm run db:migrate`.
3. Set Resend and `APP_URL` env vars in Vercel.
4. Deploy.
5. Verify `/api/health` and `sessionsReady`.
6. Test registration and a full reset on staging.
7. Announce that existing sessions remain valid; only reset/change-password
   revokes them.

Rollback:

- The migration is additive; leave the tables in place on rollback.
- Revert the application commit if needed.
- Reset tokens can be invalidated by deleting rows or rotating
  `SESSION_SECRET`.
- Never deploy code that requires `email` before the migration is applied.

---

## 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Email enumeration | Generic responses for all recovery requests |
| Token leakage in logs/Referer | Hash at rest, no logging, `no-referrer` |
| Brute-force / email bombing | DB-backed rate limits |
| Existing users lack email | Account page prompt + admin reset fallback |
| Resend failure | Log server-side; return generic success; retry later |
| Session theft | Random IDs, hashed storage, revocation, HTTPS |
| Migration missing in production | `/api/health` checks tables; fail with clear migration message |
| Shared DB with other apps | Only add our tables/columns; do not alter unrelated tables |

---

## 15. Open decisions

1. Require email at registration? **Recommended: yes for new accounts.**
2. Require email verification before login? **Recommended: no; require it for
   recovery.**
3. Minimum password length: 8 or keep 6? **Recommended: 8.**
4. Session identifier in the UI: use `sessions.id_hash`. **Recommended: yes.**
5. Admin/manual reset for users without email: build a CLI script or use Turso
   shell? **Recommended: add a small `scripts/reset-password.js` later.**

---

## 16. Temporary files

All scratch, debug, generated, or test artifacts must go in:

```text
./.tmp/
```

`.tmp/` is git-ignored. Do not create ad-hoc temp files in the repo root, `src/`,
`api/`, or `docs/`. The plan itself lives in `docs/plans/` and is tracked.

---

## 17. File map

```
docs/plans/account-password-recovery.md   this plan
migrations/005_account_recovery.sql       schema migration
schema.sql                                baseline schema update
api/_env.js                               RESEND/APP_URL canonical names
api/_email.js                             Resend wrapper
api/_auth.js                              token helpers / session helpers
api/auth/register.js                      email capture + verification email
api/auth/me.js                            include email state
api/auth/verify-email.js                  verify email token
api/auth/forgot-password.js               request reset
api/auth/reset-password.js                consume reset
api/account/index.js                      profile GET
api/account/email.js                      request email change
api/account/change-password.js            password change
api/account/sessions/index.js             list sessions
api/account/sessions/[idHash].js          revoke session
src/views/AccountPage.vue                 account UI
src/views/ForgotPasswordPage.vue          forgot UI
src/views/ResetPasswordPage.vue           reset UI
src/views/VerifyEmailPage.vue             verify UI
src/db/account.ts                         client API helpers
src/router/index.ts                       routes
src/views/LoginPage.vue                   forgot link
src/views/DashboardPage.vue               account link
```
