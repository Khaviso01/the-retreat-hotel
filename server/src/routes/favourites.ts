
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

// Initialize the Express router for managing user favourites.
const router = Router();

// Handle asynchronous routes safely.
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

// GET /api/favourites
// Retrieve the hotel branches saved by the authenticated user.
router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const favourites = await prisma.favourite.findMany({
      where: {
        userId: req.auth!.sub
      },
      include: {
        branch: true
      }
    });

    // Return branch objects to preserve frontend compatibility.
    res.json(favourites.map(favourite => favourite.branch));
  })
);

// POST /api/favourites/:branchId
// Add a hotel branch to the authenticated user's favourites.
router.post(
  '/:branchId',
  requireAuth,
  asyncRoute(async (req, res) => {
    const branchId = String(req.params.branchId);
    const userId = req.auth!.sub;

    // Verify that the hotel branch exists.
    const branch = await prisma.branch.findUnique({
      where: {
        id: branchId
      }
    });

    if (!branch) {
      res.status(404).json({
        error: 'Branch not found.'
      });
      return;
    }

    // Upsert prevents duplicate favourites.
    await prisma.favourite.upsert({
      where: {
        userId_branchId: {
          userId,
          branchId
        }
      },
      update: {},
      create: {
        userId,
        branchId
      }
    });

    res.json({ ok: true });
  })
);

// DELETE /api/favourites/:branchId
// Remove a saved hotel branch belonging to the authenticated user.
router.delete(
  '/:branchId',
  requireAuth,
  asyncRoute(async (req, res) => {
    const branchId = String(req.params.branchId);
    const userId = req.auth!.sub;

    // deleteMany succeeds even if the favourite was already removed.
    await prisma.favourite.deleteMany({
      where: {
        userId,
        branchId
      }
    });

    res.json({ ok: true });
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
    console.error('Favourites API error:', error);

    res.status(500).json({
      error: 'Failed to process favourites request.'
    });
  }
);

// Export the favourites router.
export default router;
