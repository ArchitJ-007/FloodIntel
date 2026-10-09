import { NextRequest, NextResponse } from 'next/server';
import { searchPlacesIndia } from '@/lib/places';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return NextResponse.json({
        query: trimmed,
        results: [],
        count: 0,
        message: 'Query must be at least 2 characters.',
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
        error: 'Failed to search places.',
        results: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
