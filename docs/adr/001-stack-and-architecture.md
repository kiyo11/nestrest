# ADR 001: Stack and Architecture

- Status: Accepted
- Date: 2026-10-30
- Deciders: Architect (for solo-host NestRest v1)

## Context
NestRest is a self-hosted short-term-rental PMS for a solo Airbnb host: unified
calendar, authoritative booking records, templated/scheduled guest email,
turnover tasks, owner dashboard, and owner/helper roles. Scale is tiny
(1 property, <500 bookings/yr, <5 users) but the data model must be
multi-property-ready. Everything must run on free tiers with minimal ops.

## Decision
Build a single full-stack **Next.js 15 App Router (TypeScript)** application
deployed to **Vercel**, with:
- **Tailwind CSS + shadcn/ui** for accessible UI.
- **Neon serverless Postgres** via **Prisma** for persistence.
- **Auth.js (NextAuth)** for auth with OWNER/HELPER roles (magic-link primary,
  Google optional).
- **Resend + React Email** for transactional guest email with delivery webhooks.
- **Vercel Cron** for scheduled jobs (iCal sync + email dispatch), using a
  DB-row queue with per-booking+template idempotency instead of a separate
  queue service.

Server-side RBAC is mandatory (`lib/rbac.ts`): every server action and route
checks role and scopes all queries by `property_id`. Guest PII is encrypted at
the application layer (AES-256-GCM).

## Why Postgres over NoSQL
The domain is intrinsically **relational and transactional**:
- Strong entity relationships (Property→Booking→Guest/Task/ScheduledMessage/
  Activity) with foreign keys and cascade semantics.
- Correctness-critical invariants: exactly-once scheduled sends rely on a
  **unique constraint** (`dedupeKey`) + conditional state transition in a
  transaction — trivial in Postgres, awkward in eventually-consistent NoSQL.
- Aggregate queries for the dashboard (occupancy %, revenue MTD) are natural
  SQL `GROUP BY`/date-range sums; `P95 < 500ms` is easy at this scale.
- Multi-property scoping is a simple indexed `property_id` filter.
- Prisma gives typed migrations and schema evolution for Phase 2 (P&L, CRM,
  multi-channel) without rework.
NoSQL would buy horizontal scale we do not need while costing us joins,
constraints, and transactional guarantees we rely on heavily.

## Consequences
- Single Vercel deploy keeps ops near-zero and fits free tiers; the spec's
  Docker Compose self-host goal is **deferred** (not v1). Revisit if true
  self-hosting is required — the Next.js + Postgres core is portable.
- Serverless requires Neon pooled connections + a Prisma client singleton and
  short-lived cron handlers.
- Vercel Cron granularity (minutes) is acceptable because sends are
  hour-relative and idempotent.
- App-layer PII encryption adds a key-management responsibility
  (`ENCRYPTION_KEY`) and means encrypted columns are not queryable.
