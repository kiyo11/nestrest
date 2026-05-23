'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-day-picker';

interface Property {
  id: string;
  slug: string;
  name: string;
  pricePerNight: number;
}

export default function BookPage() {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get property from URL params (in real app, would fetch by slug)
  useEffect(() => {
    // For now, use a placeholder - in production this would come from props or URL
    setProperty({
      id: '1',
      slug: 'oceanview-retreat',
      name: 'Oceanview Retreat',
      pricePerNight: 350,
    });
  }, []);

  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalPrice = nights * (property?.pricePerNight || 0);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates');
      return;
    }

    if (nights < 1) {
      setError('Check-out must be after check-in');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property?.id,
          checkIn: format(checkIn, 'yyyy-MM-dd'),
          checkOut: format(checkOut, 'yyyy-MM-dd'),
          guests,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      // Redirect to payment or confirmation
      router.push(`/bookings/success?bookingId=${data.bookingId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating your booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/properties')} className="text-blue-600 hover:text-blue-700">
            ← Back to Properties
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Book Your Stay</h1>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Property Summary */}
          {property && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.name}</h2>
              <p className="text-gray-600">${property.pricePerNight} per night</p>
            </div>
          )}

          {/* Booking Form */}
          <form onSubmit={handleBooking} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* Date Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Select Dates</label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600 mb-1 block">Check-in</span>
                  <DatePicker
                    selected={checkIn}
                    onSelect={(date) => setCheckIn(date)}
                    modifiers={{ start: checkIn, end: checkOut }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <span className="text-sm text-gray-600 mb-1 block">Check-out</span>
                  <DatePicker
                    selected={checkOut}
                    onSelect={(date) => setCheckOut(date)}
                    modifiers={{ start: checkIn, end: checkOut }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Guest Count */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Number of Guests</label>
              <input
                type="number"
                min={1}
                max={10}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Special Requests (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special requests or questions?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Price Summary */}
            {nights > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">${property?.pricePerNight} × {nights} nights</span>
                  <span className="font-medium">${totalPrice}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-blue-600">${totalPrice}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !checkIn || !checkOut}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                loading || !checkIn || !checkOut
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Creating Booking...' : `Continue to Payment - $${totalPrice}`}
            </button>
          </form>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            Need help?{' '}
            <button onClick={() => router.push('/contact')} className="text-blue-600 hover:underline">
              Contact us
            </button>
          </div>
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
