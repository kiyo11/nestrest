import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/bookings/my-bookings - Get current user's bookings
 */
export async function GET(request: NextRequest) {
  try {
    // Call the Express API backend
    const apiResponse = await fetch('http://localhost:3001/api/bookings/my-bookings', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(data, { status: apiResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
