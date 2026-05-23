import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payments/intent - Create payment intent for a booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, amount } = body;

    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call the Express API backend
    const apiResponse = await fetch('http://localhost:3001/api/payments/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, amount }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(data, { status: apiResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
