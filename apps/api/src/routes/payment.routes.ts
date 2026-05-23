import { Router, Request } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticate, requireAuthAndAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/payments/intent
 * @desc    Create a payment intent for a booking
 * @access  Private/Guest
 */
router.post('/intent', async (req, res, next) => {
  try {
    const { bookingId, amount } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentService.createPaymentIntent({
      bookingId,
      amount,
      currency: req.body.currency || 'USD',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirm a payment intent (called after Stripe payment completes)
 * @access  Private/Guest
 */
router.post('/confirm', async (req, res, next) => {
  try {
    const { stripePaymentId } = req.body;

    if (!stripePaymentId) {
      return res.status(400).json({ error: 'Missing stripePaymentId' });
    }

    const result = await paymentService.confirmPayment(stripePaymentId);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe only)
 */
router.post('/webhook', async (req, res, next) => {
  try {
    // Get raw body for webhook signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Create event from Stripe signature
    const stripeSignature = req.headers['stripe-signature'];

    if (!stripeSignature) {
      return res.status(400).json({ error: 'Missing Stripe signature header' });
    }

    // Re-parse body for webhook construction
    const event = JSON.parse(rawBody);

    const result = await paymentService.handleWebhook(event);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/payments/:bookingId
 * @desc    Get payment status for a booking
 * @access  Private/Guest/Admin
 */
router.get('/:bookingId', async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentByBooking(req.params.bookingId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Create a refund for a payment (admin only)
 * @access  Private/Admin
 */
router.post('/:id/refund', async (req, res, next) => {
  try {
    const isAdmin = (req as Request & { user?: { role: string } }).user?.role === 'ADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const refund = await paymentService.createRefund(req.params.id, req.body.reason);

    res.json(refund);
  } catch (error) {
    next(error);
  }
});

export default router;
