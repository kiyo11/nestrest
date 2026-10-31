# NestRest test suite

Three layers, matching the decided stack:

| Layer | Tool | Location | Runner |
|---|---|---|---|
| Unit + component | Vitest + React Testing Library | `tests/unit/` | `npm test` |
| Integration | Playwright (request/API + direct service calls) against a REAL DB | `tests/integration/` | `npm run test:integration` |
| E2E | Playwright (browser) against a seeded DB + dev server | `tests/e2e/` | `npm run test:e2e` |

## Unit (no setup)

```bash
npm test              # vitest run
npm run test:watch    # watch mode
npm run test:coverage # + v8 coverage report (./coverage)
```

Unit tests set a deterministic `ENCRYPTION_KEY` in `tests/setup/vitest.setup.ts`.

## Integration & E2E — DANGER: never point at the shared Neon `dev` branch

These run against a REAL Postgres and **reset every table between tests** (`resetDb()`).
Use a throwaway database. Put its connection string in `.env.test` (gitignored):

```bash
# .env.test  — a disposable/local database ONLY
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestrest_test?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/nestrest_test?schema=public"
ENCRYPTION_KEY="<openssl rand -base64 32>"
AUTH_SECRET="<openssl rand -base64 32>"
# Leave RESEND_API_KEY unset so the dev mailer logs instead of sending.
```

### Option A — local Postgres via Docker

```bash
docker run --name nestrest-test -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nestrest_test -p 5432:5432 -d postgres:16
```

### Option B — a dedicated Neon branch (NOT `dev`)

Create a separate Neon branch (e.g. `test`) and use its pooled + direct URLs.

### Apply the schema once

```bash
dotenv -e .env.test -- npx prisma migrate deploy   # or: prisma db push
```

## Run integration

```bash
npm run test:integration
```

Covers: iCal sync upsert + soft-cancel + reactivation + owner-edit survival
(`ical-sync.spec.ts`, served from an in-process ICS fixture server — no network),
the dispatch exactly-once claim + SKIPPED/FAILED revert (`dispatch.spec.ts`),
and server-side task scoping / helper projection (`rbac-tasks.spec.ts`).

## Run e2e

```bash
# seed the test DB first
dotenv -e .env.test -- npm run db:seed
npm run test:e2e              # installs nothing; needs browsers:
npx playwright install chromium   # one-time
```

The Playwright `webServer` starts `next dev` on port 3100 and tees output to
`.playwright/dev.log`; the owner magic-link flow reads the sign-in URL from that
log (the dev mailer prints it to the console). Helper logs in with the seeded
password `helper@nestrest.dev` / `helper1234`.

## Environment notes for this checkout

- No Docker/`psql`/browser was available where the suite was authored, so
  integration and e2e were written but **not executed here**. Run them locally
  with the commands above. Unit tests run and pass with no setup.
