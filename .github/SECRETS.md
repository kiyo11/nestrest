# Secrets & environment inventory

Where every secret lives and why. **Never commit real values** — `.env*` files
(except `.env.example`) are gitignored. Use `openssl rand -base64 32` for the
random ones.

## Vercel environment variables (app runtime)

Set these in the Vercel project (Settings → Environment Variables), for
Production and Preview.

| Variable | Where | Why |
|---|---|---|
| `DATABASE_URL` | Vercel env | Neon pooled connection used by the running app |
| `DIRECT_URL` | Vercel env | Neon direct connection for Prisma migrations |
| `AUTH_SECRET` | Vercel env | Auth.js v5 session/JWT signing |
| `AUTH_URL` | Vercel env | Auth.js app origin |
| `NEXTAUTH_URL` | Vercel env | NextAuth compatibility origin |
| `ENCRYPTION_KEY` | Vercel env | AES-256-GCM key for PII (32 bytes base64) |
| `CRON_SECRET` | Vercel env | Authorizes Vercel Cron calls to `/api/cron/*` |
| `EMAIL_FROM` | Vercel env | From address for transactional email |
| `RESEND_API_KEY` | Vercel env | Resend API access for sending email |
| `RESEND_WEBHOOK_SECRET` | Vercel env | Verifies Resend delivery webhooks (required in prod) |
| `GOOGLE_CLIENT_ID` *(optional)* | Vercel env | Owner Google OAuth |
| `GOOGLE_CLIENT_SECRET` *(optional)* | Vercel env | Owner Google OAuth |

## GitHub Actions secrets (CI/CD)

Set in the GitHub repo (Settings → Secrets and variables → Actions). All are
**optional** — the workflows that use them are gated and no-op when absent.

| Secret | Where | Enables / why |
|---|---|---|
| `NEON_API_KEY` | GitHub Actions secret | `neon-pr-branch.yml` — create/delete a Neon branch per PR |
| `NEON_PROJECT_ID` | GitHub Actions secret | `neon-pr-branch.yml` — target Neon project |
| `PRODUCTION_DATABASE_URL` | GitHub Actions secret | `migrate-production.yml` — `prisma migrate deploy` against prod (use the Neon **direct** URL) |

## Notes

- `ci.yml` needs **no secrets**: it uses dummy build/test env vars and an
  ephemeral `postgres:16` service container for integration tests.
- Deployment itself uses **no GitHub secrets** — Vercel's Git integration holds
  its own credentials and env vars.
