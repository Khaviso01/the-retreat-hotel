
import { Router } from 'express';
import { prisma } from '../services/prisma.js';

// Initialize the Express router for hotel branches.
const router = Router();

/**
 * Calculate a hotel's average rating using actual guest reviews.
 * A branch without reviews is considered not yet rated.
 */
function calculateBranchRating<
  T extends {
    reviews: { rating: number }[];
    _count: { reviews: number };
  }
>(branch: T) {
  const { reviews, _count, ...details } = branch;

  const reviewCount = _count.reviews;

  const totalRating = reviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  const rating =
    reviewCount > 0
      ? Number((totalRating / reviewCount).toFixed(1))
      : 0;

  return {
    ...details,
    rating,
    reviewCount
  };
}

// GET: Retrieve all hotel branches from PostgreSQL.
router.get('/', async (_req, res) => {
  try {
    // Fetch branches and their submitted guest reviews.
    const branches = await prisma.branch.findMany({
      include: {
        reviews: {
          select: {
            rating: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    // Calculate each branch's rating independently.
    const branchesWithRatings = branches.map(
      calculateBranchRating
    );

    res.json(branchesWithRatings);
  } catch (error) {
    console.error('Failed to fetch branches:', error);

    res.status(500).json({
      error: 'Failed to retrieve hotel branches.'
    });
  }
});

// GET: Retrieve a specific hotel branch by its ID.
router.get('/:id', async (req, res) => {
  try {
    // Find the branch and its guest reviews.
    const branch = await prisma.branch.findUnique({
      where: {
        id: String(req.params.id)
      },
      include: {
        reviews: {
          select: {
            rating: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    // Return 404 if the branch does not exist.
    if (!branch) {
      res.status(404).json({
        error: 'Branch not found.'
      });
      return;
    }

    // Return the branch with its calculated rating.
    res.json(calculateBranchRating(branch));
  } catch (error) {
    console.error('Failed to fetch branch:', error);

    res.status(500).json({
      error: 'Failed to retrieve hotel branch.'
    });
  }
});

// Export the router for use in the main Express application.
export default router;
