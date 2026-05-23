# Implementation Plan: Vacation Rental Management Application (NestRest)

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript | Type safety across full stack, consistent APIs between frontend/backend |
| Backend Framework | Express.js + TypeScript | Lightweight, flexible, mature ecosystem. Separate backend gives more flexibility for future scaling |
| Frontend Framework | Next.js 14+ (App Router) | SSR/SSG for SEO-critical property pages, built-in routing, excellent DX, React Server Components for performance |
| UI Component Library | **shadcn/ui** + Radix UI | Copy-paste components you control. Gives Airbnb-like aesthetic without being locked in. Radix provides unstyled primitives with accessible patterns |
| Styling | Tailwind CSS + Headless UI | Utility-first approach, easy to customize, matches modern Airbnb style perfectly |
| Database | **PostgreSQL** (via Supabase) | Relational data model is essential for bookings (date conflicts, availability windows). PostgreSQL has excellent date range types and concurrency handling. Supabase adds real-time features if needed later |
| ORM | Prisma | Type-safe database queries, migrations, great DX, supports PostgreSQL well |
| Authentication | NextAuth.js (Auth.js) v5 | Battle-tested, supports multiple providers, works seamlessly with Next.js App Router, easy to extend for admin roles |
| Image Storage | AWS S3 + CloudFront OR Uploadcare | Property photos need CDN delivery. S3+CloudFront is cost-effective at scale. Uploadcare simplifies optimization/transformation |
| Booking Conflict Prevention | Database-level constraints + optimistic locking | PostgreSQL `OVERLAPS` operator for date ranges, row-level locks during booking creation to prevent double-booking |
| Payment Processing | **Stripe** | Pay ~2.9% + $0.30 per transaction. No monthly fees on free tier. Industry standard for payment processing with excellent SDKs |
| Testing | Vitest (unit) + Playwright (E2E) | Fast, TypeScript-native testing. Playwright handles browser automation for critical flows like booking |

### Database Choice Rationale: PostgreSQL over alternatives

**Why NOT MongoDB:**
- Booking availability is inherently relational with date range overlaps
- Need ACID transactions to prevent double-bookings
- Complex queries (availability windows, guest history) are more natural in SQL

**Why NOT SQLite:**
- Concurrency issues under load
- Not suitable for multi-tenant expansion later

**Why PostgreSQL:**
- Native `daterange` type with overlap operators (`&&`)
- Row-level locking prevents race conditions during booking
- Mature ecosystem, scalable (Supabase handles infrastructure)
- JSONB support if you need flexible property attributes later

### Hosting Strategy: Vercel + Supabase

| Service | Purpose | Free Tier | Why This Combo |
|---|---|---|---|
| **Vercel** | Frontend hosting | Generous free tier (100GB bandwidth/month) | Optimal for Next.js, zero-config deployments, instant cache invalidation |
| **Supabase** | PostgreSQL database | 500MB database, 2GB storage | Native PostgreSQL with excellent date handling, built-in auth API, real-time subscriptions |

This is the simplest path to production. Both integrate seamlessly and have generous free tiers that will support MVP through early traction.

### Monorepo Structure: Turborepo

Using **Turborepo** for better type sharing and unified build pipeline:

```
nestrest/
├── apps/
│   ├── web/                        # Next.js frontend (Vercel)
│   │   ├── src/
│   │   │   ├── app/                # App Router pages
│   │   │   ├── components/         # UI components
│   │   │   ├── lib/               # Client utilities
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   └── types/             # Frontend-specific types
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   │
│   ├── api/                        # Express backend
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point
│   │   │   ├── config/            # Environment, DB config
│   │   │   ├── controllers/       # Request handlers
│   │   │   ├── services/          # Business logic
│   │   │   ├── repositories/      # Data access (Prisma)
│   │   │   ├── middleware/        # Auth, validation
│   │   │   └── utils/             # Helpers
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
├── packages/
│   ├── shared/                     # Shared types & config
│   │   ├── src/
│   │   │   ├── booking.types.ts
│   │   │   ├── property.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── api.types.ts       # Request/response DTOs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
├── turbo.json                      # Turborepo config
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
└── .env.example                    # Root-level env template
```

**Why Turborepo over separate repos:**
- Single source of truth for types (no drift between frontend/backend)
- Unified build pipeline with caching (`turbo run build`)
- Easier to coordinate changes across apps
- pnpm workspaces provide efficient dependency sharing

## Module structure

### Core application files

#### Backend (`apps/api/src/`)

| File | Purpose | Priority |
|---|---|---|
| `index.ts` | Express server entry, middleware setup | **Critical** |
| `config/database.ts` | Prisma client initialization | **Critical** |
| `controllers/property.controller.ts` | Property CRUD endpoints | High |
| `controllers/booking.controller.ts` | Booking CRUD + conflict detection | **Critical** |
| `controllers/payment.controller.ts` | Stripe payment intents, webhooks | **High (Phase 1)** |
| `controllers/auth.controller.ts` | Auth integration helpers | High |
| `services/property.service.ts` | Property business logic | High |
| `services/booking.service.ts` | Core: conflict detection, availability | **Critical** |
| `services/payment.service.ts` | Stripe integration (Phase 1) | **High (Phase 1)** |
| `repositories/property.repository.ts` | Prisma property queries | High |
| `repositories/booking.repository.ts` | Prisma booking queries | **Critical** |
| `middleware/auth.middleware.ts` | JWT validation, role checks | **Critical** |
| `middleware/validation.middleware.ts` | Request validation | High |

#### Frontend (`apps/web/src/`)

| File | Purpose | Priority |
|---|---|---|
| `app/layout.tsx` | Root layout, providers | **Critical** |
| `app/page.tsx` | Home page (property showcase) | **Critical** |
| `app/properties/[slug]/page.tsx` | Property detail page | **Critical** |
| `app/book/page.tsx` | Booking flow page | **Critical** |
| `app/bookings/page.tsx` | Guest booking list | High |
| `app/bookings/[id]/page.tsx` | Booking details + cancel | High |
| `app/admin/layout.tsx` | Admin route protection | **Critical** |
| `app/admin/dashboard/page.tsx` | Admin dashboard | High |
| `app/admin/bookings/page.tsx` | Admin booking management | Medium |
| `components/ui/` | shadcn/ui base components | **Critical** |
| `components/booking/BookingForm.tsx` | Date picker + booking form | **Critical** |
| `components/booking/PriceCalculator.tsx` | Dynamic pricing display | High |
| `components/booking/PaymentForm.tsx` | Stripe payment element (Phase 1) | **High (Phase 1)** |
| `hooks/useBooking.ts` | Booking state management | High |
| `hooks/useAvailability.ts` | Availability checking | High |
| `lib/api.ts` | API client wrappers | High |

#### Shared types (`packages/shared/src/`)

```typescript
// booking.types.ts
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED_BY_GUEST = 'CANCELLED_BY_GUEST',
  CANCELLED_BY_ADMIN = 'CANCELLED_BY_ADMIN',
  COMPLETED = 'COMPLETED',
}

export interface BookingCreateInput {
  propertyId: string;
  checkIn: string; // ISO 8601
  checkOut: string; // ISO 8601
  guests: number;
  notes?: string;
}

// payment.types.ts (Phase 1)
export interface PaymentIntentResponse {
  clientSecret: string;
  bookingId: string;
  amount: number;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}
```

## Data model

### Prisma schema (`apps/api/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   // null if OAuth only
  name          String?
  role          UserRole  @default(GUEST)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  bookings      Booking[]       // Bookings made by this user
  messagesSent  Message[]       @relation("Sender")
  messagesReceived Message[]    @relation("Recipient")

  @@index([email])
}

enum UserRole {
  GUEST
  ADMIN
}

model Property {
  id            String    @id @default(cuid())
  slug          String    @unique
  name          String
  description   String
  address       String
  city          String
  state         String
  zipCode       String
  country       String
  latitude      Float?
  longitude     Float?
  maxGuests     Int
  pricePerNight Decimal   @db.Decimal(10, 2)
  currency      String    @default("USD")
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  images        PropertyImage[]
  amenities     Amenity[]
  bookings      Booking[]

  @@index([slug])
}

model PropertyImage {
  id            String    @id @default(cuid())
  propertyId    String
  url           String
  altText       String?
  sortOrder     Int
  createdAt     DateTime  @default(now())

  property      Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@index([propertyId])
}

model Amenity {
  id            String    @id @default(cuid())
  name          String    @unique // e.g., "WiFi", "Kitchen", "Pool"
  icon          String?   // Icon identifier (e.g., "wifi", "kitchen")
  category      String?   // e.g., "essentials", "entertainment"

  propertyAmenities PropertyAmenity[]
}

model PropertyAmenity {
  id            String    @id @default(cuid())
  propertyId    String
  amenityId     String

  property      Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  amenity       Amenity   @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@unique([propertyId, amenityId])
}

model Booking {
  id            String    @id @default(cuid())
  propertyId    String
  guestUserId   String
  checkIn       DateTime
  checkOut      DateTime
  guests        Int
  totalPrice    Decimal   @db.Decimal(10, 2)
  status        BookingStatus @default(PENDING)
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  property      Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  guest         User      @relation(fields: [guestUserId], references: [id])
  messages      Message[]

  @@unique([propertyId, checkIn, checkOut]) // Prevent exact duplicate dates
  @@index([propertyId, checkIn, checkOut]) // Fast conflict detection
}

enum BookingStatus {
  PENDING       // Awaiting admin confirmation or payment
  CONFIRMED     // Booked and confirmed
  CANCELLED_BY_GUEST
  CANCELLED_BY_ADMIN
  COMPLETED
}

model Message {
  id            String    @id @default(cuid())
  bookingId     String?   // null for general inquiries (contact form)
  senderId      String
  recipientId   String
  subject       String?
  body          String
  isRead        Boolean   @default(false)
  createdAt     DateTime  @default(now())

  booking       Booking?  @relation(fields: [bookingId], references: [id])
  sender        User      @relation("Sender", fields: [senderId], references: [id])
  recipient     User      @relation("Recipient", fields: [recipientId], references: [id])

  @@index([bookingId])
  @@index([recipientId, isRead]) // Inbox queries
}

// Stripe payment tracking (Phase 1)
model Payment {
  id            String    @id @default(cuid())
  bookingId     String    @unique
  stripePaymentId String  // stripe_payment_intent_id
  amount        Decimal   @db.Decimal(10, 2)
  currency      String    @default("USD")
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  booking       Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([stripePaymentId])
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}
```

### Key database constraints for booking safety

1. **Date overlap prevention** using PostgreSQL trigger:

```sql
CREATE FUNCTION check_booking_conflict() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM booking
    WHERE property_id = NEW.property_id
      AND status NOT IN ('CANCELLED_BY_GUEST', 'CANCELLED_BY_ADMIN')
      AND (check_in, check_out) OVERLAPS(NEW.check_in, NEW.check_out)
  ) THEN
    RAISE EXCEPTION 'Booking dates overlap with existing booking';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_booking_conflict
  BEFORE INSERT OR UPDATE ON booking
  FOR EACH ROW EXECUTE FUNCTION check_booking_conflict();
```

2. **Optimistic locking** in Prisma service layer:

```typescript
// In booking.service.ts
await prisma.$transaction(async (tx) => {
  const lockedBooking = await tx.booking.findFirst({
    where: { propertyId, status: 'PENDING' },
    lockMode: 'forUpdate'
  });
  // Validate and create new booking
});
```

## Implementation steps (in order)

### **Phase 1: Foundation + Stripe Payments (Week 1)**

**Goal:** Set up Turborepo monorepo, database schema, core API endpoints, and Stripe payment integration.

#### Step 1.1: Monorepo scaffolding (Day 1-2)
- Initialize Turborepo workspace with `pnpm dlx create-turbo@latest`
- Configure `apps/web` for Next.js 14+ App Router
- Configure `apps/api` for Express + TypeScript
- Set up shared types package (`packages/shared`)
- Configure ESLint, Prettier across all packages
- Create `.env.example` templates

**Acceptance:** `pnpm dev` starts both apps; type imports work across packages.

#### Step 1.2: Database setup & migrations (Day 2)
- Set up Supabase project (free tier)
- Configure Prisma schema with all models
- Run initial migration to create tables
- Create seed script for:
  - Admin user (role: ADMIN, email: admin@nestrest.local)
  - Sample property with images and amenities
  - Common amenities catalog

**Acceptance:** Database has admin user and sample data; Prisma Studio shows all tables.

#### Step 1.3: Express API foundation (Day 2-3)
- Create Express server with TypeScript in `apps/api/src/index.ts`
- Configure middleware: CORS, helmet, compression, express.json()
- Set up error handling middleware
- Define route structure in `routes.ts`
- Implement health check endpoint (`GET /health`)

**Acceptance:** Server starts on port 3001, `/health` returns `{ "status": "ok" }`.

#### Step 1.4: Stripe integration (Day 3-4) **NEW IN PHASE 1**
- Install `@stripe/stripe-js` and `stripe` npm packages in both apps
- Set up Stripe account (test mode), configure API keys in Supabase secrets
- Create `payment.service.ts`:
  - `createPaymentIntent(bookingId, amount)` → returns clientSecret
  - `confirmPayment(stripePaymentId)` → updates booking status
- Create `payment.controller.ts` endpoints:
  - `POST /api/payments/intent` — create payment intent for booking
  - `POST /api/payments/webhook` — handle Stripe webhook events
- Implement webhook handler for `payment_intent.succeeded`, `payment_intent.payment_failed`

**Acceptance:** Can create payment intents via API; webhooks update database on success/failure.

#### Step 1.5: Property endpoints (Day 4-5)
- `GET /api/properties` — List all active properties
- `GET /api/properties/:slug` — Get property details with images and amenities
- `POST /api/admin/properties` — Create new property (admin only)
- `PUT /api/admin/properties/:id` — Update property (admin only)

**Acceptance:** Frontend can fetch property data; admin can create/edit properties via API.

### **Phase 2: Booking Flow + Payment Integration (Week 2)**

**Goal:** Implement booking flow with conflict prevention and payment processing.

#### Step 2.1: Availability checking service (Day 1-2)
- Create `booking.service.ts` with availability logic
- Implement date range overlap detection using PostgreSQL queries
- Add validation for check-in/check-out dates (check-out > check-in, max stay length)
- Calculate price based on nights and property rate

**Acceptance:** Service correctly identifies overlapping bookings; returns accurate pricing.

#### Step 2.2: Booking creation endpoint with payment flow (Day 2-3) **UPDATED**
- `POST /api/bookings` — Create new booking (guest authenticated)
  - Validate date ranges against existing bookings
  - Apply optimistic locking via transaction
  - Set initial status to `PENDING_PAYMENT`
  - Return booking ID and redirect URL for payment
- `POST /api/payments/intent` — Create Stripe payment intent after booking created
- Payment confirmation webhook updates booking to `CONFIRMED`

**Acceptance:** Cannot create overlapping bookings; PENDING_PAYMENT bookings created with payment flow.

#### Step 2.3: Booking management endpoints (Day 3-4)
- `GET /api/bookings/my-bookings` — List guest's bookings
- `GET /api/bookings/:id` — Get booking details (guest can only see their own)
- `PUT /api/bookings/:id/cancel` — Cancel booking (guest or admin, with refund logic)
- `PUT /api/admin/bookings/:id/confirm` — Confirm pending booking (admin only, manual override)
- `PUT /api/admin/bookings/:id` — Update booking details (admin only)

**Acceptance:** Guests can view and cancel their bookings; admins can confirm/update any booking.

#### Step 2.4: Frontend booking flow UI (Day 4-5)
- Create `BookingForm.tsx` with date range picker (using `react-day-picker`)
- Implement availability calendar showing blocked dates
- Build `PriceCalculator.tsx` component (dynamic pricing display)
- Create `PaymentForm.tsx` with Stripe Elements for card input
- Connect to API via React Query or SWR

**Acceptance:** Users can select dates, see real-time price calculation, submit booking and complete payment.

### **Phase 3: Messaging + Admin Dashboard (Week 3)**

**Goal:** Enable communication between guests and admins; build admin tools.

#### Step 3.1: Message endpoints (Day 1-2)
- `POST /api/messages` — Send message (linked to booking or general inquiry)
- `GET /api/messages/inbox` — Get user's inbox (messages received)
- `PUT /api/messages/:id/read` — Mark as read
- `DELETE /api/messages/:id` — Delete message

**Acceptance:** Users can send messages, view inbox, mark as read.

#### Step 3.2: Frontend messaging UI (Day 2-3)
- Create `MessageList.tsx` with conversation threading
- Build `ContactForm.tsx` for general inquiries (no booking required)
- Implement `GuestMessageComposer.tsx` for admin-to-guest messages
- Add polling every 30 seconds for new messages (simple, reliable)

**Acceptance:** Guests see contact form on property page; both parties can exchange messages.

#### Step 3.3: Admin dashboard (Day 3-4)
- Create `AdminDashboard.tsx` with key metrics (upcoming bookings, pending confirmations, revenue)
- Build `BookingTable.tsx` with filters (status, date range, property)
- Implement search functionality for guests/bookings

**Acceptance:** Admin can view all bookings, filter by status, see upcoming reservations.

#### Step 3.4: Create booking modal for admin (Day 4-5)
- Build `CreateBookingModal.tsx` for admin to create on behalf of guest
- Include date picker, guest count, price calculation
- Allow adding notes for internal use
- Option to charge immediately or mark as pending

**Acceptance:** Admin can manually create bookings with all details.

### **Phase 4: Polish + Deployment (Week 4)**

**Goal:** Refine UX, write tests, deploy to production.

#### Step 4.1: Property gallery & detail pages polish (Day 1-2)
- Implement `PropertyGallery.tsx` with lightbox image viewer
- Create `PropertyDetails.tsx` showing amenities, address, pricing
- Add map integration (Google Maps or Mapbox) for location display
- Optimize images with Next.js Image component

**Acceptance:** Property pages look polished, images load fast via CDN.

#### Step 4.2: Testing & QA (Day 2-3)
- Write unit tests for booking conflict logic (`booking.service.test.ts`)
- Integration tests for API endpoints using Supertest
- E2E tests for critical flows:
  - Book property with Stripe payment (Playwright)
  - Cancel booking and verify refund flow (Playwright)
  - Send/receive messages (Playwright)

**Acceptance:** 80%+ code coverage on backend services; all critical user flows pass E2E tests.

#### Step 4.3: Deployment to Vercel + Supabase (Day 3-4)
- Deploy frontend to **Vercel**:
  - Connect GitHub repo, configure build command (`pnpm --filter @nestrest/web build`)
  - Set environment variables in Vercel dashboard
  - Configure custom domain if needed
- Deploy backend API:
  - Option A: Host on Vercel as serverless functions (simplest)
  - Option B: Deploy to Railway/Railway for persistent Express process
- Connect Supabase database, configure production connection string

**Acceptance:** Production deployment successful; all environments configured.

#### Step 4.4: Final QA & launch checklist (Day 5)
- Test payment flow end-to-end with Stripe test cards
- Verify webhook signatures and error handling
- Check mobile responsiveness on iOS/Android
- Load test booking creation under concurrent requests
- Document runbook for common operations (refunds, manual bookings)

**Acceptance:** All launch criteria met; ready for public release.

## Critical files and folder structure

### Backend critical files

| File | Purpose | Priority |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Database schema definition | **Critical** |
| `apps/api/src/services/booking.service.ts` | Core booking logic, conflict detection | **Critical** |
| `apps/api/src/services/payment.service.ts` | Stripe integration | **Critical (Phase 1)** |
| `apps/api/src/middleware/auth.middleware.ts` | Role-based access control | **Critical** |
| `apps/api/src/controllers/booking.controller.ts` | Booking API endpoints | High |
| `apps/api/src/controllers/payment.controller.ts` | Payment API + webhooks | High (Phase 1) |
| `apps/api/src/utils/date.utils.ts` | Date range utilities, timezone handling | High |

### Frontend critical files

| File | Purpose | Priority |
|---|---|---|
| `apps/web/app/book/page.tsx` | Main booking flow page | **Critical** |
| `apps/web/components/booking/BookingForm.tsx` | Date picker + booking form | **Critical** |
| `apps/web/components/booking/PaymentForm.tsx` | Stripe payment element | **High (Phase 1)** |
| `apps/web/hooks/useAvailability.ts` | Client-side availability checking | High |
| `apps/web/lib/api.ts` | API client wrappers, error handling | High |
| `apps/web/app/admin/layout.tsx` | Route protection for admin pages | Critical |

### Shared types (Turborepo)

| File | Purpose |
|---|---|
| `packages/shared/src/booking.types.ts` | Booking status enum, booking request/response types |
| `packages/shared/src/payment.types.ts` | Payment intent responses, payment status enum |
| `packages/shared/src/user.types.ts` | User roles, user DTOs |

## Architectural trade-offs

### Multi-property scalability

**Current design:** Single property hardcoded in seed data, but schema supports multiple.

**Trade-off:** Property-specific logic is decoupled via `propertyId` foreign keys throughout. To add a second property:
1. Add new property record via admin panel or database seed
2. Update frontend to fetch from `/api/properties/:slug` instead of hardcoded data
3. Consider adding property selector UI if >1 active property

**Future enhancement:** Add `PropertyManager` role for property-specific admins (if different owners per property).

### Booking conflict prevention strategies compared

| Approach | Pros | Cons |
|---|---|---|
| **Database trigger + OVERLAPS operator** | Atomic, prevents race conditions at DB level | Requires PostgreSQL, complex SQL maintenance |
| Optimistic locking in app layer | Simple to implement, works with any DB | Can fail under high contention, requires retry logic |
| Pessimistic locking (row locks) | Guaranteed no conflicts | Performance impact, potential deadlocks |

**Chosen approach:** Hybrid - database trigger for hard guarantee + optimistic locking in service layer for better error messages.

### Authentication strategy

**Option 1: NextAuth.js on frontend only**
- Pros: Simple, well-integrated with Next.js
- Cons: API calls need separate auth token handling

**Option 2: JWT tokens stored in httpOnly cookies**
- Pros: More secure, CSRF protection built-in
- Cons: More complex setup

**Chosen:** NextAuth.js with JWT stored in httpOnly cookies. Frontend uses `useSession()` hook; backend validates JWT from cookie via middleware.

### Image storage trade-offs

| Option | Cost at scale | Complexity | Best for |
|---|---|---|---|
| AWS S3 + CloudFront | Low ($0.023/GB stored, $0.085/GB transfer) | Medium (setup buckets, policies, CDN) | Long-term scalability |
| Uploadcare | Higher ($0.10/GB after free tier) | Low (handles optimization automatically) | Faster setup, less ops |
| Vercel Blob | Simple pricing | Very low | If already on Vercel ecosystem |

**Recommendation:** Start with **Uploadcare** for simplicity. Migrate to S3+CloudFront if costs become significant or you need custom workflows.

### Real-time messaging considerations

**Current plan:** Polling every 30 seconds for new messages (simple, reliable).

**Future enhancement:** WebSocket via Pusher or Socket.io for instant updates.

**Trade-off:** Adds complexity (WebSocket server, fallback to polling). Defer until messaging volume increases.

## Risks

### Technical risks
1. **Booking race conditions**: Even with database constraints, high concurrency could cause failed transactions. Mitigation: Implement retry logic with exponential backoff in booking service.

2. **Date/timezone bugs**: Guests in different timezones may see incorrect availability. Mitigation: Store all dates in UTC in database; convert to user's local timezone on frontend using `date-fns-tz` or similar.

3. **Image optimization bottlenecks**: Large property photos could slow page loads. Mitigation: Implement responsive images with Next.js Image component; use Uploadcare for automatic optimization.

4. **Authentication token expiration**: Users getting logged out mid-booking flow. Mitigation: Refresh tokens automatically; show clear session expiry warnings.

5. **Stripe webhook reliability**: Webhooks can fail or arrive out of order. Mitigation: Implement idempotency keys, verify webhook signatures, queue failed webhooks for retry.

### Business risks
1. **Double-bookings due to edge cases**: Manual bookings by admin could conflict with online bookings. Mitigation: Admin UI must use same availability checking service as guest booking flow.

2. **Cancellation policy enforcement**: No automated penalty system in Phase 1. Defer to manual admin handling or add Stripe integration later for cancellation fees.

3. **Payment processing failures**: Stripe transactions can fail for various reasons (insufficient funds, card declined). Mitigation: Clear error messages, retry logic, manual admin override option.

### Operational risks
1. **Database migration failures**: Schema changes could break existing data. Mitigation: Always test migrations on staging; use Prisma's migration history tracking.

2. **Third-party dependency outages**: If using Supabase, Stripe, or NextAuth providers, their downtime affects your app. Mitigation: Implement graceful degradation (e.g., cached property data if image service fails).

3. **Vercel serverless cold starts**: API routes may have latency on first request after idle. Mitigation: Use Vercel's keep-alive endpoints or switch to persistent hosting (Railway) for backend.

## Out of scope (defer to future iterations)

1. **Automated cancellation fees** - Manual admin handling only
2. **Multi-language support** - English-only initially
3. **Mobile app** - Responsive web only; no native iOS/Android apps
4. **Advanced search/filtering** - Basic property listing only; no filters by price, amenities, etc.
5. **Reviews and ratings** - No guest review system in Phase 1-4
6. **Dynamic pricing** - Fixed nightly rate; no seasonal or demand-based pricing
7. **Property manager roles** - Single admin role only; no per-property admins
8. **Calendar sync (iCal)** - No external calendar integration (Airbnb/Google Calendar)
9. **Automated email notifications** - Manual admin messaging only; defer to SendGrid/AWS SES integration
10. **Loyalty/rewards program** - No guest loyalty features in Phase 1-4

## Open questions

1. **What's your Stripe account status?** Need test API keys set up before payment integration can begin.

2. **Do you have existing property photos?** If not, we'll need placeholder images and a process for uploading real ones.

3. **What cancellation policy do you want to enforce?** Full refund if cancelled 7+ days before check-in? Partial refund? No refunds? This affects the Stripe refund logic.

4. **Do you need OAuth providers (Google/GitHub) or email/password only?** Email/password is simpler for MVP; OAuth can be added later.

5. **Any specific branding requirements?** Colors, logo, domain name for production deployment.

---

**Timeline summary:**
- **Week 1**: Monorepo setup, database, Stripe integration, property endpoints
- **Week 2**: Booking flow with payment processing, frontend booking UI
- **Week 3**: Messaging system, admin dashboard
- **Week 4**: Polish, testing, deployment to Vercel + Supabase

**Next steps:** Review this plan, answer the open questions, and I can provide detailed code snippets for any specific component or service layer implementation.
