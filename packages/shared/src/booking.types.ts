// Booking types for NestRest

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: string;
  propertyId: string;
  guestUserId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  propertyId: string;
  checkIn: string; // ISO date format (YYYY-MM-DD)
  checkOut: string; // ISO date format (YYYY-MM-DD)
  guests: number;
  notes?: string;
}

export interface BookingWithProperty extends Booking {
  property: {
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
}
