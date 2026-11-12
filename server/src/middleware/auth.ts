import type {
  Request,
  Response,
  NextFunction
} from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_SECRET } from '../config/env.js';
import { prisma } from '../services/prisma.js';
import type { User } from '../models/types.js';

// Generate a signed JWT valid for 7 days.
export const token = (user: User) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

// Extended Express request with authenticated user details.
export type AuthRequest = Request & {
  auth?: {
    sub: string;
    role: 'guest' | 'admin';
  };
};

// Verify the JWT and load the current user from PostgreSQL.
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    // Check for the presence of a Bearer token in the Authorization header.
    if (!authorization?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Please sign in first.'
      });
      return;
    }

    const raw = authorization.slice(7);

    // Verify token signature and expiration.
    const decoded = jwt.verify(
      raw,
      JWT_SECRET
    ) as JwtPayload;

    // Ensure the token contains a valid user ID in the "sub" claim.
    if (
      typeof decoded.sub !== 'string' ||
      !decoded.sub
    ) {
      res.status(401).json({
        error: 'Invalid authentication token.'
      });
      return;
    }

    // Check that the user still exists in PostgreSQL.
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub
      },
      select: {
        id: true,
        role: true
      }
    });

    // If the user no longer exists, respond with an error.
    if (!user) {
      res.status(401).json({
        error: 'Your account no longer exists.'
      });
      return;
    }

    // Use the current database role, not the JWT's old role.
    req.auth = {
      sub: user.id,
      role: user.role === Role.ADMIN ? 'admin' : 'guest'
    };

    // Proceed to the next middleware or route handler. 
    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        error: 'Your session is invalid or expired. Please sign in again.'
      });
      return;
    }

    // Forward unexpected database errors to Express.
    next(error);
  }
}

// Restrict endpoints to administrators.
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.auth?.role !== 'admin') {
    res.status(403).json({
      error: 'Admin access required.'
    });
    return;
  }

  next();
}