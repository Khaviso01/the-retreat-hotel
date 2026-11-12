
import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  BookingStatus,
  PaymentStatus
} from '@prisma/client';

import { prisma } from '../services/prisma.js';
import { verifyPayment } from '../services/paystack.js';

// Initialize the Express router for handling Paystack webhooks.
const router = Router();

// Define the structure of the Paystack webhook event for type safety.
type PaystackWebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
  };
};

// POST /api/paystack/webhook
router.post('/', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.header('x-paystack-signature');

    // Validate the webhook request by checking the signature against the expected HMAC hash.
    if (!secret || !signature || !Buffer.isBuffer(req.body)) {
      res.status(401).json({ error: 'Invalid webhook request.' });
      return;
    }

    // Compute the expected HMAC hash of the request body using the Paystack secret key.
    const expected = createHmac('sha512', secret)
      .update(req.body)
      .digest('hex');

      // Compare the supplied signature with the calculated HMAC hash in a timing-safe manner to prevent timing attacks.
    const supplied = Buffer.from(signature, 'hex');
    const calculated = Buffer.from(expected, 'hex');

    // If the signature does not match, respond with a 401 Unauthorized error.
    if (
      supplied.length !== calculated.length ||
      !timingSafeEqual(supplied, calculated)
    ) {
      res.status(401).json({ error: 'Invalid webhook signature.' });
      return;
    }

    // Parse the webhook event from the request body.
    const event = JSON.parse(
      req.body.toString('utf8')
    ) as PaystackWebhookEvent;

    if (event.event !== 'charge.success') {
      res.sendStatus(200);
      return;
    }

    // Extract the payment reference from the webhook event data to identify the corresponding booking in the database.
    const reference = event.data?.reference;

    if (!reference) {
      res.status(400).json({ error: 'Missing payment reference.' });
      return;
    }

    // Look up the booking in the database using the payment reference provided by Paystack.
    const booking = await prisma.booking.findUnique({
      where: { paymentReference: reference }
    });

    // If the booking is not found, respond with a 404 Not Found error and log the issue for further investigation.
    if (!booking) {
      console.error('Webhook booking not found:', reference);
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    // Check the payment independently with Paystack.
    const payment = await verifyPayment(reference);

    if (
      payment.status !== 'success' ||
      payment.reference !== reference ||
      payment.currency !== 'ZAR' ||
      payment.amount !== booking.total * 100 ||
      !payment.paid_at
    ) {
      console.error('Webhook payment verification failed:', reference);
      res.status(409).json({ error: 'Payment verification failed.' });
      return;
    }

    //  If the booking is already confirmed and paid, respond with a 200 OK status to acknowledge the webhook.
    if (
      booking.paymentStatus === PaymentStatus.SUCCESS &&
      booking.status === BookingStatus.CONFIRMED
    ) {
      res.sendStatus(200);
      return;
    }

    // Do not silently confirm a cancelled booking.
    if (booking.status !== BookingStatus.PENDING) {
      console.error(
        'Paid booking requires reconciliation:',
        booking.id,
        booking.status
      );
      res.status(409).json({
        error: 'Booking requires payment reconciliation.'
      });
      return;
    }

    // Update the booking's payment status and confirmation status in a single transaction to ensure data integrity.
    await prisma.$transaction(async tx => {
      const updated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          paymentReference: reference,
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
      if (updated.count === 1) {
        await tx.notification.create({
          data: {
            userId: booking.userId,
            title: 'Booking confirmed',
            message:
              `Payment received. Booking ${booking.id} is confirmed.`,
            read: false
          }
        });
      }
    });

    // Respond with a 200 OK status to acknowledge the successful processing of the webhook event.
    res.sendStatus(200);
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({
      error: 'Unable to process webhook.'
    });
  }
});

export default router;
