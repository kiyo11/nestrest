import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/bookings/:id - Get booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiResponse = await fetch(`http://localhost:3001/api/bookings/${params.id}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(data, { status: apiResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bookings/:id/cancel - Cancel a booking
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiResponse = await fetch(`http://localhost:3001/api/bookings/${params.id}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(data, { status: apiResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
