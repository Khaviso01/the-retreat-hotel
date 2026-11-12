
import {
  Router,
  type Request,
  type Response,
  type NextFunction
} from 'express';
import { randomUUID } from 'node:crypto';
import {
  BookingStatus,
  PaymentStatus
} from '@prisma/client';
import { z, ZodError } from 'zod';
import { prisma } from '../services/prisma.js';
import {
  requireAuth,
  type AuthRequest
} from '../middleware/auth.js';
import {
  initializePayment,
  verifyPayment
} from '../services/paystack.js';

// Initialize the Express router for payment processing.
const router = Router();

// Validation schema for payment requests using Zod.
const paymentSchema = z.object({
  bookingId: z.string().min(1)
});

// Handle asynchronous routes and forward errors to Express.
function asyncRoute(
  handler: (req: AuthRequest, res: Response) => Promise<void>
) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

// POST /api/payments/initialize
router.post(
  '/initialize',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { bookingId } = paymentSchema.parse(req.body);

    // Retrieve the booking for the authenticated user, including the user's email for payment processing.
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: req.auth!.sub
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    // If the booking does not exist, respond with a 404 error.
    if (!booking) {
      res.status(404).json({
        error: 'Booking not found.'
      });
      return;
    }

    // Check the booking's status and payment status to ensure it can be paid
    // Respond with appropriate errors if the booking is cancelled, already paid, or not pending.
    if (booking.status === BookingStatus.CANCELLED) {
      res.status(409).json({
        error: 'Cancelled bookings cannot be paid.'
      });
      return;
    }

    // Check if the booking has already been paid. If so, respond with a 409 conflict error.
    if (booking.paymentStatus === PaymentStatus.SUCCESS) {
      res.status(409).json({
        error: 'This booking has already been paid.'
      });
      return;
    }
    // Check if the booking is still pending. If not, respond with a 409 conflict error.
    if (booking.status !== BookingStatus.PENDING) {
      res.status(409).json({
        error: 'Only pending bookings can be paid.'
      });
      return;
    }

    // Reserve one unique reference for this booking.
    const reference =
      booking.paymentReference || `TRPAY-${randomUUID()}`;

      // If the booking does not already have a payment reference, attempt to reserve one by updating the booking in the database
      // If another request has already reserved a reference, respond with a 409 conflict error.
    if (!booking.paymentReference) {
      const updated = await prisma.booking.updateMany({
        where: {
          id: booking.id,
          paymentReference: null,
          paymentStatus: PaymentStatus.PENDING,
          status: BookingStatus.PENDING
        },
        data: {
          paymentReference: reference
        }
      });

      if (updated.count !== 1) {
        res.status(409).json({
          error: 'Payment is already being initialized. Please retry.'
        });
        return;
      }
    }

    // Read the reference again in case another request
    // reserved one concurrently.
    const current = await prisma.booking.findUnique({
      where: { id: booking.id }
    });

    // If the booking's payment state has changed since the initial check, respond with a 409 conflict error.
    if (
      !current ||
      current.status !== BookingStatus.PENDING ||
      current.paymentStatus !== PaymentStatus.PENDING ||
      current.paymentReference !== reference
    ) {
      res.status(409).json({
        error: 'Booking payment state has changed.'
      });
      return;
    }

    // The amount comes from PostgreSQL, never the browser.
    const payment = await initializePayment({
      email: booking.user.email,
      amount: booking.total,
      reference,
      bookingId: booking.id
    });

    if (payment.reference !== reference) {
      res.status(502).json({
        error: 'Payment reference mismatch.'
      });
      return;
    }

    res.json({
      bookingId: booking.id,
      reference: payment.reference,
      authorizationUrl: payment.authorization_url
    });
  })
);

// POST /api/payments/verify
router.post(
  '/verify',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { bookingId } = paymentSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: req.auth!.sub
      }
    });

    if (!booking) {
      res.status(404).json({
        error: 'Booking not found.'
      });
      return;
    }

    if (
      booking.paymentStatus === PaymentStatus.SUCCESS &&
      booking.status === BookingStatus.CONFIRMED
    ) {
      res.json({
        success: true,
        bookingId: booking.id,
        status: 'confirmed',
        paymentStatus: 'success'
      });
      return;
    }

    if (!booking.paymentReference) {
      res.status(400).json({
        error: 'Payment has not been initialized.'
      });
      return;
    }

    // Ask Paystack for the actual transaction result.
    const payment = await verifyPayment(
      booking.paymentReference
    );

    // If Paystack indicates that the payment was not successful
    if (
      payment.reference !== booking.paymentReference ||
      payment.currency !== 'ZAR' ||
      payment.amount !== booking.total * 100
    ) {
      res.status(409).json({
        error: 'Payment details do not match this booking.'
      });
      return;
    }

    // If Paystack indicates that the payment was not successful
    // respond with a 409 conflict error and include the payment status.
    if (payment.status !== 'success') {
      res.status(409).json({
        error: 'Payment has not been completed.',
        paymentStatus: payment.status
      });
      return;
    }

    // Ensure that Paystack returned a timestamp for when the payment was made.
    if (!payment.paid_at) {
      res.status(409).json({
        error: 'Paystack did not return a payment timestamp.'
      });
      return;
    }

    // Confirm once, even if verification is requested twice.
    const confirmed = await prisma.$transaction(async tx => {
      const result = await tx.booking.updateMany({
        where: {
          id: booking.id,
          userId: req.auth!.sub,
          paymentReference: payment.reference,
          paymentStatus: PaymentStatus.PENDING,
          status: BookingStatus.PENDING
        },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          status: BookingStatus.CONFIRMED,
          paidAt: new Date(payment.paid_at!)
        }
      });

      // If the booking was successfully confirmed, create a notification for the user about the successful payment.
      if (result.count === 1) {
        await tx.notification.create({
          data: {
            userId: booking.userId,
            title: 'Payment successful',
            message:
              `Payment received. Booking ${booking.id} is confirmed.`,
            read: false
          }
        });
      }

      return result.count === 1;
    });

    // If the booking was not confirmed in this transaction, check the latest state to ensure it is indeed confirmed and paid.
    if (!confirmed) {
      const latest = await prisma.booking.findUnique({
        where: { id: booking.id }
      });

      if (
        latest?.paymentStatus !== PaymentStatus.SUCCESS ||
        latest.status !== BookingStatus.CONFIRMED
      ) {
        res.status(409).json({
          error:
            'Payment was successful, but the booking needs reconciliation. Contact support.'
        });
        return;
      }
    }

    // Respond with success after confirming the booking and payment status.
    res.json({
      success: true,
      bookingId: booking.id,
      status: 'confirmed',
      paymentStatus: 'success'
    });
  })
);

// Handle payment route errors.
router.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid payment request.',
        details: error.flatten()
      });
      return;
    }

    // Handle unexpected errors from Paystack or the database.
    console.error('Payment processing error:', error);

    // Respond with a 502 Bad Gateway error for payment service issues.
    res.status(502).json({
      error:
        'Payment service unavailable or payment processing failed. Please try again.'
    });
  }
);

export default router;
