
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { CLIENT_URL, PORT } from './config/env.js';

import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import favouriteRoutes from './routes/favourites.js';
import notificationRoutes from './routes/notifications.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import paymentsRouter from './routes/payments.js';
import paystackWebhookRouter from './routes/paystackWebhook.js';
import searchRoutes from './routes/search.js';
import adminProfileRouter from './routes/adminProfile.js';
import guestProfileRoutes from './routes/guestProfile.js';

// Create an Express application
const app = express();

// Enable CORS for requests from the client application
app.use(cors({ origin: CLIENT_URL, credentials: true }));

// Paystack webhook route must be defined before the JSON body parser middleware
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paystackWebhookRouter
);

app.use(express.json());

// Existing API routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/search', searchRoutes);
app.use('/api/admin/profile', adminProfileRouter);
app.use('/api/guest', guestProfileRoutes);

// Health check route
app.get('/api/health', (_req, res) =>
  res.json({ ok: true })
);

// Catch-all route for undefined endpoints
app.use((_req, res) =>
  res.status(404).json({ error: 'Route not found.' })
);

// Start the server and listen on the specified port
app.listen(PORT, () =>
  console.log(`The Retreat API: http://localhost:${PORT}`)
);
