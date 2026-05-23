import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/properties/:slug - Get property by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const apiResponse = await fetch(`http://localhost:3001/api/properties/${params.slug}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(data, { status: apiResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}
