import { NextRequest, NextResponse } from 'next/server';
import { generateRouteSummary, RouteSummaryInput } from '@/lib/gemini';

// ==============================================================================
// POST /api/ai/route-summary
// Synthesizes trade-offs between computed route duration and hazard exposure
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON object with routes.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.routes) || body.routes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid routes parameter: Expected a non-empty array of route options.' },
        { status: 400 }
      );
    }

    const input: RouteSummaryInput = {
      routes: body.routes,
      travelMode: body.travelMode || 'driving',
    };

    const summary = await generateRouteSummary(input);

    return NextResponse.json(summary, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error in /api/ai/route-summary:', error);
    return NextResponse.json(
      { error: 'Internal server error generating route comparison summary.' },
      { status: 500 }
    );
  }
}
