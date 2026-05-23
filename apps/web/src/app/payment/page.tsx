'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientSecret = searchParams.get('clientSecret');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientSecret) {
      setError('No payment intent found. Please try booking again.');
    }
  }, [clientSecret]);

  async function handlePayment() {
    setLoading(true);
    setError(null);

    // In a real implementation, this would use Stripe Elements or Redirect to Checkout
    // For now, we'll simulate the payment process
    setTimeout(() => {
      setLoading(false);
      router.push('/bookings/success?bookingId=sample-booking-id');
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/properties" className="text-blue-600 hover:text-blue-700">
            ← Back to Properties
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Secure Payment</h1>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {error ? (
            // Error State
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link
                href="/properties"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
              >
                Try Again
              </Link>
            </div>
          ) : (
            // Payment Form
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {/* Security Badge */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  Secure Payment Processing
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>

                <div className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment-method" id="card" defaultChecked />
                    <label htmlFor="card" className="flex items-center gap-2 flex-1">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="font-medium">Credit or Debit Card</span>
                    </label>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors opacity-60">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment-method" id="paypal" disabled />
                    <label htmlFor="paypal" className="flex items-center gap-2 flex-1 text-gray-500">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#003087" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 4.508a.77.77 0 0 1 .758-.618h5.44c2.076 0 3.79.41 5.138 1.227 1.514.93 2.33 2.46 2.33 4.49 0 2.31-1.045 4.13-3.134 5.41l-.002.002c-.748.46-1.63.78-2.64.96a.5.5 0 0 0-.39.49v2.63c0 .277.224.5.5.5h2.63c.276 0 .5.224.5.5v2.63a.5.5 0 0 1-.5.5h-2.63a.5.5 0 0 0-.5.5v2.63a.5.5 0 0 1-.5.5h-2.63a.5.5 0 0 0-.5.5v2.63z" />
                      </svg>
                      <span className="font-medium">PayPal</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className="space-y-4 pt-2 border-t">
                <label className="block text-sm font-medium text-gray-700">Card Information</label>

                <div>
                  <label htmlFor="card-number" className="sr-only">Card Number</label>
                  <input
                    type="text"
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="sr-only">Expiry Date</label>
                    <input
                      type="text"
                      id="expiry"
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="cvc" className="sr-only">CVC</label>
                    <input
                      type="text"
                      id="cvc"
                      placeholder="CVC"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cardholder-name" className="sr-only">Cardholder Name</label>
                  <input
                    type="text"
                    id="cardholder-name"
                    placeholder="Name on card"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handlePayment}
                disabled={loading || !clientSecret}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  loading || !clientSecret
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Pay Securely'
                )}
              </button>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <img src="https://img.shields.io/badge/SSL-Encrypted-green.svg" alt="SSL Encrypted" className="h-6" />
                <span className="text-xs text-gray-500">Payments are processed securely</span>
              </div>
            </div>
          )}

          {/* Help Text */}
          {!error && (
            <p className="text-center text-sm text-gray-500">
              Need help?{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">
                Contact support
              </Link>
            </p>
          )}
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
