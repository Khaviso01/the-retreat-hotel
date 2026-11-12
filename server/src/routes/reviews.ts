import {
  Router,
  type Response,
  type NextFunction
} from 'express';

import { z, ZodError } from 'zod';
import { prisma } from '../services/prisma.js';
import {
  requireAuth,
  type AuthRequest
} from '../middleware/auth.js';

// Initialize the Express router for hotel reviews.
const router = Router();

// Define validation rules for submitting reviews.
const reviewSchema = z.object({
  branchId: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(5)
});

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

// Convert Prisma records to the existing API response format.

function formatReview(review: {
  id: string;
  userId: string;
  branchId: string;
  rating: number;
  text: string;
  createdAt: Date;
  user?: {
    name: string;
  };
  branch?: {
    name: string;
  };
}) {
  return {
    id: review.id,
    userId: review.userId,
    branchId: review.branchId,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt.toISOString(),
    user: review.user,
    branch: review.branch
  };
}


// GET /api/reviews
// Retrieve all hotel reviews from PostgreSQL.

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(reviews.map(formatReview));
  })
);


// POST /api/reviews
// Allow authenticated users to submit hotel reviews.
router.post(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    // Validate the review submitted by the user.
    const values = reviewSchema.parse(req.body);

    // Verify that the hotel branch exists.
    const branch = await prisma.branch.findUnique({
      where: {
        id: values.branchId
      }
    });

    if (!branch) {
      res.status(404).json({
        error: 'Hotel branch not found.'
      });
      return;
    }

    // Create the review in PostgreSQL.
    const review = await prisma.review.create({
      data: {
        userId: req.auth!.sub,
        branchId: values.branchId,
        rating: values.rating,
        text: values.text
      }
    });

    res.status(201).json(formatReview(review));
  })
);

// Handle validation and database errors.
router.use(
  (
    error: unknown,
    _req: AuthRequest,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid review information.',
        details: error.flatten()
      });
      return;
    }

    console.error('Reviews API error:', error);

    res.status(500).json({
      error: 'Failed to process review request.'
    });
  }
);

// Export the reviews router.
export default router;
