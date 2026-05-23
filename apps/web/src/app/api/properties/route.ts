import { NextResponse } from 'next/server';

/**
 * GET /api/properties - List all active properties
 */
export async function GET() {
  try {
    const apiResponse = await fetch('http://localhost:3001/api/properties', {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(data, { status: apiResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}
