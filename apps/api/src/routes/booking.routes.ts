import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { authenticate, requireAuthAndAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking (guest authenticated)
 * @access  Private/Guest
 */
router.post('/', async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, guests, notes } = req.body;

    if (!propertyId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse and validate dates
    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);

    if (isNaN(parsedCheckIn.getTime()) || isNaN(parsedCheckOut.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Get authenticated user ID from request (set by auth middleware)
    const guestUserId = (req as Request & { user?: { id: string } }).user?.id;

    if (!guestUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Create booking
    const result = await bookingService.createBooking({
      propertyId,
      checkIn: parsedCheckIn.toISOString().split('T')[0],
      checkOut: parsedCheckOut.toISOString().split('T')[0],
      guests,
      notes,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get current user's bookings
 * @access  Private/Guest
 */
router.get('/my-bookings', async (req, res, next) => {
  try {
    const guestUserId = (req as Request & { user?: { id: string } }).user?.id;

    if (!guestUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const bookings = await bookingService.getUserBookings(guestUserId);

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking details by ID
 * @access  Private/Guest/Admin
 */
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await bookingService.getBooking(req.params.id, true);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check authorization - guest can only see their own bookings
    const guestUserId = (req as Request & { user?: { id: string; role: string } }).user?.id;
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (booking.guestUserId !== guestUserId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private/Guest/Admin
 */
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    // Get authenticated user info
    const userId = (req as Request & { user?: { id: string; role: string } }).user?.id;
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user owns this booking or is admin
    const booking = await bookingService.getBooking(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.guestUserId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const canceller = isAdmin ? 'ADMIN' : 'GUEST';
    const cancelledBooking = await bookingService.cancelBooking(bookingId, canceller);

    res.json(cancelledBooking);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/bookings/:id/confirm
 * @desc    Confirm a pending booking (admin only)
 * @access  Private/Admin
 */
router.put('/admin/bookings/:id/confirm', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const confirmedBooking = await bookingService.confirmBooking(req.params.id);

    res.json(confirmedBooking);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Update a booking (admin only)
 * @access  Private/Admin
 */
router.put('/admin/bookings/:id', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const updatedBooking = await bookingService.updateBooking(req.params.id, updates);

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings (admin only)
 * @access  Private/Admin
 */
router.get('/admin/bookings', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all bookings with property and guest details
    const bookings = await require('../config/database').prisma.booking.findMany({
      include: {
        property: true,
        guest: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

export default router;
