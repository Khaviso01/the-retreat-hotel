
import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role, type User as PrismaUser } from '@prisma/client';

import { prisma } from '../services/prisma.js';
import {
  requireAuth,
  token,
  type AuthRequest
} from '../middleware/auth.js';

import { publicUser } from '../controllers/helpers.js';
import type { User } from '../models/types.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { sendPasswordResetEmail } from '../services/email.js';

import {
  CLIENT_URL,
  SERVER_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  JWT_SECRET
} from '../config/env.js';

const router = Router();

// Convert Prisma's uppercase roles to the existing API format.
function toAppUser(user: PrismaUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash ?? '',
    role: user.role === Role.ADMIN ? 'admin' : 'guest'
  };
}

// Handle asynchronous database errors safely.
function asyncHandler(
  fn: (req: AuthRequest, res: Response) => Promise<void>
) {
  return (req: AuthRequest, res: Response) => {
    Promise.resolve()
      .then(() => fn(req, res))
      .catch((error: unknown) => {
        console.error('Authentication error:', error);

        if (res.headersSent) return;

        res.status(400).json({
          error: error instanceof Error
            ? error.message
            : 'Request failed.'
        });
      });
  };
}

// Validate registration details.
const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8)
});

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const values = registerSchema.parse(req.body);
  const email = values.email.toLowerCase();

  // Check whether the account already exists in PostgreSQL.
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    res.status(409).json({
      error: 'Email already registered.'
    });
    return;
  }

  // Hash the password before storing the account.
  const passwordHash = await bcrypt.hash(values.password, 10);

  // Create the new guest account in PostgreSQL.
  const created = await prisma.user.create({
    data: {
      name: values.name,
      email,
      passwordHash,
      role: Role.GUEST
    }
  });

  const user = toAppUser(created);

  res.status(201).json({
    user: publicUser(user),
    token: token(user)
  });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const values = z.object({
    email: z.string().email(),
    password: z.string()
  }).parse(req.body);

  // Retrieve the account from PostgreSQL.
  const found = await prisma.user.findUnique({
    where: {
      email: values.email.toLowerCase()
    }
  });

  // OAuth-only accounts may not have a password.
  if (
    !found?.passwordHash ||
    !(await bcrypt.compare(values.password, found.passwordHash))
  ) {
    res.status(401).json({
      error: 'Invalid email or password.'
    });
    return;
  }

  const user = toAppUser(found);

  res.json({
    user: publicUser(user),
    token: token(user)
  });
}));

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Find the authenticated account in PostgreSQL.
    const found = await prisma.user.findUnique({
      where: { id: req.auth!.sub }
    });

    if (!found) {
      res.status(404).json({
        error: 'User not found.'
      });
      return;
    }

    res.json(publicUser(toAppUser(found)));
  })
);

// PATCH /api/auth/me
router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const values = z.object({
      name: z.string().trim().min(2).optional(),
      email: z.string().trim().email().optional()
    }).refine(
      data => data.name !== undefined || data.email !== undefined,
      { message: 'Provide a name or email to update.' }
    ).parse(req.body);

    const email = values.email?.toLowerCase();

    // Prevent duplicate email addresses.
    if (email) {
      const existing = await prisma.user.findUnique({
        where: { email }
      });

      if (existing && existing.id !== req.auth!.sub) {
        res.status(409).json({
          error: 'Email already registered.'
        });
        return;
      }
    }

    // Update the authenticated user's profile.
    const updated = await prisma.user.update({
      where: { id: req.auth!.sub },
      data: {
        ...(values.name !== undefined && { name: values.name }),
        ...(email !== undefined && { email })
      }
    });

    res.json(publicUser(toAppUser(updated)));
  })
);

// Google OAuth configuration
const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${SERVER_URL}/api/auth/google/callback`
);

// Start Google Sign-In
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: 'Google Sign-In is not configured.' });
    return;
  }

  const requestedNext =
    typeof req.query.next === 'string' ? req.query.next : '';

  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/signin-success';

  const state = jwt.sign({ next }, JWT_SECRET, {
    expiresIn: '10m'
  });

  const url = googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account'
  });

  res.redirect(url);
});

// Handle Google's callback
router.get('/google/callback', asyncHandler(async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).json({ error: 'Invalid Google callback.' });
    return;
  }

  const decoded = jwt.verify(state, JWT_SECRET) as { next: string };

  const { tokens } = await googleClient.getToken(code);

  if (!tokens.id_token) {
    res.status(401).json({ error: 'Google identity token missing.' });
    return;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID
  });

  const profile = ticket.getPayload();

  if (!profile?.sub || !profile.email || !profile.email_verified) {
    res.status(401).json({ error: 'Google account could not be verified.' });
    return;
  }

  const email = profile.email.toLowerCase();

  let user = await prisma.user.findUnique({
    where: { googleId: profile.sub }
  });

  if (!user) {
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      // Don't automatically link a Google identity to an existing
      // password account without an explicit account-linking flow.
      res.status(409).json({
        error: 'An account with this email already exists. Sign in using your password.'
      });
      return;
    }

    user = await prisma.user.create({
      data: {
        name: profile.name || email.split('@')[0],
        email,
        googleId: profile.sub,
        role: Role.GUEST
      }
    });
  }

  // Issue a short-lived, single-use code instead of putting
  // the application's JWT in the redirect URL.
  const loginCode = randomBytes(32).toString('hex');
  const codeHash = createHash('sha256')
    .update(loginCode)
    .digest('hex');

  await prisma.oAuthLoginCode.create({
    data: {
      codeHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000)
    }
  });

  const destination = new URL('/auth/google/callback', CLIENT_URL);
  destination.searchParams.set('code', loginCode);
  destination.searchParams.set('next', decoded.next);

  res.redirect(destination.toString());
}));

// Exchange the one-time code for an application JWT
router.post('/google/exchange', asyncHandler(async (req, res) => {
  const { code } = z.object({
    code: z.string().min(1)
  }).parse(req.body);

  const codeHash = createHash('sha256')
    .update(code)
    .digest('hex');

  const loginCode = await prisma.oAuthLoginCode.findUnique({
    where: { codeHash }
  });

  if (!loginCode || loginCode.expiresAt <= new Date()) {
    res.status(401).json({ error: 'Google login code expired or invalid.' });
    return;
  }

  // Consume the code so it cannot be used again.
  await prisma.oAuthLoginCode.delete({
    where: { id: loginCode.id }
  });

  const found = await prisma.user.findUnique({
    where: { id: loginCode.userId }
  });

  if (!found) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const user = toAppUser(found);

  res.json({
    user: publicUser(user),
    token: token(user)
  });
}));


const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const message =
    'If an account exists with this email, a password reset link will be sent.';

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  // Avoid revealing whether an email is registered.
  if (!user) {
    res.json({ message });
    return;
  }

  // Generate a secure reset token.
  const resetToken = randomBytes(32).toString('hex');

  // Store only the token hash in PostgreSQL.
  const tokenHash = createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Invalidate any previous reset tokens.
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  // Build the reset link for the React frontend.
  const resetUrl = new URL('/reset-password', CLIENT_URL);
  resetUrl.searchParams.set('token', resetToken);

  try {
    await sendPasswordResetEmail(
      user.email,
      resetUrl.toString()
    );
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }

  res.json({ message });
}));


const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(8)
});

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token: resetToken, password } =
    resetPasswordSchema.parse(req.body);

  const tokenHash = createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash }
  });

  if (!resetRecord || resetRecord.expiresAt <= new Date()) {
    res.status(400).json({
      error: 'Invalid or expired password reset link.'
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      // Consume the token once, even if requests arrive concurrently.
      const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          id: resetRecord.id,
          expiresAt: { gt: new Date() }
        }
      });

      if (consumed.count !== 1) {
        throw new Error('RESET_TOKEN_INVALID');
      }

      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash }
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId: resetRecord.userId }
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'RESET_TOKEN_INVALID'
    ) {
      res.status(400).json({
        error: 'Invalid or expired password reset link.'
      });
      return;
    }

    throw error;
  }

  res.json({
    message: 'Password reset successfully.'
  });
}));



export default router;
