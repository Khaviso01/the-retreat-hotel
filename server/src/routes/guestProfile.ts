import {
  Router,
  type Response,
  type NextFunction,
} from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import {
  requireAuth,
  type AuthRequest,
} from '../middleware/auth.js';

// Initialize the Express router for guest profile management.
const router = Router();


// Allow authenticated guests only.
// requireAuth has already verified the JWT and loaded the user's role.
function requireGuest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.auth?.role !== 'guest') {
    res.status(403).json({
      error: 'Guest access only.',
    });
    return;
  }

  next();
}


// Validate personal information.
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
}).strict();

// Validate password changes.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
}).strict();

// PATCH /api/guest/profile
// Update the guest's full name.
router.patch(
  '/profile',
  requireAuth,
  requireGuest,
  async (req: AuthRequest, res: Response) => {
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Full name must be between 2 and 100 characters.',
      });
      return;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.auth!.sub },
        data: { name: parsed.data.name },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      res.json({
        ...updatedUser,
        role: 'guest',
      });
    } catch (error) {
      console.error('Update profile error:', error);

      res.status(500).json({
        error: 'Unable to update your personal information.',
      });
    }
  }
);

// PATCH /api/guest/profile/password
// Change the guest's password.
router.patch(
  '/profile/password',
  requireAuth,
  requireGuest,
  async (req: AuthRequest, res: Response) => {
    const parsed = changePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Enter your current password and a new password of 8–128 characters.',
      });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: {
          id: true,
          passwordHash: true,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Account not found.',
        });
        return;
      }

      // Google-only accounts do not have a local password.
      if (!user.passwordHash) {
        res.status(400).json({
          error: 'This account does not have a password to change.',
        });
        return;
      }

      // Verify the current password.
      const valid = await bcrypt.compare(
        parsed.data.currentPassword,
        user.passwordHash
      );

      if (!valid) {
        res.status(400).json({
          error: 'Current password is incorrect.',
        });
        return;
      }

      // Prevent reusing the existing password.
      const samePassword = await bcrypt.compare(
        parsed.data.newPassword,
        user.passwordHash
      );

      if (samePassword) {
        res.status(400).json({
          error: 'Choose a different password from your current one.',
        });
        return;
      }

      // Hash and save the new password.
      const passwordHash = await bcrypt.hash(
        parsed.data.newPassword,
        12
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.json({
        message: 'Password updated successfully.',
      });
    } catch (error) {
      console.error('Change password error:', error);

      res.status(500).json({
        error: 'Unable to change your password.',
      });
    }
  }
);

export default router;
