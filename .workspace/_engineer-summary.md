# Engineer summary — NestRest MVP

Branch: `feat/mvp`. Build, lint, typecheck all pass. Schema migrated + seeded on
the Neon dev branch.

## Delivered (phases 1–6)
- **Scaffold:** Next.js 15 App Router + TS strict, Tailwind with full ui-spec
  tokens (success/warning/info/airbnb/manual), Geist fonts, ESLint + Prettier,
  shadcn-style primitives, route groups `(owner)`/`(helper)`, `.env.example`, README.
- **Data layer:** complete Prisma schema (every domain table + Auth.js models,
  `propertyId` everywhere), baseline migration, seed, AES-256-GCM PII crypto.
- **Auth & RBAC:** Auth.js v5 (magic-link console transport, helper credentials,
  optional Google), role in session, `requireRole`/`scopeToProperty`, guarded
  layouts, helper projection (no payout/PII).
- **Dashboard:** occupancy %, revenue MTD, 7-day check-ins, open/overdue tasks,
  action items, next-7-days list.
- **Calendar:** month view, Airbnb-coral vs manual-violet chips, prev/next nav,
  create block with live conflict warning + save-anyway, sync-error banner.
- **Bookings:** data table + detail with editable owner fields (survive sync) and
  activity timeline.
- **iCal sync:** `ical-sync` service (UID upsert, soft-cancel, edits preserved,
  recompute schedules + task due dates), hourly cron, manual "Sync now".
- **Messaging:** templates CRUD + triggers, composer with live merge preview +
  unresolved-field blocking, send-now, scheduled engine + 15-min dispatch cron
  (idempotent), Resend webhook.
- **Tasks:** owner kanban (assign, status, progress), auto-create on checkout,
  due-date follows sync; helper mobile checklist with optimistic ticking + complete.

## Deferred / needs real keys
- Gmail enrichment, `/invite/[token]` set-password screen, React Email components,
  week-view calendar + keyboard roving-tabindex, global `cmd+k`, dark-mode toggle,
  Playwright/Vitest suites (markers left).
- Real **RESEND_API_KEY** needed for actual email send (dev logs to console).
- **DATABASE_URL/DIRECT_URL** already wired to the Neon dev branch.

## Where QE should look hardest
- `lib/services/dispatch.ts` exactly-once claim + revert path.
- `lib/services/ical-sync.ts` "owner edits survive sync" + soft-cancel.
- `lib/rbac.ts` + helper projection in `(helper)/*` and `actions/tasks.ts`
  (helper may only touch own tasks).
- `lib/crypto.ts` key handling; verify no PII in `ActivityLog.message` or URLs.
