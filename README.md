# NestRest - Vacation Rental Management Platform

A full-stack TypeScript application for managing vacation rental bookings with Stripe payment integration.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Payments**: Stripe

## Project Structure

```
nestrest/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/app/        # Pages and components
│   │   └── package.json
│   │
│   └── api/                 # Express backend
│       ├── src/            # Routes, services, controllers
│       ├── prisma/         # Database schema & migrations
│       └── package.json
│
├── packages/
│   └── shared/             # Shared types between apps
│       └── src/
│           ├── booking.types.ts
│           ├── payment.types.ts
│           ├── property.types.ts
│           └── user.types.ts
│
├── turbo.json              # Turborepo configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
└── package.json            # Root package
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (Supabase recommended)
- Stripe account (test mode for development)

### Installation

1. **Install dependencies**
   ```bash
   cd nestrest
   pnpm install
   ```

2. **Set up environment variables**
   
   Copy the example files and fill in your values:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Set up Supabase database**
   
   - Create a free project at [supabase.com](https://supabase.com)
   - Get your connection string from Project Settings > Database
   - Update `apps/api/.env` with your `DATABASE_URL`

4. **Configure Stripe**
   
   - Sign up at [stripe.com](https://stripe.com) and get test API keys
   - Update `apps/api/.env`:
     ```
     STRIPE_SECRET_KEY=sk_test_your_key_here
     STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
     ```

5. **Initialize database**
   ```bash
   cd apps/api
   pnpm db:push    # Push schema to database
   pnpm db:seed    # Seed sample data
   ```

### Development

From the root directory, run both apps simultaneously:

```bash
pnpm dev
```

This will start:
- **API**: http://localhost:3001 (Express server)
- **Web**: http://localhost:3000 (Next.js dev server)

To run individually:

```bash
# API only
cd apps/api && pnpm dev

# Web only  
cd apps/web && pnpm dev
```

### Available Scripts

**Root:**
- `pnpm dev` - Start both apps in development
- `pnpm build` - Build all packages
- `pnpm lint` - Run ESLint across all packages

**API (`apps/api/`):**
- `pnpm dev` - Start Express server with hot reload
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Run migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Prisma Studio (DB GUI)
- `pnpm db:seed` - Seed sample data

**Web (`apps/web/`):**
- `pnpm dev` - Start Next.js development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## API Endpoints

### Properties (Public)
```
GET    /api/properties           # List all active properties
GET    /api/properties/:slug     # Get property by slug
```

### Bookings (Private/Guest)
```
POST   /api/bookings             # Create new booking
GET    /api/bookings/my-bookings # Get user's bookings
GET    /api/bookings/:id         # Get booking details
PUT    /api/bookings/:id/cancel  # Cancel booking
```

### Payments (Private/Guest)
```
POST   /api/payments/intent      # Create payment intent
POST   /api/payments/confirm     # Confirm payment
GET    /api/payments/:bookingId  # Get payment status
```

### Messages (Private/Guest)
```
POST   /api/messages             # Send message
GET    /api/messages/inbox       # Get inbox
PUT    /api/messages/:id/read    # Mark as read
```

### Admin Endpoints (Private/Admin)
```
POST   /api/admin/properties           # Create property
PUT    /api/admin/properties/:id       # Update property
DELETE /api/admin/properties/:id       # Deactivate property
PUT    /api/admin/bookings/:id/confirm # Confirm booking
GET    /api/admin/bookings             # List all bookings
```

## Database Schema

The application uses Prisma ORM with the following main models:

- **User** - Guest and admin users
- **Property** - Vacation rental properties
- **PropertyImage** - Property photos
- **Amenity** - Available amenities (WiFi, Pool, etc.)
- **Booking** - Guest reservations
- **Message** - Communication between guests and admins
- **Payment** - Stripe payment tracking

## Authentication

For MVP, authentication is handled via NextAuth.js with Google OAuth provider. The backend validates JWT tokens from httpOnly cookies.

## Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL` = your API URL
4. Deploy!

### Backend (Railway or Vercel Serverless)
**Option A: Railway (recommended for Express)**
1. Create new project on [railway.app](https://railway.app)
2. Add PostgreSQL database
3. Deploy from GitHub
4. Set environment variables

**Option B: Vercel Serverless Functions**
- Convert Express routes to Next.js API routes or use separate deployment

### Database (Supabase)
1. Create project at [supabase.com](https://supabase.com)
2. Run migrations in production: `pnpm db:migrate`
3. Set `DATABASE_URL` in your hosting platform

## Development Notes

- All dates are stored in UTC in the database
- Stripe test mode uses special card numbers for testing different scenarios
- Booking conflicts are prevented via database triggers and optimistic locking
- Images use placeholder URLs from Unsplash - replace with actual property photos

## License

MIT - feel free to use this for your own projects!
