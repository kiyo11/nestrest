import Stripe from 'stripe';
import { prisma } from '../config/database';
import { PaymentStatus, CreatePaymentIntentInput } from '@nestrest/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export class PaymentService {
  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { property: true },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if payment already exists for this booking
    const existingPayment = await prisma.payment.findUnique({
      where: { bookingId: input.bookingId },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.PENDING) {
      return {
        clientSecret: existingPayment.stripePaymentId, // This should be the actual client secret stored elsewhere
        bookingId: existingPayment.bookingId,
        amount: Number(existingPayment.amount),
        currency: existingPayment.currency,
      };
    }

    // Create payment intent in Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100), // Convert to cents
      currency: input.currency?.toLowerCase() || 'usd',
      metadata: {
        bookingId: input.bookingId,
      },
    });

    // Save payment record to database
    const payment = await prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        stripePaymentId: paymentIntent.id,
        amount: input.amount,
        currency: input.currency || 'USD',
        status: PaymentStatus.PENDING,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      bookingId: input.bookingId,
      amount: Number(paymentIntent.amount) / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };
  }

  /**
   * Confirm a payment intent via webhook
   */
  async confirmPayment(stripePaymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Get latest payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);

    if (paymentIntent.status === 'succeeded') {
      // Update database
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCEEDED },
        }),
        prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' as const },
        }),
      ]);

      return { success: true, bookingId: payment.bookingId };
    } else if (paymentIntent.status === 'requires_payment_method') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      throw new Error('Payment failed');
    }

    return { success: false, status: paymentIntent.status };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    const stripeSignature = event.headers['stripe-signature']!;

    let data: Stripe.PaymentIntent | Stripe.Charge;

    try {
      data = stripe.webhooks.constructEvent(
        event.data.raw,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Invalid webhook signature');
    }

    const paymentIntent = data as Stripe.PaymentIntent;

    switch (paymentIntent.status) {
      case 'succeeded':
        await this.confirmPayment(paymentIntent.id);
        break;

      case 'requires_payment_method':
      case 'canceled':
        await prisma.payment.update({
          where: { stripePaymentId: paymentIntent.id },
          data: { status: PaymentStatus.FAILED },
        });
        break;

      default:
        console.log(`Unhandled payment status: ${paymentIntent.status}`);
    }

    return { received: true };
  }

  /**
   * Create a refund for a booking
   */
  async createRefund(paymentId: string, reason?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new Error('Can only refund successful payments');
    }

    const refund = await stripe.refunds.create({
      paymentIntent: payment.stripePaymentId,
      reason: reason || 'requested_by_customer',
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });

    return refund;
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBooking(bookingId: string) {
    return prisma.payment.findUnique({
      where: { bookingId },
      include: { booking: true },
    });
  }
}

export const paymentService = new PaymentService();
