# NestRest

Self-hosted short-term-rental management for a solo Airbnb host: one unified
calendar (Airbnb iCal + manual blocks), authoritative booking records with an
activity timeline, templated + scheduled guest email, auto-generated turnover
tasks, an owner dashboard, and owner/helper roles.

> Stack is LOCKED (see `docs/adr/001-stack-and-architecture.md`): Next.js 15
> (App Router) + TypeScript, Tailwind + shadcn-style UI, Prisma + Neon Postgres,
> Auth.js v5, Resend + React Email, Vercel Cron. Deploy target is **Vercel + Neon**.

## Prerequisites

- Node.js 18+ (developed on 24)
- A Neon Postgres database (pooled `DATABASE_URL` + direct `DIRECT_URL`)
- Optional: a Resend API key (email send is logged to the console without one)

## Setup

```bash
npm install
cp .env.example .env.local          # then fill in the values (see below)
npx prisma generate
npx prisma migrate deploy           # apply migrations to your DB
npm run db:seed                     # load demo property, bookings, tasks, templates
npm run dev                         # http://localhost:3000
```

### Environment variables (`.env.local`)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection (app runtime; `pgbouncer=true`) |
| `DIRECT_URL` | Neon **direct** connection (Prisma migrations) |
| `AUTH_SECRET` | Auth.js session/JWT secret (`openssl rand -base64 32`) |
| `AUTH_URL` / `NEXTAUTH_URL` | App origin, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth for owner |
| `RESEND_API_KEY` | Transactional email; omit in dev to log instead of send |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend delivery webhooks |
| `EMAIL_FROM` | From address, e.g. `NestRest <noreply@yourdomain.com>` |
| `ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM PII encryption |
| `CRON_SECRET` | Bearer token validating Vercel Cron calls |

### Demo logins (after seeding)

- Owner (magic link): `owner@nestrest.dev` — the sign-in link is printed to the
  server console in dev.
- Helper (password): `helper@nestrest.dev` / `helper1234`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed demo data |
| `npm run prisma:migrate` | Create/apply a dev migration |

## Scheduled jobs (Vercel Cron)

`vercel.json` registers two handlers (both check `Authorization: Bearer $CRON_SECRET`):

- `GET /api/cron/ical-sync` — hourly. Fetches each property's Airbnb iCal feed,
  upserts bookings by VEVENT `UID`, soft-cancels vanished reservations, and only
  writes sync-owned fields so owner edits survive.
- `GET /api/cron/dispatch-email` — every 15 min. Fires due `ScheduledMessage`
  rows exactly once (unique `dedupeKey` + conditional `WHERE state=PENDING`
  claim), skipping bookings with no guest email.

Trigger locally (dev skips the auth check when `CRON_SECRET` is unset):

```bash
curl http://localhost:3000/api/cron/ical-sync
curl http://localhost:3000/api/cron/dispatch-email
```

`POST /api/webhooks/resend` records delivery/bounce status back onto messages.

## Deployment & CI

Production is deployed by **Vercel's native Git integration** — not by GitHub
Actions. Vercel builds and deploys `main` to production on every push, and
builds a preview deploy for each pull request. GitHub Actions is used for
**verification only** (see `.github/workflows/ci.yml`).

### Import to Vercel

1. Vercel dashboard → **New Project** → import `kiyo11/nestrest`.
2. Framework is auto-detected as **Next.js** (build `npm run build`, output
   handled automatically). No overrides needed.
3. Add the environment variables below (Production + Preview), then deploy.

### Vercel environment variables

Pulled from `.env.example` (authoritative). Set all for Production; mirror the
non-prod-specific ones for Preview:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection (app runtime) |
| `DIRECT_URL` | Neon **direct** connection (Prisma migrations) |
| `AUTH_SECRET` | Auth.js session/JWT secret (`openssl rand -base64 32`) |
| `AUTH_URL` / `NEXTAUTH_URL` | Deployed app origin (e.g. `https://your-app.vercel.app`) |
| `ENCRYPTION_KEY` | AES-256-GCM PII key, 32 bytes base64 (`openssl rand -base64 32`) |
| `CRON_SECRET` | Validates Vercel Cron calls (`Authorization: Bearer`) |
| `EMAIL_FROM` | From address, e.g. `NestRest <noreply@yourdomain.com>` |
| `RESEND_API_KEY` | Resend transactional email |
| `RESEND_WEBHOOK_SECRET` | Svix signing secret for Resend webhooks (required in prod) |

Optional: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for owner Google OAuth.

### Vercel Cron

`vercel.json` registers the two cron routes (`/api/cron/ical-sync` hourly,
`/api/cron/dispatch-email` every 15 min). Both are protected by `CRON_SECRET`
and fail closed in production if it is unset. No GitHub Actions involvement.

### GitHub Actions workflows

- **`ci.yml`** — runs on every PR and push to `main`: lint + typecheck, unit
  tests (Vitest, no DB), `next build`, and integration tests against an
  ephemeral `postgres:16` service container. Passes with **no repo secrets**.
  The e2e job is best-effort (`continue-on-error`).
- **`neon-pr-branch.yml`** *(optional)* — isolated Neon DB branch per PR.
  No-ops until you add secrets `NEON_API_KEY` and `NEON_PROJECT_ID`.
- **`migrate-production.yml`** — runs `prisma migrate deploy` against prod after
  merge to `main`. No-ops until you add secret `PRODUCTION_DATABASE_URL`.

See [`.github/SECRETS.md`](.github/SECRETS.md) for the full secret inventory.

## Architecture notes

- **RBAC** (`src/lib/rbac.ts`): `requireRole` + `scopeToProperty` enforced in
  server actions and route-group layouts. Helper reads use a projection that
  never selects payout or guest PII.
- **PII encryption** (`src/lib/crypto.ts`): AES-256-GCM for guest name/email/
  phone/notes and property iCal URL / door code. Decrypted only in owner reads.
- **Multi-property ready**: every domain row carries `propertyId`; v1 UI shows a
  single property.
