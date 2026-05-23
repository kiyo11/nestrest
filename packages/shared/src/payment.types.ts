// Payment types for NestRest

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentInput {
  bookingId: string;
  amount: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  bookingId: string;
  amount: number;
}
