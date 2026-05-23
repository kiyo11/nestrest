'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface Booking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  async function fetchMyBookings() {
    try {
      const res = await fetch('/api/bookings/my-bookings');
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading your bookings');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
      });

      if (!res.ok) throw new Error('Failed to cancel booking');

      // Refresh bookings list
      fetchMyBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  }

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Confirmed</span>;
      case 'PENDING':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">Pending</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Cancelled</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/properties" className="text-blue-600 hover:text-blue-700">
            ← Back to Properties
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">My Bookings</h1>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Yet</h3>
            <p className="text-gray-600 mb-4">You haven't made any bookings yet.</p>
            <Link
              href="/properties"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Booking #{booking.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-500">{format(new Date(booking.checkIn), 'MMM d, yyyy')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}</p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guests:</span>
                      <span className="font-medium">{booking.guests}</span>
                    </div>
                    {booking.notes && (
                      <>
                        <div className="border-t pt-2">
                          <span className="text-gray-600 block mb-1">Notes:</span>
                          <p className="text-gray-700">{booking.notes}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>${booking.totalPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {booking.status === 'PENDING' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => router.push(`/payment?clientSecret=placeholder`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Complete Payment
                    </button>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}

                {booking.status === 'CONFIRMED' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Link
                      href={`/properties/${booking.propertyId}`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      View Property Details
                    </Link>
                  </div>
                )}

                {booking.status === 'CANCELLED' && (
                  <p className="text-sm text-gray-500 pt-4 border-t">
                    This booking has been cancelled.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Booking Button */}
        {bookings.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/properties"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
            >
              Book Another Property
            </Link>
          </div>
        )}
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
