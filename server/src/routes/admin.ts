import bcrypt from 'bcryptjs';
import {
  Router,
  type Request,
  type Response,
  type NextFunction
} from 'express';

import { randomUUID } from 'node:crypto';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { z, ZodError } from 'zod';

import { prisma } from '../services/prisma.js';
import { roomImages } from '../services/seed.js';
import {
  requireAuth,
  requireAdmin,
  type AuthRequest
} from '../middleware/auth.js';

// Initialize the admin router.
const router = Router();

// Protect every endpoint in this router.
router.use(requireAuth, requireAdmin);

// Handle asynchronous Express routes.
// Handle asynchronous admin routes with authentication support.
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

// Validation for hotel rooms.
const roomSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().trim().min(2),
  type: z.string().trim().min(2),
  capacity: z.number().int().positive(),
  price: z.number().int().positive(),
  available: z.boolean(),
  image: z.string().optional(),
  description: z.string().optional()
});

// Validation for hotel branches.
const branchSchema = z.object({
  name: z.string().trim().min(1),
  city: z.string().trim().min(1),
  address: z.string().trim().min(1),
  description: z.string().trim(),
  image: z.string().trim(),
  rating: z.number().min(0).max(5),
  amenities: z.array(z.string().trim().min(1)),
  policies: z.array(z.string().trim().min(1)).optional(),
  cancellationHours: z.number().int().nonnegative().optional(),
});


// Validation for notifications.
const notificationSchema = z.object({
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  userId: z.string().optional()
});

// Validate new users created by an administrator.
const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(['GUEST', 'ADMIN'])
});

// Validate role changes.
const updateUserRoleSchema = z.object({
  role: z.enum(['GUEST', 'ADMIN'])
});

// GET /api/admin/stats
// Retrieve dashboard statistics from PostgreSQL.
router.get(
  '/stats',
  asyncRoute(async (_req, res) => {
    const [
      bookings,
      confirmedBookings,
      branches,
      rooms,
      users,
      revenue
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED
        }
      }),
      prisma.branch.count(),
      prisma.room.count(),
      prisma.user.count(),
      prisma.booking.aggregate({
        where: {
          status: BookingStatus.CONFIRMED
        },
        _sum: {
          total: true
        }
      })
    ]);

    // Preserve the existing dashboard calculation.
    const occupancy = rooms
      ? Math.round((confirmedBookings / rooms) * 100)
      : 0;

    res.json({
      bookings,
      revenue: revenue._sum.total ?? 0,
      branches,
      rooms,
      users,
      occupancy
    });
  })
);

// GET /api/admin/users
// Return registered users without password hashes.
router.get(
  '/users',
  asyncRoute(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(
      users.map(user => ({
        ...user,
        role: user.role === Role.ADMIN ? 'admin' : 'guest'
      }))
    );
  })
);

// POST /api/admin/users
// Allow administrators to create guest and admin accounts.
router.post(
  '/users',
  asyncRoute(async (req, res) => {
    const values = createUserSchema.parse(req.body);

    const email = values.email.toLowerCase();

    // Prevent duplicate email addresses.
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      res.status(409).json({
        error: 'A user with this email already exists.'
      });
      return;
    }

    // Hash passwords using the same method as registration.
    const passwordHash = await bcrypt.hash(
      values.password,
      12
    );

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: values.name,
        email,
        passwordHash,
        role: values.role as Role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.status(201).json({
      ...user,
      role: user.role === Role.ADMIN ? 'admin' : 'guest'
    });
  })
);

// PATCH /api/admin/users/:id/role
// Allow administrators to change user permissions.
router.patch(
  '/users/:id/role',
  asyncRoute(async (req, res) => {
    const userId = String(req.params.id);
    const { role } = updateUserRoleSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      res.status(404).json({
        error: 'User not found.'
      });
      return;
    }

    // Prevent removing the final administrator.
    if (
      existing.role === Role.ADMIN &&
      role === 'GUEST'
    ) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN }
      });

      if (adminCount <= 1) {
        res.status(409).json({
          error: 'You cannot remove the last administrator.'
        });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.json({
      ...updated,
      role: updated.role === Role.ADMIN
        ? 'admin'
        : 'guest'
    });
  })
);

// DELETE /api/admin/users/:id
// Only delete users who have no bookings.
router.delete(
  '/users/:id',
  asyncRoute(async (req, res) => {
    const userId = String(req.params.id);

    // Check whether the user exists.
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found.'
      });
      return;
    }

    // Prevent an administrator from deleting their own account.
    if (req.auth?.sub === userId) {
      res.status(403).json({
        error: 'You cannot remove your own account.'
      });
      return;
    }

    // Users with any booking history cannot be deleted.
    const bookingCount = await prisma.booking.count({
      where: { userId }
    });

    if (bookingCount > 0) {
      res.status(409).json({
        error: 'This user has bookings and cannot be removed.'
      });
      return;
    }

    // Prevent removing the last administrator.
    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN }
      });

      if (adminCount <= 1) {
        res.status(409).json({
          error: 'You cannot remove the last administrator.'
        });
        return;
      }
    }

    // Remove related records and the user in one transaction.
    await prisma.$transaction(async tx => {
      await tx.review.deleteMany({
        where: { userId }
      });

      await tx.oAuthLoginCode.deleteMany({
        where: { userId }
      });

      await tx.user.delete({
        where: { id: userId }
      });
    });

    res.json({
      ok: true,
      message: 'User removed successfully.'
    });
  })
);

// POST /api/admin/rooms
// Create a hotel room.
router.post(
  '/rooms',
  asyncRoute(async (req, res) => {
    const values = roomSchema.parse(req.body);

    const branch = await prisma.branch.findUnique({
      where: {
        id: values.branchId
      }
    });

    if (!branch) {
      res.status(404).json({
        error: 'Unknown branch.'
      });
      return;
    }

    const room = await prisma.room.create({
      data: {
        id: randomUUID(),
        branchId: values.branchId,
        name: values.name,
        type: values.type,
        capacity: values.capacity,
        price: values.price,
        available: values.available,
        image: values.image || roomImages[0],
        description: values.description || ''
      }
    });

    res.status(201).json(room);
  })
);

// PATCH /api/admin/rooms/:id
// Update an existing room.
router.patch(
  '/rooms/:id',
  asyncRoute(async (req, res) => {
    const roomId = String(req.params.id);
    const values = roomSchema.partial().parse(req.body);

    const existing = await prisma.room.findUnique({
      where: {
        id: roomId
      }
    });

    if (!existing) {
      res.status(404).json({
        error: 'Room not found.'
      });
      return;
    }

    if (values.branchId) {
      const branch = await prisma.branch.findUnique({
        where: {
          id: values.branchId
        }
      });

      if (!branch) {
        res.status(404).json({
          error: 'Unknown branch.'
        });
        return;
      }
    }

    const room = await prisma.room.update({
      where: {
        id: roomId
      },
      data: values
    });

    res.json(room);
  })
);

// DELETE /api/admin/rooms/:id
// Delete a room only when it has no booking history.
router.delete(
  '/rooms/:id',
  asyncRoute(async (req, res) => {
    const roomId = String(req.params.id);

    const room = await prisma.room.findUnique({
      where: {
        id: roomId
      }
    });

    if (!room) {
      res.status(404).json({
        error: 'Room not found.'
      });
      return;
    }

    const bookingCount = await prisma.booking.count({
      where: {
        roomId
      }
    });

    if (bookingCount > 0) {
      res.status(409).json({
        error:
          'This room has booking history. Mark it unavailable instead of deleting it.'
      });
      return;
    }

    await prisma.room.delete({
      where: {
        id: roomId
      }
    });

    res.json({ ok: true });
  })
);

// POST /api/admin/branches
// Create a hotel branch.
router.post(
  '/branches',
  asyncRoute(async (req, res) => {
    const values = branchSchema.parse(req.body);

    const branch = await prisma.branch.create({
      data: {
        id: randomUUID(),
        ...values
      }
    });

    res.status(201).json(branch);
  })
);

// PATCH /api/admin/branches/:id
// Update a hotel branch.
router.patch(
  '/branches/:id',
  asyncRoute(async (req, res) => {
    const branchId = String(req.params.id);
    const values = branchSchema.partial().parse(req.body);

    const existing = await prisma.branch.findUnique({
      where: {
        id: branchId
      }
    });

    if (!existing) {
      res.status(404).json({
        error: 'Branch not found.'
      });
      return;
    }

    const branch = await prisma.branch.update({
      where: {
        id: branchId
      },
      data: values
    });

    res.json(branch);
  })
);

// POST /api/admin/notifications
// Send notifications to one user or all guests.
router.post(
  '/notifications',
  asyncRoute(async (req, res) => {
    const values = notificationSchema.parse(req.body);

    if (values.userId) {
      const user = await prisma.user.findUnique({
        where: {
          id: values.userId
        }
      });

      if (!user) {
        res.status(404).json({
          error: 'User not found.'
        });
        return;
      }

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: values.title,
          message: values.message
        }
      });

      res.json({ sent: 1 });
      return;
    }

    // Send notifications to all guest accounts.
    const guests = await prisma.user.findMany({
      where: {
        role: Role.GUEST
      },
      select: {
        id: true
      }
    });

    if (guests.length === 0) {
      res.json({ sent: 0 });
      return;
    }

    const result = await prisma.notification.createMany({
      data: guests.map(guest => ({
        userId: guest.id,
        title: values.title,
        message: values.message,
        read: false
      }))
    });

    res.json({
      sent: result.count
    });
  })
);

// Handle validation and database errors.
router.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid admin request.',
        details: error.flatten()
      });
      return;
    }

    // Handle duplicate email addresses.
if (
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002'
) {
  res.status(409).json({
    error: 'A user with this email already exists.'
  });
  return;
}

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      res.status(409).json({
        error:
          'This record is referenced by other records and cannot be deleted or changed.'
      });
      return;
    }

    console.error('Admin API error:', error);

    res.status(500).json({
      error: 'Failed to process admin request.'
    });
  }
);

export default router;
