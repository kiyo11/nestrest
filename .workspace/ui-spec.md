# UI Spec: NestRest — Short-Term-Rental Management

Stack (locked): Next.js (App Router) + Tailwind CSS + shadcn/ui + Radix + lucide-react.
Design north star: Linear / Vercel / Hospitable — calm, data-dense, high-contrast typography, restrained color used only to carry meaning. Mobile-first; helper flows must be excellent at 360px.

---

## 1. Design language

### Visual tone
- **Calm neutral canvas, one confident accent.** Accent is a deep teal/emerald ("nest") — warm-professional, not the default shadcn blue. Status colors (amber/red/green) are reserved strictly for state, never decoration.
- Surfaces are flat with hairline borders + very soft shadows (Vercel-style), not heavy Material elevation.
- Generous vertical rhythm, tight horizontal density in tables/calendar.
- Rounded but not pill: `--radius: 0.625rem` (10px) base.

### Color system — CSS variables (shadcn `hsl()` token convention)

Drop into `globals.css`. These override shadcn defaults; `--primary` is teal, not blue.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 18% 14%;          /* near-slate ink */
  --card: 0 0% 100%;
  --card-foreground: 222 18% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 18% 14%;

  --primary: 172 66% 32%;             /* teal-700 "nest" */
  --primary-foreground: 160 60% 97%;

  --secondary: 220 14% 96%;           /* slate-100 surface */
  --secondary-foreground: 222 18% 20%;

  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;     /* slate-500 */

  --accent: 172 60% 94%;              /* teal wash for hover/selected */
  --accent-foreground: 172 66% 24%;

  --destructive: 0 72% 48%;           /* red-600 */
  --destructive-foreground: 0 0% 100%;

  --border: 220 13% 91%;              /* slate-200 hairline */
  --input: 220 13% 91%;
  --ring: 172 66% 36%;                /* focus ring = teal */

  --radius: 0.625rem;

  /* Domain / status tokens (not in stock shadcn) */
  --success: 142 60% 38%;             /* green — delivered / done */
  --warning: 38 92% 50%;              /* amber — action needed / in_progress */
  --info: 221 83% 53%;                /* blue — informational sync */
  --source-airbnb: 350 80% 56%;       /* coral/rausch — Airbnb reservations */
  --source-manual: 262 52% 55%;       /* violet — manual owner blocks */

  --chart-1: 172 66% 40%;
  --chart-2: 38 92% 55%;
  --chart-3: 221 70% 56%;
}

.dark {
  --background: 222 24% 8%;           /* deep slate, not pure black */
  --foreground: 210 20% 92%;
  --card: 222 22% 11%;
  --card-foreground: 210 20% 92%;
  --popover: 222 22% 11%;
  --popover-foreground: 210 20% 92%;

  --primary: 172 60% 45%;             /* lift teal for dark bg */
  --primary-foreground: 222 30% 6%;

  --secondary: 222 16% 16%;
  --secondary-foreground: 210 20% 92%;

  --muted: 222 16% 16%;
  --muted-foreground: 220 10% 62%;

  --accent: 172 40% 20%;
  --accent-foreground: 172 60% 82%;

  --destructive: 0 62% 52%;
  --destructive-foreground: 0 0% 100%;

  --border: 222 14% 20%;
  --input: 222 14% 22%;
  --ring: 172 60% 50%;

  --success: 142 50% 48%;
  --warning: 38 90% 58%;
  --info: 217 85% 62%;
  --source-airbnb: 350 75% 62%;
  --source-manual: 262 55% 66%;
}
```

Expose the custom ones to Tailwind (in `tailwind.config.ts` `theme.extend.colors`): `success`, `warning`, `info`, `airbnb: 'hsl(var(--source-airbnb))'`, `manual: 'hsl(var(--source-manual))'`. Use each with an alpha for chip backgrounds (e.g. `bg-airbnb/10 text-airbnb border-airbnb/30`).

### Typography
- **Font:** Geist Sans (via `next/font`) body + UI; **Geist Mono** for door codes, reservation codes, payouts, timestamps. Fallback `ui-sans-serif, system-ui`.
- Scale (Tailwind):

| Token | Size / line | Use |
|---|---|---|
| Display | `text-3xl font-semibold tracking-tight` | Page title (dashboard greeting) |
| H1 | `text-2xl font-semibold tracking-tight` | Screen headers |
| H2 | `text-lg font-semibold` | Card/section headers |
| Body | `text-sm` (14px) | Default UI text |
| Small | `text-xs` | Metadata, table secondary, timestamps |
| KPI number | `text-3xl font-semibold tabular-nums tracking-tight` | Stat tiles |
| Mono | `font-mono text-sm` | Codes, money, dates in detail |

Default app text size is `text-sm` — dashboards read better at 14px. Always `tabular-nums` for money/occupancy.

### Spacing, radius, elevation
- Spacing scale: Tailwind defaults, primary rhythm `4 / 8 / 12 / 16 / 24 / 32`. Card padding `p-5` desktop, `p-4` mobile. Page gutter `px-4 md:px-6 lg:px-8`.
- Radius: cards/inputs `rounded-lg` (var), chips/badges `rounded-md`, avatars/toggles `rounded-full`.
- Elevation (soft, Vercel-like):
  - rest card: `border border-border` (no shadow)
  - raised/hover: `shadow-sm`
  - popover/dropdown/dialog: `shadow-md` + `border`
  - never use `shadow-lg`+ except toasts/command palette.

---

## 2. Information architecture & navigation

### Roles
- **Owner:** full app. Persistent left sidebar (desktop) + top bar.
- **Helper:** radically simplified. No sidebar; a single task-focused mobile view. Server-enforced scoping — nav items are not just hidden, routes 403 for helper.

### Owner layout (desktop ≥ lg)
```
┌───────────────┬──────────────────────────────────────────────┐
│  SIDEBAR 240px│  TOP BAR  56px                                 │
│               ├──────────────────────────────────────────────┤
│  ◆ NestRest   │  [property switcher ▾]   search    ⟳sync  ☾ ⌾ │
│               ├──────────────────────────────────────────────┤
│  ⌂ Dashboard  │                                                │
│  ▦ Calendar   │                                                │
│  ▤ Bookings   │              PAGE CONTENT                      │
│  ✉ Messages   │              (max-w-7xl, px-6/8)               │
│  ✓ Tasks      │                                                │
│  ⚙ Settings   │                                                │
│               │                                                │
│  ──────────   │                                                │
│  ⟳ last sync  │                                                │
│    2m ago     │                                                │
│  [JL] owner ▾ │                                                │
└───────────────┴──────────────────────────────────────────────┘
```
- Sidebar items: icon + label, active = `bg-accent text-accent-foreground` + 2px left accent bar. Collapsible to 64px icon-rail on `md`.
- Top bar: property switcher (single property v1, shows name; dropdown ready for multi), global search (`cmd+k`), manual **Sync now** button with spinner + relative "last synced" tooltip, dark-mode toggle, avatar menu.
- Sync health: if last sync failed, the sync control turns `warning` and a dismissible error banner shows under the top bar sitewide.

### Owner mobile (< md)
- Sidebar becomes a Sheet (hamburger in top bar). Bottom of content is comfortable-thumb. Tables collapse to stacked cards (see §4).

### Helper view (mobile-first, the primary target at 360px)
No sidebar, no financials, no nav to bookings/dashboard/settings.
```
┌──────────────────────────────┐
│  NestRest        [AM] helper ▾│  ← minimal top bar, 52px
├──────────────────────────────┤
│  Today · Wed Oct 30           │
│                               │
│  ┌──────────────────────────┐ │
│  │ 11:00  Turnover          │ │  ← task cards, large tap targets
│  │ 14 Maple St · Unit A     │ │
│  │ ● in progress  3/8       │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ 11:00  Turnover (todo)   │ │
│  └──────────────────────────┘ │
│                               │
│  [ Upcoming ▾ ]               │
└──────────────────────────────┘
```
Helper routes: `/helper` (task list) and `/helper/tasks/[id]` (checklist). That's it.

---

## 3. Screen-by-screen wireframes

### 3.1 Owner Dashboard  `/`
"State of the business in 10 seconds."
```
Good morning, Jess                         [ This month ▾ ]
────────────────────────────────────────────────────────────
┌ KPI ─────────┐┌ KPI ─────────┐┌ KPI ─────────┐┌ KPI ─────────┐
│ Occupancy    ││ Revenue MTD  ││ Check-ins 7d ││ Open tasks   │
│ 78%          ││ $4,250       ││ 3            ││ 2            │
│ ▲ 6% vs last ││ ▲ $300       ││ next: Thu    ││ 1 overdue    │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘

┌ Action items ──────────────────────────┐ ┌ Next 7 days ───────────┐
│ ⚠ 1 booking missing guest email  [Fix] │ │ Thu 31  ▸ check-in  Lee │
│ ⚠ Turnover overdue — 14 Maple   [View] │ │ Fri 01  ◂ check-out Kim │
│ ✖ iCal sync failed 2h ago       [Retry]│ │ Sat 02  ▸ check-in  Ray │
│ (empty → "You're all caught up ✓")      │ │  ... grouped by day     │
└─────────────────────────────────────────┘ └────────────────────────┘
```
- KPI tiles clickable → deep link (Occupancy→Calendar, Revenue→Bookings filtered, Check-ins→Calendar, Tasks→Tasks).
- Action items are the triage queue; each row has a one-click resolution. Severity icon color: red (sync fail), amber (missing email / overdue).
- Mobile: KPIs 2-col grid, then action items, then 7-day list stacked.

### 3.2 Calendar  `/calendar`
```
Calendar            [ Month | Week ]   ◂ October 2026 ▸   [ + Block ]
Legend:  ● Airbnb reservation   ● Manual block
┌────┬────┬────┬────┬────┬────┬────┐
│ Mon│ Tue│ Wed│ Thu│ Fri│ Sat│ Sun│
├────┼────┼────┼────┼────┼────┼────┤
│  1 │  2 │  3 │  4 │  5 │  6 │  7 │
│    │ ▇▇▇▇▇▇ Lee (Airbnb) ▇▇▇│    │  ← multi-day coral bar, rounded ends
│    │    │ ░░ Maintenance ░░  │    │  ← violet hatched bar = manual
├────┼────┼────┼────┼────┼────┼────┤
```
- Reservation chips: coral (`airbnb`), spanning bars with guest name + rounded continuation on span edges. Manual blocks: violet with diagonal-hatch bg + reason label.
- Week view: horizontal day columns with time context (check-in/out times), same color coding.
- Click a chip → booking detail side Sheet (desktop) / full page (mobile). Click empty day → create manual block dialog.
- **Conflict:** creating a block over a reservation → inline `destructive` warning in the dialog ("Overlaps Lee's reservation Oct 2–6") with Save-anyway confirm.
- Keyboard: arrow keys move day focus, `Enter` opens, `b` new block. Grid cells are `role="gridcell"` with `aria-selected`.
- Failed sync: amber banner above calendar "Last synced 2h ago — sync failed. Showing last known data. [Retry]".
- Mobile: month view compacts to dots-per-day; tapping a day opens a day agenda sheet listing that day's events as chips.

### 3.3 Bookings list  `/bookings` (owner only)
Data table.
```
Bookings                            search…   [ Status ▾ ][ Source ▾ ]
┌─────────────┬──────────┬──────────┬─────────┬──────────┬─────────┐
│ Guest       │ Check-in │ Checkout │ Nights  │ Payout   │ Status  │
├─────────────┼──────────┼──────────┼─────────┼──────────┼─────────┤
│ Lee M.   ⌁  │ Oct 31   │ Nov 04   │ 4       │ $680     │ ●Confirm│
│ (no email)⚠ │ Oct 28   │ Oct 31   │ 3       │ $510     │ ●Confirm│
│ Kim R.      │ Sep 20   │ Sep 24   │ 4       │ $720     │ ✓Complet│
│ Ray …    ⌁  │ —        │ —        │ —       │ —        │ ✖Cancel │
└─────────────┴──────────┴──────────┴─────────┴──────────┴─────────┘
```
- `⌁` = source Airbnb icon; missing-email rows show amber `⚠`. Money mono + tabular. Row click → detail. Sortable headers, sticky header, column filters via shadcn DataTable (TanStack).
- Mobile: each row becomes a card (guest + status badge top row, dates + payout below).

### 3.4 Booking detail  `/bookings/[id]`
```
◂ Bookings
Lee M.                    ●Confirmed  ⌁Airbnb    [ Email guest ] [ ⋯ ]
Reservation HMABCD1234  ·  Oct 31 → Nov 04 · 4 nights
──────────────────────────────────────────────────────────────────
┌ Details (editable) ──────────────┐ ┌ Activity timeline ──────────┐
│ Guest name   [ Lee M.         ]  │ │ ● now    Email sent (checkin)│
│ Email        [ lee@…          ]  │ │          delivered ✓         │
│ Phone        [ +1 …           ]  │ │ ● 2d ago Task created        │
│ Payout       [ $680           ]  │ │ ● 3d ago Synced from Airbnb  │
│ Door code    [ 4821           ]  │ │ ● 3d ago Booking created     │
│ Notes        [ …              ]  │ │  (actor-attributed, stamped) │
│              [ Save changes ]    │ │                              │
└──────────────────────────────────┘ └──────────────────────────────┘
```
- Edits here survive sync (banner note: "Your edits are protected from Airbnb sync").
- Timeline: vertical with colored node per event type (sync=info/blue, email=teal, task=warning, edit=muted). Delivery sub-status chips (sent/delivered/bounced).
- `⋯` menu: Create turnover task, Cancel booking (destructive confirm), View on Airbnb.
- Right-side Sheet variant when opened from calendar.

### 3.5 Messages  `/messages` (3 tabs: Compose · Templates · Scheduled)

**Compose**
```
Compose message                                  Booking: [ Lee M. ▾ ]
Template: [ Check-in instructions ▾ ]
┌ Editor ──────────────────────┐ ┌ Preview (rendered for Lee) ─────┐
│ Hi {{guest_first_name}},     │ │ Hi Lee,                         │
│ Your door code is {{door_    │ │ Your door code is 4821.         │
│ code}}. Check-in {{checkin}} │ │ Check-in Oct 31.                │
│                              │ │                                 │
│ merge chips: insert ▾        │ │ ⚠ {{wifi}} unresolved — blocks  │
└──────────────────────────────┘ │   send. [Fill in settings]      │
                                  └─────────────────────────────────┘
                              [ Send now ]  (disabled if unresolved)
```
- Unresolved merge fields render as amber inline pills in preview and disable Send with a reason tooltip.
- No guest email on file → Send replaced by "No email on file — add one" linking to booking.

**Templates manager**
```
Templates                                        [ + New template ]
┌──────────────────────┬─────────────────────┬──────────┐
│ Name                 │ Trigger             │          │
│ Check-in instructions│ 24h before check-in │ edit ⋯   │
│ Review request       │ 6h after checkout   │ edit ⋯   │
│ Welcome              │ manual              │ edit ⋯   │
└──────────────────────┴─────────────────────┴──────────┘
```
Editor = same split editor/preview; trigger config: [event ▾ (check-in/checkout)] [offset number] [before/after ▾].

**Scheduled view**
```
Scheduled messages                               [ Upcoming | Sent ]
┌ Upcoming ────────────────────────────────────────────────┐
│ Oct 30 18:00  Check-in instr → Lee M.   ⏱ scheduled  [✕] │
│ Nov 04 16:00  Review request  → Lee M.  ⏱ scheduled  [✕] │
│ Nov 01 09:00  Check-in instr → (no email) ⚠ will skip    │
└───────────────────────────────────────────────────────────┘
```
- "will skip" items mirror dashboard action items. Recompute-on-date-change shown via a subtle "rescheduled" note when dates sync.

### 3.6 Cleaning tasks — owner  `/tasks`
```
Turnover tasks                      [ All | Todo | In progress | Done ]
┌ Kanban or grouped list ─────────────────────────────────────────┐
│ TODO            │ IN PROGRESS        │ DONE                       │
│ ┌────────────┐  │ ┌───────────────┐  │ ┌───────────────┐         │
│ │ 14 Maple   │  │ │ 14 Maple      │  │ │ 14 Maple      │         │
│ │ due Oct 31 │  │ │ 3/8 ▓▓▓░░░░░   │  │ │ done Oct 24 ✓ │         │
│ │ ⚠ overdue  │  │ │ Assigned: Alex│  │ │ Alex          │         │
│ │ [Assign ▾] │  │ └───────────────┘  │ └───────────────┘         │
│ └────────────┘  │                    │                            │
└──────────────────────────────────────────────────────────────────┘
```
- Auto-created on confirmed checkout; due date = checkout, auto-updates on sync (show "due date updated" chip).
- Owner assigns helper via `[Assign ▾]`. Overdue = amber/red.
- Mobile: single column, status as filter tabs.

### 3.7 Helper mobile checklist  `/helper/tasks/[id]`
```
◂ Today
Turnover · 14 Maple St, Unit A
Checkout 11:00  →  Next check-in 15:00        ● in progress
─────────────────────────────────────────────
Access notes
  Lockbox code 4821, side door.
─────────────────────────────────────────────
Checklist                                   3/8
  ☑ Strip & start laundry
  ☑ Bathrooms
  ☑ Kitchen reset
  ☐ Vacuum & mop
  ☐ Restock toiletries
  ☐ Fresh linens
  ☐ Trash out
  ☐ Final photos
─────────────────────────────────────────────
         [  Mark turnover complete  ]
```
- Big 44px+ tap targets, checkbox rows full-width, sticky bottom CTA. NO payout, NO guest email/phone. Shows only address, access notes, times, checklist (per acceptance criteria).
- Ticking optimistically updates progress + owner dashboard; offline tolerant (queue + retry).
- `todo → in_progress` auto-transitions on first tick; `done` on complete CTA (confirm dialog if items unchecked: "3 items unchecked — complete anyway?").

### 3.8 Auth / login  `/login`
```
            ◆ NestRest
   ┌───────────────────────────┐
   │  Sign in                  │
   │  Email    [            ]  │
   │  Password [            ]  │
   │  [      Sign in       ]   │
   │  Forgot password?         │
   └───────────────────────────┘
   Self-hosted · v1
```
- Centered card on muted bg, max-w-sm. Invite-accept screen `/invite/[token]`: shows "Join as helper for {property}", set-password fields + strength meter. No public sign-up.
- Errors inline below card (destructive), never leaking which field was wrong beyond "Invalid email or password".

---

## 4. Reusable component specs (→ shadcn/ui mapping)

| Component | shadcn base | Variants / states | Notes |
|---|---|---|---|
| **Button** | `button` | `default`(teal), `secondary`, `outline`, `ghost`, `destructive`, `link`; sizes `sm/default/lg/icon`; `loading`(spinner+disabled) | Primary teal used sparingly — one per view |
| **KPI StatTile** | `card` (custom) | default, loading(skeleton), empty(—), trend ▲/▼ with success/destructive text | Clickable; see skeleton |
| **Calendar event chip** | custom | `airbnb`(coral), `manual`(violet hatched), states: default/hover/selected/continuation(left/right rounded) | See skeleton |
| **Status badge** | `badge` | booking: confirmed(teal), completed(muted/slate), cancelled(destructive outline); task: todo(outline), in_progress(amber), done(success); email: sent/delivered(success)/bounced(destructive) | Dot + label; see skeleton |
| **Source badge** | `badge` | airbnb(coral + ⌁), manual(violet) | Icon-forward |
| **Data table** | `table` + TanStack | sort, column filter, row hover, sticky header, empty, loading(skeleton rows), pagination | Collapses to cards < md |
| **Card / Section** | `card` | header/content/footer; `p-4 md:p-5` | hairline border, no shadow at rest |
| **Side panel** | `sheet` | right on desktop for booking detail; bottom on mobile for day agenda | |
| **Dialog** | `dialog` / `alert-dialog` | form dialog (block creator); destructive confirm (cancel booking, delete template) | alert-dialog for destructive |
| **Dropdown / menu** | `dropdown-menu` | row ⋯ actions, avatar menu, property switcher | |
| **Tabs** | `tabs` | Messages, Tasks status, Scheduled upcoming/sent | |
| **Combobox / select** | `command`, `select`, `popover` | template picker, booking picker, assignee, global `cmd+k` | |
| **Empty state** | custom | icon + title + one-line + primary CTA | see §5 |
| **Toast** | `sonner` | success/info/error/loading→settled | optimistic action feedback |
| **Skeleton** | `skeleton` | tiles, table rows, timeline | match final layout dims |
| **Avatar** | `avatar` | initials fallback, role tag | |
| **Form controls** | `form`,`input`,`textarea`,`checkbox`,`switch`,`label` | all labeled; error text + `aria-invalid` | react-hook-form + zod |
| **Banner** | `alert` | sync-failed(warning/destructive), info | site-wide under top bar |
| **Progress** | `progress` | checklist n/total | |

---

## 5. Interaction & state notes

### Loading (skeletons, never spinners for page loads)
- Dashboard: 4 KPI skeleton tiles + 2 skeleton list cards.
- Tables: 6–8 shimmer rows matching column widths.
- Calendar: month grid renders immediately, event bars fade in.
- Booking detail: form field skeletons + 4 timeline dot skeletons.
- Use `animate-pulse` on `bg-muted` blocks sized to final content to avoid layout shift.

### Optimistic updates
- Helper checklist ticks, task status changes, and message cancel apply instantly, reconcile on server ack; on failure revert + error toast ("Couldn't save — retrying").
- Booking field edits: Save shows button spinner, success toast, timeline entry appends optimistically.

### Empty states (every screen)
- Calendar: "No reservations yet. Add your Airbnb iCal URL in Settings to start syncing." + [Open settings].
- Bookings: "No bookings yet — they'll appear after your first sync."
- Messages/Templates: "Create your first template to send consistent guest messages." + [New template].
- Scheduled: "No scheduled messages. Add a trigger to a template to automate comms."
- Tasks (owner): "No turnover tasks. One is created automatically on each checkout."
- Helper today: "Nothing scheduled today 🎉 — check Upcoming."
- Action items (good path): "You're all caught up" with a success check.

### Error states
- Sync failure: persistent amber banner (calendar + dashboard action item) with last-success timestamp + Retry; data retained, never blanked.
- Unresolved merge fields: block send, amber inline, explain which field.
- Network/mutation error: destructive toast with Retry.
- 403 (helper hitting owner route): friendly "You don't have access to this page." not a raw error.
- Form validation: inline under field, `aria-describedby`.

### Confirmation dialogs (destructive = `alert-dialog`)
- Cancel booking, delete template, delete scheduled message, "complete with unchecked items", "block overlaps a reservation — save anyway?". All name the specific entity and have `destructive`-styled confirm + default Cancel focus.

---

## 6. Accessibility (WCAG 2.1 AA)
- **Keyboard:** full app operable without mouse. Calendar grid uses roving tabindex + arrow keys, `Enter`/`Space` to open, visible focus ring (`--ring` teal, `ring-2 ring-offset-2`). Command palette `cmd+k`.
- **Contrast:** body ink `222 18% 14%` on white ≈ 15:1; `muted-foreground` ≥ 4.5:1. Status colors paired with icon + text (never color alone — critical for calendar Airbnb/manual distinction: coral solid vs violet hatched + labels).
- **Labels:** all icon-only buttons have `aria-label` (sync, dark toggle, row ⋯). Form controls use `<Label htmlFor>`. Status badges include visually-hidden state text.
- **Live regions:** sync status, toast, and checklist progress use `aria-live="polite"`; errors `role="alert"`.
- **Targets:** helper mobile controls ≥ 44×44px.
- **Motion:** respect `prefers-reduced-motion` (disable pulse/slide).
- **PII:** never put guest email/phone/reservation code in URLs (use opaque booking id); respects spec security reqs.

---

## 7. Responsive behavior
- Breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280`.
- **< md:** sidebar → Sheet (hamburger); KPI grid 2-col; data tables → stacked cards; booking detail single column (details then timeline); calendar month → dot-density + day-agenda sheet.
- **md–lg (tablet):** sidebar collapses to 64px icon rail; tables keep key columns, hide Nights/secondary.
- **≥ lg:** full 240px sidebar; dashboard 4-col KPIs + 2-col panels; booking detail 2-col; calendar full month grid; booking detail opens as right Sheet from calendar/list.
- **Helper:** always single-column, mobile-first, max-w-md centered even on desktop. Must be fully usable and comfortable at **360px** (test target): no horizontal scroll, checklist rows full-width, sticky bottom CTA.

---

## 8. Skeleton components
Scaffolded (markup + Tailwind only, no logic) at:
- `src/components/kpi-tile.skeleton.tsx`
- `src/components/calendar-event-chip.skeleton.tsx`
- `src/components/status-badge.skeleton.tsx`

Engineer wires data/props; visual states and classes are defined there.
