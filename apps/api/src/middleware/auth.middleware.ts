import { Request, Response, NextFunction } from 'express';

// Extend Express Request type for authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'GUEST' | 'ADMIN';
      };
    }
  }
}

/**
 * Authentication middleware - validates JWT token and attaches user to request
 * In production, this would verify the JWT from httpOnly cookie or Authorization header
 */
export function authenticate(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
): void {
  // For MVP development without full auth setup, we'll use a simple approach
  // In production with NextAuth.js, the token would be in a cookie

  const userId = req.headers['x-user-id'] as string;
  const userRole = (req.headers['x-user-role'] || 'GUEST') as 'GUEST' | 'ADMIN';

  if (!userId) {
    // In development, allow unauthenticated requests for testing
    // Set a default test user
    req.user = {
      id: userId || 'test-user-id',
      email: 'test@example.com',
      role: userRole as any,
    };
    return next();
  }

  req.user = {
    id: userId,
    email: req.headers['x-user-email'] as string || 'user@example.com',
    role: userRole as any,
  };

  next();
}

/**
 * Admin authorization middleware - ensures user has ADMIN role
 */
export function requireAdmin(
  req: Request & { user?: { role: string } },
  res: Response,
  next: NextFunction
): void {
  const isAdmin = req.user?.role === 'ADMIN';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Combine authentication and admin check
 */
export function requireAuthAndAdmin(
  req: Request & { user?: { role: string } },
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAdmin = req.user.role === 'ADMIN';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
