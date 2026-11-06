
import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../services/prisma.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

function asyncRoute(
  handler: (req: AuthRequest, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as AuthRequest, res)).catch(next);
  };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.')
});

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

  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

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

  const values = profileSchema.parse(req.body);

  // Require password confirmation before changing email.
  const current = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!current) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

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

  res.json(updated);
}));

// PATCH /api/admin/profile/password
router.patch('/password', asyncRoute(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const values = passwordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  if (!user.passwordHash) {
    res.status(400).json({
      error: 'This account uses Google sign-in. Password setup is not available here.'
    });
    return;
  }

  const valid = await bcrypt.compare(
    values.currentPassword,
    user.passwordHash
  );

  if (!valid) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

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
