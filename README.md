# SingleRents

SingleRents is a responsive rental-marketplace MVP that connects tenants looking for single rooms with landlords who list and manage available rooms. It was implemented for the Seedfundin MVP interview brief.

The product supports the MVP journey from discovery to contact and payment: tenants can find a room, view its details and availability, request a booking, message the landlord, and leave a review. Landlords can create and manage listings, receive booking requests, and use listing/subscription payment flows.

## MVP features

| Area | Included implementation |
| --- | --- |
| Accounts | Email/password registration and login, Google sign-in, branded email verification, JWT-backed HTTP-only session cookie, account activation, and tenant/landlord/admin roles. |
| Listings | Landlord room creation and management, plan-based photo limits, amenities, location, price, availability, trial dates, and publication status. |
| Search | Home-page room browsing with search/filter controls and an interactive Mapbox map. |
| Profiles | Editable personal details and payment-related profile data. |
| Contact | Secure tenant–landlord conversations with WebSocket-powered message updates. |
| Bookings | Viewing/rental requests, availability validation, booking states, and landlord matching. |
| Trust | Listing reviews and ratings, plus email-verification support. |
| Notifications | In-app notifications with unread counts and live updates. |
| Administration | Protected platform console for monitoring users, listings, bookings, payments, subscriptions, and platform fees; admins can manage account activation, roles, and listing status. |
| Monetization | Listing trials, landlord subscriptions, Paystack payment initialization/verification/webhooks, and an escrow-style rental flow: rent is held in the platform account until an admin releases the landlord's 97% share. |
| Responsive UI | Animated, responsive landing page; mobile navigation; and a shared footer across the application. |

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 18, TypeScript, CSS
- **Backend:** TypeScript Next.js route handlers, including a Vercel WebSocket Function
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** bcrypt password hashing, JOSE JWTs, Google OAuth
- **Realtime:** Vercel WebSockets backed by Upstash Redis pub/sub
- **Integrations:** Paystack, Mapbox, Cloudinary, SendGrid

## Landlord plans

| Plan | Listing allowance | Photos per room |
| --- | --- | --- |
| Free | One listing for 2 days | 1 |
| Pro | Ongoing listings | 2 |
| Enterprise | Ongoing listings | 5 |

Photo limits are enforced when a landlord creates or updates a listing. On the landing page, the **List your room** call to action sends signed-in landlords to their dashboard, guides tenants to register as landlords, and sends signed-out visitors to registration.

## Email delivery

SingleRents sends responsive, SingleRents-branded verification and notification emails, including the `⌂ singlerents` wordmark, a clear call to action, and a fallback link.

- Set `APP_URL` to the canonical public HTTPS origin (for example, `https://your-domain.com`) so verification links always open the live app.
- Verify `EMAIL_FROM` or authenticate its sending domain in SendGrid. SPF, DKIM, and DMARC improve delivery and reduce spam placement.
- New/unverified senders can land in Spam, Junk, or Promotions. Check SendGrid's Activity Feed and the recipient's spam folders while testing.
- Verification links expire after 24 hours. Resending a verification email invalidates the preceding link.
- `localhost` links work only on the computer running the local server. Use a deployed URL or a secure tunnel for cross-device email testing.

## Local setup

### Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- npm
- A PostgreSQL database

### Install and configure

```bash
npm install
cp .env.example .env
```

Set the values in `.env`. At a minimum, `DATABASE_URL` and `JWT_SECRET` are required to run the application. Configure the other values when testing their corresponding integrations.

```dotenv
# Core
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/singlerents"
JWT_SECRET="replace-with-a-long-random-secret"
# Use your deployed HTTPS domain in production so email links are clickable.
APP_URL="http://localhost:3000"

# Map and uploads
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=""
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Email verification and notifications
SENDGRID_API_KEY=""
EMAIL_FROM=""
EMAIL_FROM_NAME="SingleRents"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Paystack
PAYSTACK_SECRET_KEY=""
PAYSTACK_WEBHOOK_SECRET=""
PAYSTACK_PRO_PLAN_CODE=""
PAYSTACK_ENTERPRISE_PLAN_CODE=""
```

Generate the Prisma client and apply the database migrations locally:

```bash
npm run db:generate
npm run db:migrate
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the custom development server, including WebSocket support. |
| `npm run build` | Create an optimized production build. |
| `npm start` | Serve the production build. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:migrate` | Create/apply Prisma development migrations. |
| `npm run db:migrate:deploy` | Apply committed Prisma migrations (production-safe). |
| `npm run vercel-build` | Vercel build: generates Prisma Client and applies migrations only in Vercel Production. |

## Project structure

```text
app/
  api/              API routes for auth, listings, bookings, payments and more
  components/       Shared UI, including the header, footer and Mapbox map
  dashboard/        Landlord dashboard, billing and room-management screens
  admin/            Protected platform-administration console
  messages/         Tenant-landlord messaging screen
  profile/          Profile-management screen
lib/                Authentication, database, email, event and business helpers
prisma/             PostgreSQL schema and migration history
server.ts           Local-development Next.js server and WebSocket upgrade handling
vercel.json         Vercel WebSocket rewrite, Fluid Compute, and production build config
```

## Key product flows

1. A user registers as a tenant or landlord, verifies their email, and signs in.
2. A landlord creates a room listing with photos (Free: 1, Pro: 2, Enterprise: 5), price, location, amenities, and availability.
3. A tenant searches listings, uses the map/filter interface, and opens a listing.
4. The tenant starts a conversation or submits a booking request.
5. The landlord manages the request in the dashboard; relevant users receive in-app updates.
6. Rental payments are collected into the platform Paystack balance. Admins release the landlord's 97% share to the connected bank account after review; the platform retains the 3% fee.

## Administration

The `/admin` page is accessible only to active users whose database role is `ADMIN`. It provides platform metrics and controls for user accounts and listings:

- View recent users, listings, bookings, payments, and subscriptions.
- Activate or deactivate user accounts. Deactivated users cannot log in or access protected API routes.
- Change user roles between `TENANT`, `LANDLORD`, and `ADMIN`.
- Change listing lifecycle status (`DRAFT`, `PENDING_PAYMENT`, `PUBLISHED`, `PAUSED`, or `ARCHIVED`).

To grant the first administrator access, update an existing verified user's `role` to `ADMIN` directly in the database (for example, with Prisma Studio), then sign out and sign back in so the session reflects the new role. The console prevents an administrator from deactivating or demoting their own account.

The user-activation field is introduced by the committed migration `20260813090000_add_user_activation`. Apply migrations locally with `npm run db:migrate`; Vercel applies it through `prisma migrate deploy` on Production deployments.

## Security notes

- Passwords are hashed with `bcryptjs`; plaintext passwords are not stored.
- Sessions are signed JWTs stored in `httpOnly`, `sameSite=lax` cookies. Cookies are marked `secure` in production.
- Protected server routes derive the signed-in user from the session and apply role checks where needed.
- Admin API routes re-check the persisted account role and active state rather than trusting only the role originally contained in the session token.
- Payment webhook verification uses an HMAC signature before payment state is updated.
- Secrets belong only in `.env`; do not commit that file.

## Vercel deployment

Vercel deploys the WebSocket endpoint as `app/api/ws/route.ts`; `vercel.json` rewrites the existing `/ws` client URL to it. The endpoint validates the existing `singlerents_session` JWT cookie before accepting an upgrade. Redis is required in every Vercel environment that serves realtime traffic: add an Upstash Redis integration or set `REDIS_URL` to a TLS Redis URL. Redis publishes cross-instance events, while PostgreSQL remains the durable source of messages and notifications; clients reconnect with exponential backoff and reload persisted data after reconnecting. Set `APP_URL` to the canonical HTTPS production domain (for example, `https://your-domain.com`) so verification emails always link to the live app rather than a preview deployment.

The Vercel build command runs `prisma generate` for all deployments. It runs `prisma migrate deploy` only when Vercel sets `VERCEL_ENV=production`; never use `prisma migrate dev` in Vercel.

## Verification

The production build was run successfully with:

```bash
npm run build
```

## Scope notes

This is an MVP implementation intended to validate the landlord/tenant marketplace workflow described in the interview brief. Before a public launch, it should receive automated test coverage, full production monitoring, rate limiting, a formal security review, and end-to-end testing of each third-party integration using production credentials and webhook endpoints.
