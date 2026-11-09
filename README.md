# Bashe Dairy Farm — Cow Card

Offline-first dairy herd record app built with Vue 3, TypeScript and Vite.
Records live in IndexedDB (Dexie) and sync to Turso when online.

## Features

- Cow registration with a 5-step form and photo cropping
- Daily milk, health and treatment recording
- Printable A4 cow, bull, calf and milking/pregnant cards (PDF + browser print)
- CSV / PDF / JSON exports and herd summary
- Vet Space: visits, incidents, treatments, vaccinations and lameness assessments
- Offline-first sync with automatic retry when the connection returns

## Setup

```bash
npm install
cp .env.example .env   # fill in Turso, SESSION_SECRET and ImgBB
npm run db:migrate     # apply schema/migrations to Turso
```

For full-stack local development (API + frontend):

```bash
npx vercel dev
```

`npm run dev` starts the Vite frontend only. Login and sync require the
`/api` functions, so use `vercel dev` or point `VITE_API_URL` at a deployed
API. Local records still work offline in IndexedDB.

## Database

The schema is an idempotent baseline. Use either option:

**Fresh database**

```bash
turso db shell <database-name> < schema.sql
```

**Existing database / repeatable upgrades**

```bash
npm run db:migrate
```

The migration runner:

1. creates/updates the baseline schema (`schema.sql`);
2. applies files in `migrations/` in order, recording them in `schema_migrations`;
3. backfills legacy columns (`pen_barn_no` → `barn_name`, `bull_name` → `sire_id`);
4. normalises `category` from sex and fills `updated_at` from `created_at`.

It is safe to run repeatedly. To test locally without Turso:

```bash
node scripts/migrate.js file:/tmp/cow-card.db
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run typecheck` | Type-check only |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview the production build |
| `npm run db:migrate` | Apply schema + migrations to Turso |

## Architecture

- `src/db/dexie.ts` — local IndexedDB tables
- `src/db/turso.ts` — Turso read/write helpers (currently called from the browser)
- `src/utils/sync.ts` — push/pull sync
- `src/cards/registry.ts` — card type resolution and layout
- `src/utils/renderCard.ts` — shared Vue → canvas → PDF renderer
- `src/components/cards/*` — card templates (single source of truth)
- `schema.sql` / `migrations/` / `scripts/migrate.js` — database schema

## Environment variables

Use these exact names in `.env` and Vercel:

| Variable | Used by | Notes |
| --- | --- | --- |
| `TURSO_URL` | API, migrations | Turso database URL |
| `TURSO_AUTH_TOKEN` | API, migrations | Turso database token |
| `SESSION_SECRET` | API sessions | Long random string |
| `IMGBB_API_KEY` | API upload proxy | ImgBB API key |
| `RESEND_API_KEY` | API email | Resend API key |
| `RESEND_FROM_EMAIL` | API email | Verified sender address |
| `APP_URL` | API email links | Public app URL |
| `VITE_API_URL` | Client API base | Defaults to `/api` |
| `VITE_APP_URL` | QR code target URL | Defaults to the current origin |

`VITE_` values are embedded in the client bundle and must never contain secrets.

Run `npm run check:env` to validate the local `.env` names.

## Security

Turso and ImgBB credentials are server-side only (`api/` functions). The
browser talks to `/api`, never directly to the database:

- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/logout-all`, `GET /api/auth/me`
- `POST /api/sync/push`, `GET /api/sync/pull`
- `GET /api/account`, `PUT /api/account/email`, `POST /api/account/change-password`
- `GET /api/account/sessions`, `DELETE /api/account/sessions/:idHash`
- `POST /api/account/resend-verification`
- `POST /api/auth/verify-email`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- `GET /api/cows/public/:id` — limited public card data used by QR codes
- `POST /api/upload` — authenticated ImgBB proxy

Passwords are hashed with scrypt. Sessions use random 256-bit IDs stored hashed in the `sessions` table, with expiry, revocation and per-device logout (including logout-all). The cookie is HttpOnly, SameSite=Lax and Secure in production.
The QR code on printed cards points at the limited public page, not the full
medical record.
