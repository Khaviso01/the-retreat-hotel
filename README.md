# The Retreat Hotels & Suites

**A full-stack hotel booking and management application.**

The Retreat Hotels & Suites is a responsive hotel reservation platform built with React, TypeScript, Node.js, and Express. Guests can explore hotel branches, compare rooms, manage bookings, and pay securely through Paystack. A separate administration dashboard supports hotel operations. The application uses Prisma ORM and PostgreSQL hosted on Neon, with the frontend hosted on Vercel and the backend on Render.

**Live application:** https://the-retreat-hotel.vercel.app  
**API health check:** https://the-retreat-api.onrender.com/api/health

## Preview

![The Retreat application preview](client/assets/the-retreat-preview.png)

> The Retreat's updated visual identity uses an elegant black logo with a transparent background. Add the final logo asset to your project and reference its actual path wherever the brand appears. The preview above retains the path documented in the original README.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, Context API, CSS, Lucide React |
| Backend | Node.js, Express, TypeScript, Zod, JWT, bcryptjs, CORS |
| Authentication | Email/password, Google OAuth, JWT-based sessions |
| Database | PostgreSQL (Neon), Prisma ORM |
| Payments | Paystack |
| Hosting | Vercel (frontend), Render (API), Neon (database) |
| Development | npm, TypeScript, tsx |

## Features

### Guest experience

- Browse hotel branches, photo galleries, room types, pricing, amenities, and policies.
- Search and filter accommodation by location, travel dates, guest count, and supported room filters.
- Register and sign in with email/password or Google OAuth.
- Save favourite branches and share accommodation details.
- Create reservations, complete Paystack checkout, and view booking history and status.
- Cancel eligible bookings, submit reviews, and read notifications.
- Access a responsive **Guest Profile Dashboard** with account information and shortcuts to bookings, favourites, notifications, and reviews.
- Manage account details through dedicated **Personal Information** and **Password & Security** pages.
- Sign out through a confirmation dialog.

### Guest account management

**Personal Information** (`/profile/personal-info`)

- Update the signed-in guest's full name.
- Display the registered email address as read-only.
- Validate names on the client and server (2–100 characters).
- Refresh the displayed profile information after a successful update.
- Provide loading, validation, error, and success feedback.

**Password & Security** (`/profile/security`)

- Require the current password before changing credentials.
- Validate a new password of 8–128 characters on the server.
- Confirm the new password in the frontend form.
- Prevent reuse of the existing password.
- Hash the replacement password with bcrypt before saving it.
- Show an appropriate error for accounts without a local password, including Google-only accounts.

Both pages are intended for authenticated guest accounts. The backend checks the JWT and the current database role before permitting changes. The guest profile page uses the dashboard as its main heading area, without a redundant “My Profile” title.

### Administration

- View bookings, rooms, branches, and registered users in the admin dashboard.
- Create, edit, and delete rooms; create and update hotel branches.
- Review reservations and manage permitted booking statuses.
- View guest reviews and send notifications.
- Access reporting and settings screens.
- Access a dedicated administrator profile area for supported account-detail and password updates.

> Some dashboard settings are interface-only. Confirm that a corresponding API route exists before treating an action as fully implemented.

## Requirements

- Node.js 20 or newer and npm.
- PostgreSQL database, locally or through a provider such as Neon.
- Google OAuth web-client credentials for Google Sign-In.
- Paystack credentials for payment processing.

## Run locally

### 1. Clone and install

```bash
git clone https://github.com/Khaviso01/the-retreat-hotel.git
cd the-retreat-hotel
npm install
```

If the root installation does not install both application dependencies, run:

```bash
npm install --prefix client
npm install --prefix server
```

### 2. Configure the backend

Create `server/.env` with your own credentials:

```dotenv
PORT=4000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
PAYSTACK_SECRET_KEY=your-paystack-secret-key
```

The database URL is an example, not a working connection string. **Never commit `.env` files or real credentials.** For local Google OAuth, register `http://localhost:4000/api/auth/google/callback` as an authorized redirect URI in Google Cloud.

### 3. Configure the frontend

Create `client/.env`:

```dotenv
VITE_API_URL=http://localhost:4000/api
```

### 4. Prepare PostgreSQL

```bash
cd server
npx prisma generate
npx prisma migrate deploy
cd ..
```

Migrations create database tables but do not necessarily populate hotel branches and rooms. Import or seed data using the scripts available in your repository version.

### 5. Start the application

If the root `package.json` provides a combined development script, run `npm run dev`. Otherwise, open two terminals:

```bash
npm run dev --prefix server
```

```bash
npm run dev --prefix client
```

| Service | Local URL |
| --- | --- |
| Guest website | http://localhost:5173 |
| Guest profile | http://localhost:5173/profile |
| Admin dashboard | http://localhost:5173/admin |
| API health check | http://localhost:4000/api/health |

Administrator pages require an account with the appropriate role. Do not publish administrator credentials in the README.

## Authentication and account security

Email/password accounts store bcrypt password hashes and use JWT-based authentication. Google OAuth verifies identity through Google and completes sign-in through an application-specific callback.

- `GET /api/auth/google` starts Google authorization.
- `GET /api/auth/google/callback` handles Google's response.
- `POST /api/auth/google/exchange` exchanges a short-lived login code for an application session.
- `requireAuth` validates bearer tokens, checks that the user still exists, and loads the current database role.
- Guest profile endpoints require an authenticated account with the `GUEST` role.
- Password changes verify the existing password and store only the new hash.

Google accounts with the same email as existing password-only accounts are **not automatically linked**. Use the original sign-in method unless a secure linking flow is implemented.

**Production security considerations:** Add rate limiting to password-change attempts and consider revoking older sessions after a password change. These protections are recommendations, not claims that they are already implemented.

## Booking and payments

Guests select a room, enter stay dates and guest count, and create a reservation. The backend validates booking details and initiates Paystack payment. The frontend returns through `/payment/callback`, while the backend verifies payment status before confirming paid bookings.

**Important:** A successful redirect from a payment page does not, by itself, prove that payment was verified. Test the complete payment and booking-status flow in Paystack's test environment before accepting live payments. Refer to the current backend for pricing, fees, availability, and cancellation rules.

## API overview

All endpoints below are prefixed with `/api`. Protected endpoints use the `Authorization: Bearer <token>` header.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health check |
| POST | `/api/auth/register` | Register a guest |
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/google/exchange` | Complete Google sign-in |
| GET / PATCH | `/api/auth/me` | View / update authenticated user profile |
| PATCH | `/api/guest/profile` | Update guest full name |
| PATCH | `/api/guest/profile/password` | Change guest password |
| GET | `/api/branches` | List branches |
| GET | `/api/branches/:id` | Branch details |
| GET | `/api/rooms` | List / filter rooms |
| GET | `/api/rooms/:id` | Room details |
| GET | `/api/search` | Search accommodation |
| POST / GET | `/api/bookings` | Create / list bookings |
| GET / PATCH | `/api/bookings/:id` | View / update booking |
| GET | `/api/favourites` | List favourites |
| POST / DELETE | `/api/favourites/:branchId` | Add / remove favourite |
| GET / POST | `/api/reviews` | View / submit reviews |
| GET | `/api/notifications` | View notifications |
| PATCH | `/api/notifications/:id/read` | Mark a notification as read |
| POST | `/api/payments/initialize` | Initialize Paystack payment |
| POST | `/api/payments/webhook` | Receive Paystack webhook |
| Various | `/api/admin/*` | Protected administrative operations |
| Various | `/api/admin/profile/*` | Administrator profile operations |

For complete request validation, authorization requirements, and response shapes, consult `server/src/routes/`.

## Project structure

```text
the-retreat-hotel/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── guest/
│   │   │   │   ├── GuestProfileDashboard.tsx
│   │   │   │   └── GuestProfileDashboard.css
│   │   │   └── shared/
│   │   ├── context/
│   │   │   └── AppContext.tsx
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── GuestPages.tsx
│   │   │   ├── AdminPages.tsx
│   │   │   ├── GuestPersonalInfo.tsx
│   │   │   ├── GuestSecurity.tsx
│   │   │   ├── GuestAccount.css
│   │   │   ├── AdminProfile.tsx
│   │   │   ├── GoogleCallback.tsx
│   │   │   └── PaymentCallback.tsx
│   │   └── App.tsx
│   └── package.json
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── guestProfile.ts
│   │   │   └── adminProfile.ts
│   │   ├── services/
│   │   │   └── prisma.ts
│   │   └── index.ts
│   └── package.json
├── vercel.json
├── package.json
└── README.md
```

The tree highlights key application files rather than every route, component, and configuration file.

## Production deployment

### Frontend — Vercel

```dotenv
VITE_API_URL=https://the-retreat-api.onrender.com/api
```

### Backend — Render

```dotenv
NODE_ENV=production
CLIENT_URL=https://the-retreat-hotel.vercel.app
SERVER_URL=https://the-retreat-api.onrender.com
DATABASE_URL=your-production-postgresql-url
JWT_SECRET=your-production-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
PAYSTACK_SECRET_KEY=your-paystack-secret-key
```

Configure the Google OAuth redirect URI as `https://the-retreat-api.onrender.com/api/auth/google/callback`. Configure Paystack callback and webhook URLs according to the current payment routes. Apply Prisma migrations to the intended production database before starting the API.

Ensure `vercel.json` rewrites frontend paths to `index.html` so direct visits to React Router routes, including account settings, OAuth, and payment callbacks, work correctly.

## Troubleshooting

- **No hotels appear:** Check `/api/branches`, PostgreSQL connectivity, and whether branch and room data has been seeded.
- **Database errors:** Check `DATABASE_URL`, Neon connectivity, and `npx prisma migrate deploy`.
- **Google Sign-In fails:** Verify Google credentials, redirect URIs, backend OAuth routes, and frontend callback handling.
- **Frontend cannot reach the API:** Verify `VITE_API_URL`, `CLIENT_URL`, and Render availability.
- **Guest profile returns 401:** Verify that the request includes a valid bearer token and the account still exists.
- **Guest profile returns 403:** Confirm the account has the `GUEST` role; administrator accounts cannot use guest-only endpoints.
- **Password change fails:** Confirm the current password is correct. Accounts without a local password cannot use the change-password endpoint.
- **Profile name does not update in the UI:** Check the `PATCH /api/guest/profile` response and synchronization with React context and local storage.
- **Payment callback returns 404:** Check the React route and Vercel SPA rewrite.
- **Payment remains pending:** Inspect Paystack verification, webhook processing, and the stored booking payment status.
- **Admin access denied:** Sign in with an account whose database role is `ADMIN`.

## License

No license has been specified for this project.