'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export default function BookingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails(bookingId);
    }
  }, [bookingId]);

  async function fetchBookingDetails(id: string) {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) throw new Error('Failed to fetch booking');
      const data = await res.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!bookingId || !booking) return;

    try {
      const res = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount: booking.totalPrice,
        }),
      });

      if (!res.ok) throw new Error('Failed to create payment intent');

      const data = await res.json();

      // Redirect to Stripe Checkout or handle client-side payment
      window.location.href = `/payment?clientSecret=${data.clientSecret}`;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initialize payment. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/properties" className="text-blue-600 hover:text-blue-700">
            ← Back to Properties
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Booking Confirmation</h1>
        </nav>
      </header>

      {/* Success Message */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Text */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Booking Requested!</h2>
            <p className="text-gray-600">Your booking has been created successfully.</p>
          </div>

          {/* Booking Details */}
          {booking && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4 text-left">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Booking Details</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${booking.status === 'CONFIRMED' ? 'text-green-600' : booking.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in:</span>
                  <span>{new Date(booking.checkIn).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out:</span>
                  <span>{new Date(booking.checkOut).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span>{booking.guests}</span>
                </div>

                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Total Amount:</span>
                  <span>${booking.totalPrice}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {booking?.status === 'PENDING' && (
            <button
              onClick={handlePayment}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Complete Payment
            </button>
          )}

          {booking?.status === 'CONFIRMED' && (
            <Link
              href="/bookings/my-bookings"
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors inline-block text-center"
            >
              View My Bookings
            </Link>
          )}

          <button
            onClick={() => router.push('/properties')}
            className="text-blue-600 hover:underline"
          >
            Browse More Properties
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 NestRest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
