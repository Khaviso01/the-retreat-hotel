
import { Router } from 'express';
import { BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '../services/prisma.js';

// Initialize the Express router for accommodation search functionality.
const router = Router();

// Helper function to safely convert query parameters to strings, trimming whitespace and handling non-string values.
const stringParam = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// GET /api/search
router.get('/', async (req, res) => {
  try {
    const {
      location,
      branch,
      minPrice,
      maxPrice,
      guests,
      roomType,
      amenities,
      checkIn,
      checkOut,
      sort
    } = req.query;

    // Validate and process query parameters for accommodation search.
    const locationValue = stringParam(location);
    const branchId = stringParam(branch);
    const typeValue = stringParam(roomType);
    const amenityValues = stringParam(amenities)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    // Validate and process numerical and date query parameters for accommodation search.
    const min = stringParam(minPrice);
    const max = stringParam(maxPrice);
    const guestCount = stringParam(guests);
    const start = stringParam(checkIn);
    const end = stringParam(checkOut);

    // Validate the numerical and date query parameters to ensure they are within acceptable ranges and formats.
    if (
      (min && (!Number.isFinite(Number(min)) || Number(min) < 0)) ||
      (max && (!Number.isFinite(Number(max)) || Number(max) < 0)) ||
      (guestCount && (!Number.isInteger(Number(guestCount)) ||
        Number(guestCount) < 1))
    ) {
      res.status(400).json({ error: 'Invalid price or guest filters.' });
      return;
    }

    // Validate that the minimum price does not exceed the maximum price for accommodation search.
    if (min && max && Number(min) > Number(max)) {
      res.status(400).json({
        error: 'Minimum price cannot exceed maximum price.'
      });
      return;
    }

    // Validate that both check-in and check-out dates are provided together for accommodation search.
    if (Boolean(start) !== Boolean(end)) {
      res.status(400).json({
        error: 'Both check-in and check-out dates are required.'
      });
      return;
    }

    // Validate the check-in and check-out dates to ensure they are in the correct format and logical order for accommodation search.
    let dateFilter: Prisma.BookingWhereInput | undefined;

    if (start && end) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      const checkInDate = new Date(`${start}T00:00:00.000Z`);
      const checkOutDate = new Date(`${end}T00:00:00.000Z`);

      if (
        !datePattern.test(start) ||
        !datePattern.test(end) ||
        Number.isNaN(checkInDate.getTime()) ||
        Number.isNaN(checkOutDate.getTime()) ||
        checkOutDate <= checkInDate ||
        checkInDate.toISOString().slice(0, 10) !== start ||
        checkOutDate.toISOString().slice(0, 10) !== end
      ) {
        res.status(400).json({
          error: 'Invalid check-in or check-out dates.'
        });
        return;
      }

      dateFilter = {
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        },
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate }
      };
    }

    const where: Prisma.RoomWhereInput = {
      available: true,

      ...(branchId && { branchId }),

      ...(min && { price: { gte: Number(min) } }),
      ...(max && {
        price: {
          ...(min ? { gte: Number(min) } : {}),
          lte: Number(max)
        }
      }),

      ...(guestCount && {
        capacity: { gte: Number(guestCount) }
      }),

      ...(typeValue && {
        type: {
          contains: typeValue,
          mode: 'insensitive'
        }
      }),

      ...((locationValue || amenityValues.length > 0) && {
        branch: {
          ...(locationValue && {
            OR: [
              { city: { contains: locationValue, mode: 'insensitive' } },
              { name: { contains: locationValue, mode: 'insensitive' } },
              { address: { contains: locationValue, mode: 'insensitive' } }
            ]
          }),
          ...(amenityValues.length > 0 && {
            amenities: { hasEvery: amenityValues }
          })
        }
      }),

      ...(dateFilter && {
        bookings: {
          none: dateFilter
        }
      })
    };

    const sortValue = stringParam(sort);

    const orderBy: Prisma.RoomOrderByWithRelationInput =
      sortValue === 'price_desc'
        ? { price: 'desc' }
        : sortValue === 'rating_desc'
          ? { branch: { rating: 'desc' } }
          : { price: 'asc' };

    const rooms = await prisma.room.findMany({
      where,
      include: { branch: true },
      orderBy
    });

    res.json({
      count: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('Accommodation search error:', error);
    res.status(500).json({
      error: 'Unable to search accommodations.'
    });
  }
});

export default router;
