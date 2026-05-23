import { Router, Request } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireAuthAndAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 * @access  Private
 */
router.get('/me', async (req, res, next) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/admin/check
 * @desc    Check if current user is admin (admin only)
 * @access  Private/Admin
 */
router.get('/admin/check', async (req, res, next) => {
  try {
    const userId = (req as Request & { user?: { id: string; role: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({ isAdmin: true, userId });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/admin/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/admin/users', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        bookings: { select: { id: true, status: true, checkIn: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/admin/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.put('/admin/users/:id/role', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role } = req.body;

    if (!role || !['GUEST', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
