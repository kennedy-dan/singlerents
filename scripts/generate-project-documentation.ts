export {};

const fs = require('fs');
const path = require('path');
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require('/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/docx');

const output = path.resolve(__dirname, '..', 'SingleRents_MVP_Technical_Documentation.docx');
const brand = '16352C';
const accent = 'EB7556';
const muted = '56665F';
const border = { style: BorderStyle.SINGLE, size: 6, color: 'E5E2D9' };

const text = (value, options = {}) => new TextRun({ text: value, font: 'Aptos', size: 22, color: '243B34', ...options });
const paragraph = (value, options = {}) => new Paragraph({ children: [text(value)], spacing: { after: 150, line: 300 }, ...options });
const bullet = (value) => new Paragraph({ children: [text(value)], bullet: { level: 0 }, spacing: { after: 70, line: 280 } });
const heading = (value, level = HeadingLevel.HEADING_1) => new Paragraph({ text: value, heading: level, spacing: { before: 310, after: 130 }, style: level });
const cell = (value, header = false) => new TableCell({
  borders: { top: border, bottom: border, left: border, right: border },
  shading: header ? { fill: 'EAF0EC' } : undefined,
  margins: { top: 100, bottom: 100, left: 120, right: 120 },
  children: [new Paragraph({ children: [text(value, { bold: header, size: 19, color: header ? brand : '243B34' })], spacing: { after: 0 } })],
});
const table = (headers, rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [new TableRow({ children: headers.map((item) => cell(item, true)) }), ...rows.map((row) => new TableRow({ children: row.map((item) => cell(item)) }))],
});

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600, after: 240 }, children: [text('SINGLERENTS', { bold: true, size: 44, color: brand, characterSpacing: 45 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [text('MVP Technical and Implementation Documentation', { bold: true, size: 30, color: accent })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 }, children: [text('Seedfundin Interview Implementation', { size: 24, color: muted })] }),
  paragraph('Document purpose', { heading: HeadingLevel.HEADING_2 }),
  paragraph('This document explains the work completed for the SingleRents MVP interview project. It is intended to accompany the source code and demonstrate the product scope, technical choices, implemented features, configuration requirements, and areas planned for future enhancement.'),
  new Paragraph({ pageBreakBefore: true, text: '1. Project Overview', heading: HeadingLevel.HEADING_1 }),
  paragraph('SingleRents is a responsive web marketplace for single-room rentals. It connects landlords who need to advertise rooms with tenants who need to discover, assess, request, and pay for accommodation. The implementation follows the supplied Seedfundin MVP brief, prioritising the complete landlord-to-tenant journey over non-essential marketplace features.'),
  heading('Problem addressed', HeadingLevel.HEADING_2),
  paragraph('The product reduces the friction of finding and managing single-room rentals by putting listings, availability, direct communication, booking requests, reviews, and monetisation in one platform. It is designed for students, single professionals, temporary workers, small landlords, and agencies.'),
  heading('MVP objectives', HeadingLevel.HEADING_2),
  table(['Objective', 'Delivered capability'], [
    ['List rooms', 'Landlords can create and manage room listings with price, location, images, amenities, description, and availability.'],
    ['Find rooms', 'Tenants can browse listings, use search/filter controls, and explore locations through a map.'],
    ['Connect users', 'Tenants can message landlords and submit booking/viewing requests.'],
    ['Build trust', 'Email verification, user roles, reviews, ratings, and clear listing details are supported.'],
    ['Validate revenue', 'Listing trials, subscriptions, Paystack payments, and a 3% agency-fee mechanism are included.'],
  ]),
  new Paragraph({ text: '2. User Roles and Core Journeys', heading: HeadingLevel.HEADING_1 }),
  heading('Tenant journey', HeadingLevel.HEADING_2),
  bullet('Register with email/password or Google, verify the email address, and sign in.'),
  bullet('Browse rooms by location, price, and listing attributes; view room details, photos, map location, ratings, and availability.'),
  bullet('Contact the landlord through the in-app messaging feature or request a viewing/rental booking.'),
  bullet('Track conversation and booking progress through notifications; complete eligible rental payments through Paystack.'),
  bullet('Leave a rating and review after the stay to support marketplace trust.'),
  heading('Landlord journey', HeadingLevel.HEADING_2),
  bullet('Create a landlord account, verify email, and manage profile/payment setup.'),
  bullet('Create rooms with title, description, location, price, photo URLs, amenities, and availability data.'),
  bullet('Manage room status and incoming booking requests from the dashboard.'),
  bullet('Communicate with prospective tenants and receive notification updates.'),
  bullet('Use the free listing trial or select a paid subscription plan; receive rental settlement through a Paystack subaccount flow.'),
  new Paragraph({ text: '3. Functional Implementation', heading: HeadingLevel.HEADING_1 }),
  table(['Feature area', 'Implementation details'], [
    ['Authentication and identity', 'Registration, login, logout, current-user lookup, email verification/resend flow, Google OAuth, role-based access, bcrypt password hashing, and signed session cookies.'],
    ['Listings', 'Create, read, update, and manage listings. Each listing stores title, description, price, location, type, amenities, photos, availability, publication status, and trial expiry.'],
    ['Search and map', 'The public home screen presents room cards, filtering/search controls, listing details, and a Mapbox-powered map component.'],
    ['Profiles', 'Users can view and update account details, including information needed to support their platform role.'],
    ['Bookings', 'Tenants submit date-based requests. The service validates availability and records request/confirmation/decline/cancellation/completion states.'],
    ['Messaging', 'A tenant and landlord share one listing-aware conversation. New messages are persisted and live application events are sent over WebSockets.'],
    ['Reviews', 'Users can create rating and comment records associated with a listing; ratings support fractional values.'],
    ['Notifications', 'In-app notifications are stored per user, expose unread counts, can be marked read, and are updated live for signed-in users.'],
    ['Billing', 'Landlords can select Pro or Enterprise subscription plans. Rental payments calculate a 3% platform charge and preserve payment lifecycle state.'],
  ]),
  new Paragraph({ text: '4. Responsive User Interface', heading: HeadingLevel.HEADING_1 }),
  paragraph('The interface is built with responsive CSS layouts for the public catalogue, dashboard, forms, messaging experience, cards, and footer. At narrow widths, large grids reduce from four to two and then one column, the hero image is simplified, and search controls stack vertically.'),
  paragraph('The header was specifically enhanced for smaller screens. The original desktop navigation remains visible on larger screens. On screens at or below 800px, a compact, accessible menu button opens the complete navigation list—including Messages, Dashboard, Profile, and Notifications for signed-in users—so that mobile users do not lose access to navigation items. The menu reports its expanded state to assistive technology and closes after a link is selected.'),
  new Paragraph({ text: '5. Technical Architecture', heading: HeadingLevel.HEADING_1 }),
  table(['Layer', 'Technology and responsibility'], [
    ['Presentation', 'Next.js 15 App Router and React 18 pages/components render public screens, account screens, dashboards, and responsive UI.'],
    ['Application API', 'Next.js route handlers implement authentication, listings, bookings, messages, reviews, notifications, profiles, billing, and uploads.'],
    ['Custom server', 'server.js starts the Next.js application and upgrades authenticated /ws connections to WebSockets for realtime events.'],
    ['Persistence', 'Prisma provides typed access to a PostgreSQL database. The schema and migration history live in prisma/.'],
    ['External services', 'Mapbox provides maps; Cloudinary supports image-upload signing; SendGrid supports email; Google supports OAuth; Paystack supports payments and subscriptions.'],
  ]),
  heading('Project structure', HeadingLevel.HEADING_2),
  paragraph('app/ contains pages, shared components, styling, and route handlers. app/api/ groups server endpoints by capability. app/dashboard/ contains landlord-facing management and billing screens. lib/ contains reusable authentication, database, availability, email, entitlement, HTTP, and event helpers. prisma/ contains the database schema and migration history. server.js hosts Next.js and the WebSocket upgrade endpoint.'),
  new Paragraph({ text: '6. Data Model', heading: HeadingLevel.HEADING_1 }),
  paragraph('PostgreSQL is accessed through Prisma. The main entities and relationships are:'),
  table(['Entity', 'Purpose'], [
    ['User', 'Stores identity, role, profile information, verification state, credentials/OAuth identifier, payment subaccount, and relationships to listings, bookings, messages, subscriptions, payments, and notifications.'],
    ['Listing', 'A landlord-owned room listing containing display details, arrays of amenities/photos, availability JSON, trial date, and lifecycle status.'],
    ['Booking', 'Connects tenant and listing with dates, note, status, match timestamp, optional lease amount, and optional payment.'],
    ['Conversation and Message', 'Connect tenants and landlords, optionally in relation to a listing, and persist secure conversation messages.'],
    ['Review', 'Stores a rating and comment from a user for a listing.'],
    ['Payment and Subscription', 'Track rental, listing, success-fee, and subscription payments; record references, amounts, agency fee, and payment status.'],
    ['Notification', 'Stores user-specific alerts and their read status.'],
    ['EmailVerificationToken', 'Stores hashed, expiring verification tokens for email-confirmation workflows.'],
  ]),
  new Paragraph({ text: '7. API Coverage', heading: HeadingLevel.HEADING_1 }),
  paragraph('The following route groups are implemented under app/api/:'),
  bullet('Authentication: /api/auth/register, login, logout, me, Google OAuth, email verification, and verification resend.'),
  bullet('Marketplace: /api/listings, /api/listings/[id], /api/bookings, and /api/bookings/[id]/match.'),
  bullet('Communication: /api/messages, /api/notifications, and /api/realtime, with WebSocket delivery at /ws.'),
  bullet('Account and trust: /api/profile and /api/reviews.'),
  bullet('Revenue and payments: /api/subscriptions, /api/dashboard/earnings, Paystack initialize/verify/webhook/banks/subaccount routes, and /api/uploads/signature.'),
  new Paragraph({ text: '8. Security and Reliability Considerations', heading: HeadingLevel.HEADING_1 }),
  bullet('Passwords are hashed with bcrypt before persistence; plaintext passwords are never stored.'),
  bullet('Session tokens are signed JWTs stored in httpOnly, sameSite=lax cookies. The secure cookie attribute is enabled in production.'),
  bullet('Server-side route handlers use the authenticated session to identify the user and enforce ownership/role checks on protected actions.'),
  bullet('Email verification tokens are hashed and have expiry times.'),
  bullet('Payment webhook payloads are validated using an HMAC SHA-512 signature before payment state is updated.'),
  bullet('Payment initialization prevents duplicate completed/awaiting payment records for the same booking.'),
  bullet('Secrets are sourced from environment variables and are excluded from the supplied environment template.'),
  new Paragraph({ text: '9. Monetisation Design', heading: HeadingLevel.HEADING_1 }),
  paragraph('The MVP supports the monetisation direction in the brief. A landlord receives a two-day free listing trial. The billing interface exposes Pro Landlord (₦5,000/month) and Enterprise Agency (₦7,000/month) plans, with plan codes configured in Paystack. For a confirmed tenancy, the system calculates 3% of the rental amount as the agency fee. The tenant pays the advertised amount in Naira; the payment payload allocates the 3% charge to the platform and sends the remaining amount to the landlord subaccount.'),
  new Paragraph({ text: '10. Local Installation and Configuration', heading: HeadingLevel.HEADING_1 }),
  paragraph('Prerequisites: Node.js 18.18+ (Node 20+ recommended), npm, and PostgreSQL. Install dependencies, copy the supplied .env.example to .env, set DATABASE_URL and JWT_SECRET at minimum, then generate Prisma and apply migrations.'),
  new Paragraph({ children: [text('npm install\ncp .env.example .env\nnpm run db:generate\nnpm run db:migrate\nnpm run dev', { font: 'Consolas', size: 19, color: '1E342C' })], shading: { fill: 'F3F6F1' }, spacing: { before: 80, after: 150 }, indent: { left: 240, right: 240 } }),
  paragraph('Optional service credentials enable their respective features: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; Cloudinary cloud name/API key/API secret; SendGrid API key and sender information; Google client ID/client secret; and Paystack secret, webhook secret, Pro plan code, and Enterprise plan code. The .env.example file is included as a safe configuration template.'),
  new Paragraph({ text: '11. Build Verification and Delivery Status', heading: HeadingLevel.HEADING_1 }),
  paragraph('The project was verified with npm run build. The Next.js production build compiled successfully, completed type validation, generated all static pages, and collected build traces. The build reported a workspace-root warning caused by an additional package-lock.json outside this project directory; it did not prevent a successful build.'),
  new Paragraph({ text: '12. MVP Boundaries and Recommended Next Steps', heading: HeadingLevel.HEADING_1 }),
  bullet('Add unit, integration, and browser-based end-to-end tests for authentication, bookings, payments, and critical authorization paths.'),
  bullet('Add rate limiting, centralised error monitoring, audit logging, and production observability.'),
  bullet('Perform an independent security assessment before public launch, especially for payment, uploads, OAuth redirects, and WebSocket access.'),
  bullet('Complete production configuration for custom domain, HTTPS, email sender authentication, Paystack webhooks, Cloudinary upload restrictions, and backup/recovery procedures.'),
  bullet('Use pilot feedback to prioritise enhancements such as richer search facets, saved listings, background checks, landlord verification, analytics, and expanded support workflows.'),
  new Paragraph({ text: '13. Conclusion', heading: HeadingLevel.HEADING_1 }),
  paragraph('SingleRents delivers the core Seedfundin MVP proposition: landlords can list and manage rooms while tenants can discover rooms, communicate, request bookings, build trust through reviews, and participate in a monetised rental flow. The application is structured as a maintainable Next.js and PostgreSQL product foundation, with integrations and security controls appropriate to an MVP and a clear path to production hardening.'),
];

const document = new Document({
  styles: { default: { document: { run: { font: 'Aptos', size: 22, color: '243B34' } }, heading1: { run: { font: 'Aptos Display', size: 30, bold: true, color: brand }, paragraph: { spacing: { before: 300, after: 130 } } }, heading2: { run: { font: 'Aptos Display', size: 24, bold: true, color: accent }, paragraph: { spacing: { before: 210, after: 100 } } } } },
  sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [text('SingleRents MVP Technical Documentation  |  Page ', { size: 16, color: muted }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: muted })] })] }) }, children }],
});

Packer.toBuffer(document).then((buffer) => {
  fs.writeFileSync(output, buffer);
  console.log(`Created ${output}`);
});
