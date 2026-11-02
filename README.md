# The Retreat Hotels & Resorts

The Retreat Hotels & Resorts** is a full-stack hotel booking application built with React, TypeScript, Node.js, and Express. It features a responsive guest website, an admin dashboard, Google OAuth authentication, secure Paystack payments, and hotel reservation management. The application uses Prisma ORM with PostgreSQL hosted on Neon for persistent data storage, with the frontend deployed on Vercel and the backend on Render.

**Live application:** https://the-retreat-hotel.vercel.app  
**API health check:** https://the-retreat-api.onrender.com/api/health

## Preview

<img src="client/assets/the-retreat-preview.png" alt="Alt text" width="600">

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, Context API, CSS, Lucide React |
| Backend | Node.js, Express, TypeScript, Zod, JWT, bcryptjs, CORS |
| Authentication | Email/password and Google OAuth |
| Database | PostgreSQL (Neon), Prisma ORM |
| Payments | Paystack |
| Hosting | Vercel (frontend), Render (API), Neon (database) |
| Development | npm, TypeScript, tsx |

## Features and responsibilities

### Guests

- Browse hotel branches, photo galleries, room types, prices, amenities, and policies.
- Search and filter accommodation by location, dates, guest count, and other available filters.
- Register and sign in using email/password or Google OAuth.
- Save favourite branches and share accommodation details.
- Book rooms, pay through Paystack, and review booking status and history.
- Cancel eligible bookings, submit reviews, and read notifications.

### Administrators

- Review booking, room, branch, and user information in the admin dashboard.
- Create, edit, and delete rooms; create and update hotel branches.
- Review reservations and manage permitted booking statuses.
- View registered users and guest reviews.
- Send guest notifications and access reports and settings screens.

> Some dashboard settings are interface-only; check the corresponding API route before treating an action as fully implemented.

## Requirements

- Node.js 20 or newer and npm
- A PostgreSQL database (local or hosted)
- Google OAuth web-client credentials for Google Sign-In
- Paystack credentials for payment processing

## Run locally

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Khaviso01/the-retreat-hotel.git
   cd the-retreat-hotel
   npm install
   ```

   Install workspace dependencies separately if your root install does not install them:

   ```bash
   npm install --prefix client
   npm install --prefix server
   ```

2. Create `server/.env` and configure the backend. **Use your own credentials; never commit `.env` files.**

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

   The database URL is an example, not a working connection string. For local Google OAuth, register `http://localhost:4000/api/auth/google/callback` as an authorized redirect URI in Google Cloud.

3. Configure the frontend in `client/.env`:

   ```dotenv
   VITE_API_URL=http://localhost:4000/api
   ```

4. Apply the existing Prisma migrations from the server workspace:

   ```bash
   cd server
   npx prisma generate
   npx prisma migrate deploy
   cd ..
   ```

   Migrations create the schema; they do not automatically populate hotel listings. Import or seed the branch and room data using the scripts provided by your current repository version.

5. Start the application. If your root `package.json` has a combined `dev` script, run `npm run dev`. Otherwise, open two terminals:

   ```bash
   npm run dev --prefix server
   ```

   ```bash
   npm run dev --prefix client
   ```

6. Open the application:

   | Service | Local URL |
   | --- | --- |
   | Guest website | http://localhost:5173 |
   | Admin dashboard | http://localhost:5173/admin |
   | API health check | http://localhost:4000/api/health |

   Admin pages require an account with the `admin` role. Do not publish administrator passwords in the README.

## Authentication

Email/password accounts use hashed passwords and JWT-based sessions. Google OAuth uses Google's identity verification and an application-specific callback to sign in Google-linked accounts.

- `GET /api/auth/google` starts the Google authorization flow.
- `GET /api/auth/google/callback` processes Google's response.
- `POST /api/auth/google/exchange` exchanges a short-lived login code for an application session.

A Google account with the same email as an existing password-only account is **not automatically linked**. Sign in with the original method unless a secure account-linking flow has been implemented.

## Booking and payments

Guests select a room, enter stay dates and guest count, and create a reservation. The backend validates booking details and initiates payment through Paystack. The frontend returns through `/payment/callback`, while the backend is responsible for verifying payment status before confirming a paid booking.

**Important:** A successful payment-page redirect alone does not prove a payment was verified. Test the complete payment and booking-status flow in your Paystack test environment before accepting live payments. Consult the current backend for pricing, service fees, availability rules, and cancellation conditions.

## API overview

All endpoints are prefixed with `/api`. Protected routes use `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health check |
| POST | `/api/auth/register` | Create guest account |
| POST | `/api/auth/login` | Email/password sign-in |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/google/exchange` | Complete Google sign-in |
| GET / PATCH | `/api/auth/me` | View / update profile |
| GET | `/api/branches` | List hotel branches |
| GET | `/api/branches/:id` | Branch details |
| GET | `/api/rooms` | List and filter rooms |
| GET | `/api/rooms/:id` | Room details |
| GET | `/api/search` | Search accommodation |
| POST / GET | `/api/bookings` | Create / list bookings |
| GET / PATCH | `/api/bookings/:id` | View / update booking |
| GET | `/api/favourites` | List favourites |
| POST / DELETE | `/api/favourites/:branchId` | Add / remove favourite |
| GET / POST | `/api/reviews` | View / submit reviews |
| GET | `/api/notifications` | View notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |
| POST | `/api/payments/initialize` | Initialize Paystack payment |
| POST | `/api/payments/webhook` | Receive Paystack webhook |
| Various | `/api/admin/*` | Protected administration operations |

See `server/src/routes/` for the complete route definitions, authorization rules, and request validation.

## Project structure

```text
the-retreat-hotel/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── guest/
│   │   │   └── shared/
│   │   ├── context/
│   │   │   └── AppContext.tsx
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── GuestPages.tsx
│   │   │   ├── AdminPages.tsx
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
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── package.json
├── vercel.json
├── package.json
└── README.md
```

## Production deployment

**Frontend — Vercel**

```dotenv
VITE_API_URL=https://the-retreat-api.onrender.com/api
```

**Backend — Render**

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

Configure the Google OAuth redirect URI as `https://the-retreat-api.onrender.com/api/auth/google/callback`. Configure Paystack callback and webhook URLs according to the current payment routes. Run Prisma migrations against the intended database before starting the production API.

The repository's `vercel.json` should rewrite frontend paths to `index.html` so direct visits to React Router pages, including OAuth and payment callbacks, work correctly.

## Troubleshooting

- **No hotels appear:** Check `/api/branches`, the PostgreSQL connection, and whether branch/room data has been imported.
- **Database errors:** Check `DATABASE_URL`, Neon connectivity, and `npx prisma migrate deploy`.
- **Google Sign-In fails:** Verify Google credentials, authorized redirect URIs, backend OAuth routes, and frontend callback route. Existing password-only emails are not automatically linked.
- **Frontend cannot reach API:** Verify `VITE_API_URL`, `CLIENT_URL`, and Render service availability.
- **Payment callback returns 404:** Check the React route and Vercel SPA rewrite.
- **Payment remains pending:** Inspect Paystack verification, webhook handling, and the booking's stored payment status.
- **Admin access denied:** Sign in with an account whose database role is `ADMIN`.

## License

No license has been specified for this project.
