import { Router, Request } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireAuthAndAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/messages
 * @desc    Send a message (contact form or booking inquiry)
 * @access  Public/Guest
 */
router.post('/', async (req, res, next) => {
  try {
    const { bookingId, subject, body } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    // Get authenticated user ID (if logged in)
    const senderId = (req as Request & { user?: { id: string } }).user?.id;

    if (!senderId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get admin user to send message to
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      return res.status(500).json({ error: 'No admin user found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId: bookingId || null,
        senderId,
        recipientId: adminUser.id,
        subject: subject || null,
        body,
      },
      include: {
        sender: true,
        recipient: true,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/messages/inbox
 * @desc    Get user's inbox (messages received)
 * @access  Private/Guest/Admin
 */
router.get('/inbox', async (req, res, next) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get messages where user is recipient
    const messages = await prisma.message.findMany({
      where: { recipientId: userId },
      include: {
        sender: true,
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/messages/outbox
 * @desc    Get user's sent messages
 * @access  Private/Guest/Admin
 */
router.get('/outbox', async (req, res, next) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get messages where user is sender
    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        recipient: true,
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark a message as read
 * @access  Private/Guest/Admin
 */
router.put('/:id/read', async (req, res, next) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user owns this message or is recipient
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private/Guest/Admin
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user owns this message
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId && message.recipientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.message.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/messages/unread-count
 * @desc    Get count of unread messages for admin (admin only)
 * @access  Private/Admin
 */
router.get('/admin/unread-count', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Count unread messages for admin
    const count = await prisma.message.count({
      where: {
        recipientId: adminUser.id,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

export default router;
