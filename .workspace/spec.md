# Feature: NestRest — Self-Hosted Short-Term-Rental Management (v1)

## Problem
A solo Airbnb host currently juggles the Airbnb app, a spreadsheet for payouts, texts to a cleaner, and manual copy-paste guest messages. Airbnb exposes no host API, so there is no single place that knows a booking's guest contact details, door code, cleaning status, and profitability. NestRest is a self-hosted web app that becomes the host's source of truth: it ingests Airbnb's read-only iCal feed (and optionally forwarded guest emails) and layers on everything Airbnb hides — guest contacts, notes, templated/scheduled messaging, turnover tasks, and dashboards. Built for one property today, modeled for many tomorrow.

## Assumptions (stated, not blocking)
- Single tenant deployment; owner self-hosts (Docker/Node). Low scale: 1 property, <500 bookings/year, <5 users.
- Platform: responsive web app (desktop for owner admin, mobile web for helper on-site). No native app in v1.
- Timezone: property-local; all guest-facing times rendered in that TZ.
- Email delivery via Resend (transactional). Gmail integration is optional/best-effort enrichment.

## Goals (in priority order)
1. One unified calendar reconciling Airbnb iCal reservations + manual owner blocks.
2. Authoritative booking records with detail view + activity timeline.
3. Templated + scheduled guest email with merge fields.
4. Auto-generated, assignable, mobile-friendly turnover tasks.
5. Owner dashboard (occupancy, revenue MTD, upcoming arrivals/departures, action items).
6. Auth with owner/helper roles.
7. Data model multi-property-ready from day one (every domain row carries `property_id`).

## Non-goals (v1)
- No real-time write-back to Airbnb (no pricing/availability push — Airbnb has no host API).
- No payment processing or payout collection; payout is a recorded number only.
- No income/expense P&L, guest CRM, reviews log, or multi-channel (Phase 2).
- No native mobile apps; no SMS; no AI message generation.
- No public booking/direct-booking website.

## User stories

### 1. Unified calendar
- As an owner, I want Airbnb reservations to appear on my calendar automatically so I never double-book.
- As an owner, I want to add manual blocks (maintenance, personal use) with a reason so the calendar reflects true availability.
- As an owner, I want month and week views so I can plan at different horizons.

### 2. Bookings
- As an owner, I want each reservation stored as an editable record (guest name, dates, payout, status, source) so Airbnb-missing data lives somewhere durable.
- As an owner, I want a booking detail view with an activity timeline (synced, emailed, task created, edited) so I have an audit trail.

### 3. Guest email
- As an owner, I want message templates with merge fields (guest first name, check-in/out dates, door code, wifi) so I send consistent messages fast.
- As an owner, I want to schedule automated messages relative to booking events (check-in instructions 24h before arrival; review request 6h after checkout) so routine comms run themselves.

### 4. Cleaning/turnover tasks
- As an owner, I want a turnover task auto-created on each checkout and assignable to a helper so cleaning never slips.
- As a helper, I want a mobile-friendly checklist I can tick off so the owner sees progress without calling me.

### 5. Dashboard
- As an owner, I want occupancy %, revenue MTD, upcoming check-ins/outs, and today's action items on one screen so I know the state of the business in 10 seconds.

### 6. Auth & roles
- As an owner, I want to invite a helper with a scoped role so they see only assigned tasks and the booking info needed to do them — not payouts or guest contact history beyond what's relevant.

## Acceptance criteria

### Calendar
- [ ] Given a configured Airbnb iCal URL, when the scheduled sync runs (default every 1h, configurable), then new/changed/cancelled reservations are reflected within one sync cycle.
- [ ] Given a sync, when an iCal event no longer appears in the feed, then the corresponding booking is marked `cancelled` (not hard-deleted) and flagged on the timeline.
- [ ] Given overlapping dates, when an owner creates a manual block over an existing reservation, then the UI warns of the conflict before saving.
- [ ] Given month view, when the owner switches to week view, then reservations and blocks render with source color-coding (Airbnb vs manual block).
- [ ] Given a failed sync (unreachable URL/malformed ICS), then the last-successful-sync timestamp and an error banner are shown; prior data is retained.

### Bookings
- [ ] Given a synced reservation, when I open its detail view, then I can edit guest contact fields, notes, and payout without those edits being overwritten by the next iCal sync.
- [ ] Given iCal provides only dates + an opaque reservation code (not guest identity), when a booking is created from sync, then guest name defaults to the Airbnb-provided summary/placeholder and is editable.
- [ ] Given a forwarded Airbnb guest email is parsed (if Gmail enabled), when it matches a booking by reservation code/date, then guest name/email enrich the record and an entry is added to the timeline; no match => queued for manual linking.
- [ ] Given any booking mutation (sync change, email sent, task created, manual edit), then a timestamped, actor-attributed entry appears in the activity timeline.
- [ ] Booking status is one of `confirmed | cancelled | completed`; source is one of `airbnb | manual`.

### Guest email
- [ ] Given a template with `{{guest_first_name}}`, `{{checkin_date}}`, `{{checkout_date}}`, `{{door_code}}`, `{{wifi}}`, when rendered for a booking, then all fields resolve; any unresolved field blocks send and is shown to the owner.
- [ ] Given a booking with a guest email, when the owner clicks send, then Resend delivers and the send is logged to the timeline with delivery status (sent/delivered/bounced via Resend webhook).
- [ ] Given a scheduled rule ("24h before check-in"), when the trigger time passes, then the email is sent once and only once (idempotent; de-dupe per booking+template).
- [ ] Given a booking with no guest email on file, when a scheduled send is due, then it is skipped and surfaced as a dashboard action item.
- [ ] Given scheduled sends, when check-in/out dates change via sync, then pending (not-yet-sent) schedules recompute to the new dates.

### Cleaning/turnover tasks
- [ ] Given a booking checkout date, when the booking is confirmed, then a turnover task is auto-created due on the checkout date.
- [ ] Given a checkout date changes via sync, when the task is still open, then its due date updates automatically.
- [ ] Given an owner assigns a task to a helper, when the helper logs in, then that task appears in their task list.
- [ ] Given a helper on mobile, when they tick checklist items and mark complete, then status syncs and the owner's dashboard reflects completion; task state is one of `todo | in_progress | done`.
- [ ] Given a helper viewing a turnover task, then they see property address, access notes, checkout/next-checkin times, and checklist — but NOT payout or unrelated guest PII.

### Dashboard
- [ ] Given the current month, when the owner opens the dashboard, then occupancy % = booked nights / available nights MTD, and revenue MTD = sum of payouts for bookings with checkout in month, each rendering in P95 < 500ms for one property's dataset.
- [ ] Given today, then upcoming check-ins and check-outs for the next 7 days are listed, and "action items" include bookings missing guest email, overdue turnover tasks, and failed syncs.

### Auth & roles
- [ ] Given an owner invite, when a helper accepts and sets a password, then they receive the `helper` role.
- [ ] Given a `helper` session, when they attempt to access bookings list, payouts, dashboard financials, or settings, then they are denied (403 / hidden nav).
- [ ] Given any role, then sessions expire and passwords are stored hashed (argon2/bcrypt); guest PII is never exposed in URLs or logs.

## Best-in-class references
- Hospitable (Smartbnb): leader in scheduled/triggered guest messaging with event-relative rules and merge fields — the model we emulate for story 3.
- Guesty & Hostaway: "unified multi-calendar" reconciling channels via iCal/API and auto-generated cleaner tasks tied to checkouts — model for stories 1 and 4; we do the iCal-only subset.
- Lodgify: clean owner dashboard with occupancy/revenue KPIs and turnover assignment to cleaners — model for story 5.
- All four treat the PMS as source of truth and sync channels inbound; none of them (nor we) get a real host-facing Airbnb write API for individual hosts.

## Non-functional requirements
- Mobile-responsive: helper flows (task list, checklist) usable on a 360px-wide phone; owner admin usable on tablet/desktop.
- Accessible: WCAG 2.1 AA — keyboard navigable, labeled form controls, sufficient contrast, calendar operable without a mouse.
- Security/PII: guest contact data encrypted at rest; TLS in transit; role-scoped access enforced server-side (not just UI hiding); secrets (Resend key, Gmail OAuth tokens, iCal URLs) stored encrypted; audit timeline for data changes.
- Reliability: iCal sync is retried with backoff; a failed sync never destroys existing booking data.
- Deployability: self-hostable via single Docker Compose (app + Postgres); config via env vars.

## Out-of-scope / known limitations
- No real-time Airbnb write-back: availability, pricing, and messages inside Airbnb are not controlled by NestRest.
- iCal carries only dates + an opaque reservation code, NOT guest name/email/phone — guest identity must come from manual entry or optional Gmail email parsing, and may be absent.
- Sync latency equals the polling interval; bookings are not instantaneous.
- Gmail parsing is best-effort and brittle to Airbnb email-format changes; failures degrade to manual linking, never block core flow.
- Resend delivery status depends on webhook configuration; without it, status caps at "sent".

## Open questions (for Architect/Engineer)
1. Scheduler mechanism for timed emails — cron-style worker vs. durable job queue (idempotency + recompute-on-date-change is the hard part).
2. Gmail integration shape — OAuth inbox read + filter vs. a dedicated forwarding address + inbound parse webhook. Which is less fragile?
3. Reservation matching key when enriching from email — Airbnb confirmation code reliability across iCal `UID` and email body.
4. Occupancy denominator when manual blocks exist — do personal/maintenance blocks reduce "available nights" or count as unavailable? Needs a product rule.
5. Multi-property readiness: confirm every table carries `property_id` and all queries are property-scoped now, even though UI exposes a single property in v1.

---
## Phase 2 (brief, not detailed)
- Income/expense tracking + P&L reporting per property.
- Guest CRM: repeat-guest history, tags, blocklist.
- Reviews log (manual entry; capture ratings/response drafts).
- Multi-property + multi-channel: additional iCal feeds (VRBO, Booking.com), per-property dashboards, property switcher.
