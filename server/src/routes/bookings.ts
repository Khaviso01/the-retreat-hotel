
import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../services/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

// Create an Express router for booking management.
const router = Router();

// Constants for date calculations and service fees.
const DAY_MS = 86_400_000;
const SERVICE_FEE = 150;

// Custom error class for booking cancellation conflicts.
class BookingCancellationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 409
  ) {
    super(message);
    this.name = 'BookingCancellationError';
  }
}

// Validate booking details from the frontend.
const bookingSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1)
});

// Validate booking status updates from the frontend.
const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled'])
});

// Convert PostgreSQL booking records to the existing API format.
function formatBooking(booking: {
  id: string;
  userId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  total: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: booking.id,
    userId: booking.userId,
    roomId: booking.roomId,
    checkIn: booking.checkIn.toISOString().slice(0, 10),
    checkOut: booking.checkOut.toISOString().slice(0, 10),
    guests: booking.guests,
    total: booking.total,
    status: booking.status.toLowerCase(),
    paymentStatus: booking.paymentStatus.toLowerCase(),
    paymentReference: booking.paymentReference,
    paidAt: booking.paidAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
  };
}


// Validate dates strictly in YYYY-MM-DD format.
function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  // Create a Date object in UTC to avoid timezone issues.
  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

// Convert frontend booking statuses to Prisma enums.
function toBookingStatus(
  status: 'pending' | 'confirmed' | 'cancelled'
): BookingStatus {
  switch (status) {
    case 'pending':
      return BookingStatus.PENDING;
    case 'confirmed':
      return BookingStatus.CONFIRMED;
    case 'cancelled':
      return BookingStatus.CANCELLED;
  }
}

// Handle asynchronous Express routes with authentication support.
function asyncRoute(
  handler: (req: AuthRequest, res: Response) => Promise<void>
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

// POST /api/bookings
// Create a booking and notification in PostgreSQL.
router.post(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const values = bookingSchema.parse(req.body);

    // Validate check-in and check-out dates, ensuring they are in the correct format and logical order.
    const checkIn = parseDate(values.checkIn);
    const checkOut = parseDate(values.checkOut);

    // If either date is invalid, respond with a 400 error indicating the expected format.
    if (!checkIn || !checkOut) {
      res.status(400).json({
        error: 'Dates must use YYYY-MM-DD format.'
      });
      return;
    }

    // Ensure that the check-in date is not in the past and that the check-out date is after the check-in date.
    const today = new Date().toISOString().slice(0, 10);

    if (values.checkIn < today) {
      res.status(400).json({
        error: 'Check-in cannot be in the past.'
      });
      return;
    }

    // Calculate the number of nights for the booking and ensure that the check-out date is after the check-in date.
    const nights =
      (checkOut.getTime() - checkIn.getTime()) / DAY_MS;

    if (nights < 1) {
      res.status(400).json({
        error: 'Check-out must be after check-in.'
      });
      return;
    }

    // Serializable transactions help prevent concurrent double bookings.
    // Retry transactions that PostgreSQL rejects due to write conflicts.
    let booking;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        booking = await prisma.$transaction(
          async (tx) => {
            const room = await tx.room.findUnique({
              where: { id: values.roomId }
            });

            if (!room || !room.available) {
              throw new Error('Room unavailable.');
            }

            if (values.guests > room.capacity) {
              throw new Error('Room capacity exceeded.');
            }

            // Look for active reservations with overlapping dates.
            const overlap = await tx.booking.findFirst({
              where: {
                roomId: room.id,
                status: {
                  not: BookingStatus.CANCELLED
                },
                checkIn: { lt: checkOut },
                checkOut: { gt: checkIn }
              }
            });

            if (overlap) {
              throw new Error(
                'Room already booked for these dates.'
              );
            }

            const id = `TR-${randomUUID().slice(0, 12)}`;

            const created = await tx.booking.create({
              data: {
                id,
                reference: id,
                userId: req.auth!.sub,
                roomId: room.id,
                checkIn,
                checkOut,
                guests: values.guests,
                total: room.price * nights + SERVICE_FEE,
                status: BookingStatus.PENDING
              }
            });

            // Create a notification within the same transaction.
            await tx.notification.create({
              data: {
                userId: created.userId,
                title: 'Booking requested',
                message:
                  `Reservation ${created.id} is pending confirmation.`,
                read: false
              }
            });

            return created;
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable
          }
        );

        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        ) {
          continue;
        }

        if (
          error instanceof Error &&
          [
            'Room unavailable.',
            'Room capacity exceeded.',
            'Room already booked for these dates.'
          ].includes(error.message)
        ) {
          res.status(409).json({ error: error.message });
          return;
        }

        throw error;
      }
    }

    if (!booking) {
      res.status(409).json({
        error: 'Booking conflict. Please try again.'
      });
      return;
    }

    res.status(201).json(formatBooking(booking));
  })
);

// GET /api/bookings
// Guests see their own bookings; admins see all bookings.
router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where:
        req.auth!.role === 'admin'
          ? {}
          : { userId: req.auth!.sub },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(bookings.map(formatBooking));
  })
);

// GET /api/bookings/:id
router.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: {
        id: String(req.params.id),
        ...(req.auth!.role !== 'admin' && {
          userId: req.auth!.sub
        })
      }
    });

    if (!booking) {
      res.status(404).json({
        error: 'Booking not found.'
      });
      return;
    }

    res.json(formatBooking(booking));
  })
);

// PATCH /api/bookings/:id
// Admins manage statuses; guests may cancel their own bookings.
router.patch(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    if (status === 'confirmed') {
  res.status(403).json({
    error: 'Bookings are confirmed only after verified payment.',
  });
  return;
}

    if (
      req.auth!.role !== 'admin' &&
      status !== 'cancelled'
    ) {
      res.status(403).json({
        error: 'Only admins can approve bookings.'
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: String(req.params.id),
          ...(req.auth!.role !== 'admin' && {
            userId: req.auth!.sub
          })
        }
      });

      if (!booking) {
        return null;
      }

      // Update only when the current status still matches.
      const result = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: booking.status
        },
        data: {
          status: toBookingStatus(status)
        }
      });

      if (result.count !== 1) {
        throw new Error(
          'Booking was changed by another request. Please retry.'
        );
      }

      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: 'Booking updated',
          message: `${booking.id} is now ${status}.`,
          read: false
        }
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id }
      });
    });

    if (!updated) {
      res.status(404).json({
        error: 'Booking not found.'
      });
      return;
    }

    res.json(formatBooking(updated));
  })
);

// Handle validation and booking errors consistently.
router.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid booking information.',
        details: error.flatten()
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message.startsWith('Booking was changed')
    ) {
      res.status(409).json({
        error: error.message
      });
      return;
    }

    console.error('Booking API error:', error);

    res.status(500).json({
      error: 'Unable to process booking request.'
    });
  }
);

export default router;
