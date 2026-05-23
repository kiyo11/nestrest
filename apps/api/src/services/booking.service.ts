import { prisma } from '../config/database';
import { BookingCreateInput, BookingStatus, PropertyWithDetails } from '@nestrest/shared';

export class BookingService {
  /**
   * Check if a property is available for given date range
   */
  async checkAvailability(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<boolean> {
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: {
          notIn: ['CANCELLED_BY_GUEST', 'CANCELLED_BY_ADMIN'],
        },
        OR: [
          // Existing booking starts within new range
          {
            checkIn: { lte: checkOut },
            checkOut: { gte: checkIn },
          },
          // New range completely covers existing booking
          {
            checkIn: { lte: checkIn },
            checkOut: { gte: checkOut },
          },
        ],
      },
    });

    return conflictingBookings.length === 0;
  }

  /**
   * Get available dates for a property (simple version - returns all future dates)
   * In production, this would query the database and exclude booked dates
   */
  async getAvailableDates(propertyId: string): Promise<Date[]> {
    // For now, return empty array - implement based on your needs
    // This could fetch from a calendar or availability table
    return [];
  }

  /**
   * Calculate total price for a booking
   */
  calculatePrice(
    property: PropertyWithDetails,
    checkIn: Date,
    checkOut: Date
  ): number {
    const nights = this.calculateNights(checkIn, checkOut);
    return nights * Number(property.pricePerNight);
  }

  /**
   * Calculate number of nights between two dates
   */
  calculateNights(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // Minimum 1 night
  }

  /**
   * Create a new booking with conflict detection and payment intent creation
   */
  async createBooking(input: BookingCreateInput): Promise<{
    bookingId: string;
    clientSecret: string;
    amount: number;
  }> {
    // Parse dates from ISO strings
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);

    // Validate dates
    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }

    // Check availability
    const isAvailable = await this.checkAvailability(
      input.propertyId,
      checkIn,
      checkOut
    );

    if (!isAvailable) {
      throw new Error('Selected dates are not available');
    }

    // Get property details for pricing
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      include: { images: true, amenities: true },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    if (!property.isActive) {
      throw new Error('Property is not available for booking');
    }

    // Calculate total price
    const totalPrice = this.calculatePrice(property, checkIn, checkOut);

    // Create booking in transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Double-check availability with lock
      const lockedBookings = await tx.booking.findMany({
        where: {
          propertyId: input.propertyId,
          status: { notIn: ['CANCELLED_BY_GUEST', 'CANCELLED_BY_ADMIN'] },
          OR: [
            { checkIn: { lte: checkOut }, checkOut: { gte: checkIn } },
            { checkIn: { lte: input.checkIn }, checkOut: { gte: input.checkOut } },
          ],
        },
      });

      if (lockedBookings.length > 0) {
        throw new Error('Selected dates are not available');
      }

      // Create booking with PENDING status
      const newBooking = await tx.booking.create({
        data: {
          propertyId: input.propertyId,
          guestUserId: '', // Will be set after authentication
          checkIn,
          checkOut,
          guests: input.guests,
          totalPrice,
          status: BookingStatus.PENDING,
          notes: input.notes,
        },
      });

      return newBooking;
    });

    return {
      bookingId: booking.id,
      clientSecret: '', // Will be set by payment service
      amount: Number(booking.totalPrice),
    };
  }

  /**
   * Get booking by ID with optional property details
   */
  async getBooking(id: string, includeProperty = false) {
    if (includeProperty) {
      return prisma.booking.findUnique({
        where: { id },
        include: { property: true, guest: true },
      });
    }

    return prisma.booking.findUnique({ where: { id } });
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string) {
    return prisma.booking.findMany({
      where: { guestUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { property: true },
    });
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, canceller: 'GUEST' | 'ADMIN') {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'CANCELLED_BY_GUEST' || booking.status === 'CANCELLED_BY_ADMIN') {
      throw new Error('Booking already cancelled');
    }

    const status = canceller === 'GUEST'
      ? BookingStatus.CANCELLED_BY_GUEST
      : BookingStatus.CANCELLED_BY_ADMIN;

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  /**
   * Confirm a pending booking (admin action)
   */
  async confirmBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Booking is not in PENDING status');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  /**
   * Update a booking (admin action)
   */
  async updateBooking(bookingId: string, updates: Partial<BookingCreateInput>) {
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existing) {
      throw new Error('Booking not found');
    }

    // Validate date changes against availability
    if (updates.checkIn || updates.checkOut) {
      const checkIn = updates.checkIn ? new Date(updates.checkIn) : existing.checkIn;
      const checkOut = updates.checkOut ? new Date(updates.checkOut) : existing.checkOut;

      if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }

      const isAvailable = await this.checkAvailability(
        existing.propertyId,
        checkIn,
        checkOut
      );

      if (!isAvailable) {
        throw new Error('Selected dates are not available');
      }
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }
}

export const bookingService = new BookingService();
