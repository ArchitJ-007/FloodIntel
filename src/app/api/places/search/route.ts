import { NextRequest, NextResponse } from 'next/server';
import { searchPlacesIndia } from '@/lib/places';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, 'places_search', { limit: 60, windowMs: 60000 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many search requests. Please slow down.', retryAfterMs: rate.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';

    const trimmed = query.trim().slice(0, 100);
    if (!trimmed || trimmed.length < 2) {
      return NextResponse.json({
        query: trimmed,
        results: [],
        count: 0,
        message: 'Query must be between 2 and 100 characters.',
      });
    }

    const results = await searchPlacesIndia(trimmed);

    const sources = Array.from(new Set(results.map((r) => r.source)));
    const provider =
      sources.length > 0
        ? sources.join('+')
        : process.env.MAPPLS_API_KEY
        ? 'mappls/open-meteo'
        : 'open-meteo';

    return NextResponse.json({
      query: trimmed,
      results,
      count: results.length,
      provider,
    });
  } catch (error: any) {
    console.error('Error in /api/places/search:', error);
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(error, 'Failed to search places.'),
        results: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
