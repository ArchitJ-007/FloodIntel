import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocodeIndia } from '@/lib/places';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/places/reverse?lat=<number>&lng=<number>
 *
 * Server-side reverse geocoding for genuine map-selected coordinates.
 * Uses the server-only MAPPLS_API_KEY; the key is never returned to the client.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, 'places_reverse', { limit: 60, windowMs: 60000 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many reverse geocoding requests. Please slow down.', retryAfterMs: rate.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const latRaw = searchParams.get('lat');
    const lngRaw = searchParams.get('lng');

    const lat = latRaw === null ? NaN : Number(latRaw);
    const lng = lngRaw === null ? NaN : Number(lngRaw);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: 'Valid numeric lat and lng query parameters are required.', result: null },
        { status: 400 }
      );
    }

    const result = await reverseGeocodeIndia(lat, lng);

    return NextResponse.json({
      lat,
      lng,
      result,
      resolved: result !== null,
    });
  } catch (error: any) {
    console.error('Error in /api/places/reverse:', error);
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(error, 'Failed to reverse geocode coordinates.'),
        result: null,
        resolved: false,
      },
      { status: 500 }
    );
  }
}
