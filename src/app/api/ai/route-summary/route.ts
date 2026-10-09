import { NextRequest, NextResponse } from 'next/server';
import { generateRouteSummary, RouteSummaryInput } from '@/lib/gemini';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rateLimit';

// ==============================================================================
// POST /api/ai/route-summary
// Synthesizes trade-offs between computed route duration and hazard exposure
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, 'ai_route_summary', { limit: 20, windowMs: 60000 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'AI route summary rate limit reached. Please wait a moment.', retryAfterMs: rate.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 131072) {
      return NextResponse.json(
        { error: 'Payload size exceeds 128KB limit.' },
        { status: 413 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

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
      routes: body.routes.slice(0, 10),
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
      { error: sanitizeErrorMessage(error, 'Internal server error generating route comparison summary.') },
      { status: 500 }
    );
  }
}
