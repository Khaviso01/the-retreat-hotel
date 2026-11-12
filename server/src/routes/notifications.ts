import {
  Router,
  type Response,
  type NextFunction
} from 'express';
import { prisma } from '../services/prisma.js';
import {
  requireAuth,
  type AuthRequest
} from '../middleware/auth.js';

// Initialize the Express router for managing user notifications.
const router = Router();

// Convert PostgreSQL notification dates to the existing API format.
function formatNotification(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt.toISOString()
  };
}

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

// GET /api/notifications
// Retrieve all notifications belonging to the authenticated user.
router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.auth!.sub
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(notifications.map(formatNotification));
  })
);

// PATCH /api/notifications/:id/read
// Mark a notification as read only if it belongs to the current user.
router.patch(
  '/:id/read',
  requireAuth,
  asyncRoute(async (req, res) => {
    const notificationId = String(req.params.id);
    const userId = req.auth!.sub;

    // Update only the authenticated user's notification.
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true
      }
    });

    // Prevent users from accessing other users' notifications.
    if (result.count === 0) {
      res.status(404).json({
        error: 'Notification not found.'
      });
      return;
    }

    // Return the updated notification.
    const updated = await prisma.notification.findUnique({
      where: {
        id: notificationId
      }
    });

    if (!updated) {
      res.status(404).json({
        error: 'Notification not found.'
      });
      return;
    }

    res.json(formatNotification(updated));
  })
);

// Handle unexpected database errors.
router.use(
  (
    error: unknown,
    _req: AuthRequest,
    res: Response,
    _next: NextFunction
  ) => {
    console.error('Notification API error:', error);

    res.status(500).json({
      error: 'Failed to process notification request.'
    });
  }
);

// Export the notifications router.
export default router;
