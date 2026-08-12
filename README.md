# SingleRents

SingleRents is a responsive rental-marketplace MVP that connects tenants looking for single rooms with landlords who list and manage available rooms. It was implemented for the Seedfundin MVP interview brief.

The product supports the MVP journey from discovery to contact and payment: tenants can find a room, view its details and availability, request a booking, message the landlord, and leave a review. Landlords can create and manage listings, receive booking requests, and use listing/subscription payment flows.

## MVP features

| Area | Included implementation |
| --- | --- |
| Accounts | Email/password registration and login, Google sign-in, email verification, JWT-backed HTTP-only session cookie, and tenant/landlord roles. |
| Listings | Landlord room creation and management, photos, amenities, location, price, availability, trial dates, and publication status. |
| Search | Home-page room browsing with search/filter controls and an interactive Mapbox map. |
| Profiles | Editable personal details and payment-related profile data. |
| Contact | Secure tenant–landlord conversations with WebSocket-powered message updates. |
| Bookings | Viewing/rental requests, availability validation, booking states, and landlord matching. |
| Trust | Listing reviews and ratings, plus email-verification support. |
| Notifications | In-app notifications with unread counts and live updates. |
| Monetization | Listing trials, landlord subscriptions, Paystack payment initialization/verification/webhooks, and a 3% agency-fee field on rental payments. |
| Responsive UI | Mobile navigation menu plus layouts that adapt to tablet and phone widths. |

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 18, CSS
- **Backend:** Next.js route handlers with a custom Node server
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** bcrypt password hashing, JOSE JWTs, Google OAuth
- **Realtime:** WebSockets
- **Integrations:** Paystack, Mapbox, Cloudinary, SendGrid

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

Generate the Prisma client and apply the database migrations:

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

## Project structure

```text
app/
  api/              API routes for auth, listings, bookings, payments and more
  components/       Shared UI, including the header and Mapbox map
  dashboard/        Landlord dashboard, billing and room-management screens
  messages/         Tenant-landlord messaging screen
  profile/          Profile-management screen
lib/                Authentication, database, email, event and business helpers
prisma/             PostgreSQL schema and migration history
server.js           Next.js custom server and WebSocket upgrade handling
```

## Key product flows

1. A user registers as a tenant or landlord, verifies their email, and signs in.
2. A landlord creates a room listing with photos, price, location, amenities, and availability.
3. A tenant searches listings, uses the map/filter interface, and opens a listing.
4. The tenant starts a conversation or submits a booking request.
5. The landlord manages the request in the dashboard; relevant users receive in-app updates.
6. Paystack handles eligible listing, subscription, and rental-payment flows; completed rental payments retain the agency-fee amount.

## Security notes

- Passwords are hashed with `bcryptjs`; plaintext passwords are not stored.
- Sessions are signed JWTs stored in `httpOnly`, `sameSite=lax` cookies. Cookies are marked `secure` in production.
- Protected server routes derive the signed-in user from the session and apply role checks where needed.
- Payment webhook verification uses an HMAC signature before payment state is updated.
- Secrets belong only in `.env`; do not commit that file.

## Verification

The production build was run successfully with:

```bash
npm run build
```

## Scope notes

This is an MVP implementation intended to validate the landlord/tenant marketplace workflow described in the interview brief. Before a public launch, it should receive automated test coverage, full production monitoring, rate limiting, a formal security review, and end-to-end testing of each third-party integration using production credentials and webhook endpoints.
