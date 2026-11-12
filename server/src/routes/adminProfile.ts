
import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../services/prisma.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';

// Create an Express router for admin profile management.
const router = Router();

// Apply authentication and admin authorization middleware to all routes in this router.
router.use(requireAuth, requireAdmin);

function asyncRoute(
  handler: (req: AuthRequest, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as AuthRequest, res)).catch(next);
  };
}

// Validation schemas for profile and password updates using Zod.
const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.')
});

// Validation schema for password change requests using Zod.
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must have at least 8 characters.')
});

// GET /api/admin/profile
router.get('/', asyncRoute(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }


  // Fetch the authenticated user's profile from the database, excluding sensitive information like the password hash.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      passwordHash: true
    }
  });

  // If the user is not found in the database, respond with a 404 error.
  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  // Respond with the user's profile information, including whether they have a password set (useful for accounts created via Google sign-in).
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash)
  });
}));

// PATCH /api/admin/profile
router.patch('/', asyncRoute(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  // Validate the incoming request body against the profile schema to ensure it contains valid data for updating the user's profile.
  const values = profileSchema.parse(req.body);

  // Require password confirmation before changing email.
  const current = await prisma.user.findUnique({
    where: { id: userId }
  });

  // If the user is not found in the database, respond with a 404 error.
  if (!current) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  // If the email in the request body is different from the current email
  // respond with a 403 error indicating that email changes are not enabled yet.
  const email = values.email.toLowerCase();

  if (email !== current.email.toLowerCase()) {
    // Keep email changes disabled until a verified
    // email-change flow is implemented.
    res.status(403).json({
      error: 'Email changes require verification and are not enabled yet.'
    });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: values.name },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  // Respond with the updated user profile information after successfully updating the user's name in the database.
  res.json(updated);
}));

// PATCH /api/admin/profile/password
router.patch('/password', asyncRoute(async (req, res) => {
  const userId = req.auth?.sub;

  // If the user is not authenticated, respond with a 401 Unauthorized error.
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  // Validate the incoming request body against the password schema to ensure it contains valid data for changing the user's password.
  const values = passwordSchema.parse(req.body);

  // Fetch the authenticated user's current password hash from the database to verify the current password before allowing a password change.
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  // If the user is not found in the database, respond with a 404 error indicating that the account was not found.
  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  // If the user does not have a password set (e.g., they signed in with Google)
  // respond with a 400 error indicating that password setup is not available for this account.
  if (!user.passwordHash) {
    res.status(400).json({
      error: 'This account uses Google sign-in. Password setup is not available here.'
    });
    return;
  }

  // Verify that the provided current password matches the stored password hash using bcrypt
  // If it does not match, respond with a 400 error indicating that the current password is incorrect.
  const valid = await bcrypt.compare(
    values.currentPassword,
    user.passwordHash
  );

  // If the current password is incorrect, respond with a 400 error indicating that the current password is incorrect.
  if (!valid) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  // Check if the new password is the same as the current password to prevent users from reusing their existing password
  // If they are the same, respond with a 400 error indicating that they must choose a different password
  const samePassword = await bcrypt.compare(
    values.newPassword,
    user.passwordHash
  );

  if (samePassword) {
    res.status(400).json({
      error: 'Choose a password different from your current password.'
    });
    return;
  }

  // Hash the new password using bcrypt with a salt factor of 12 for security before storing it in the database.
  const passwordHash = await bcrypt.hash(values.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  res.json({ message: 'Password changed successfully.' });
}));

// Handle validation and database errors.
router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: error.issues[0]?.message || 'Invalid input.'
    });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    res.status(409).json({ error: 'Email address already exists.' });
    return;
  }

  next(error);
});

export default router;
