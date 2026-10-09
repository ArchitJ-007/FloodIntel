import { NextRequest, NextResponse } from 'next/server';
import {
  validateRouteCoordinates,
  fetchOsrmRoutes,
  generateDemoFallbackRoutes,
  rankAndCompareRoutes,
  RouteComparisonResult,
  RouteCoordinates,
} from '@/lib/routing';
import { getInitialDemoIncidents, Incident } from '@/lib/demoIncidents';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(ip, 'routes_compare', { limit: 30, windowMs: 60000 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Route calculation rate limit exceeded. Please wait a moment.', retryAfterMs: rate.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 262144) {
      return NextResponse.json(
        { error: 'Request payload too large (max 256KB).' },
        { status: 413 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const { from, to, profile = 'driving', avoidHazards = true, hazards: customHazards } = body || {};

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required "from" or "to" coordinate parameters.' },
        { status: 400 }
      );
    }

    const fromCoords: RouteCoordinates = {
      lat: Number(from.lat),
      lng: Number(from.lng),
    };
    const toCoords: RouteCoordinates = {
      lat: Number(to.lat),
      lng: Number(to.lng),
    };

    // 1. Validate coordinates
    const validation = validateRouteCoordinates(fromCoords, toCoords);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 2. Resolve and sanitize incident hazards
    const warnings: string[] = [];
    let candidateHazards: Incident[] = [];
    if (Array.isArray(customHazards)) {
      // Bound to max 100 items and filter to valid coordinates (F-16)
      candidateHazards = customHazards
        .slice(0, 100)
        .filter(
          (h) =>
            h &&
            typeof h === 'object' &&
            h.coordinates &&
            typeof h.coordinates.lat === 'number' &&
            typeof h.coordinates.lng === 'number' &&
            !isNaN(h.coordinates.lat) &&
            !isNaN(h.coordinates.lng)
        );
      warnings.push('Risk exposure computed against active session hazards (unverified community data).');
    } else {
      candidateHazards = getInitialDemoIncidents();
    }

    // 3. Fetch routes from OSRM with retry and fallback
    let rawRoutes: any[] = [];
    let provenance: 'osrm' | 'demo_fallback' = 'osrm';

    try {
      const osrmResult = await fetchOsrmRoutes(
        fromCoords,
        toCoords,
        profile,
        avoidHazards ? candidateHazards : undefined
      );
      rawRoutes = osrmResult.routes;
      warnings.push(...osrmResult.warnings);
    } catch (osrmError: any) {
      console.warn('[Routing API] OSRM primary service failed, using demo fallback:', osrmError?.message);
      warnings.push(
        'Public OSRM routing service was unavailable or timed out. Demonstrating with calculated synthetic trajectory corridors.'
      );
      provenance = 'demo_fallback';
      rawRoutes = generateDemoFallbackRoutes(fromCoords, toCoords);
    }

    // 4. Rank and compare candidate routes using Turf.js hazard exposure engine
    const evaluatedRoutes = rankAndCompareRoutes(rawRoutes, candidateHazards, provenance);

    if (evaluatedRoutes.length === 0) {
      return NextResponse.json(
        { error: 'No viable road routes could be calculated between the specified points.' },
        { status: 422 }
      );
    }

    // 5. Compute global metadata & summary
    const fastest = evaluatedRoutes.find((r) => r.isFastest) || evaluatedRoutes[0];
    const safest = evaluatedRoutes.find((r) => r.isSafest) || evaluatedRoutes[0];
    const recommended = evaluatedRoutes.find((r) => r.isRecommended) || evaluatedRoutes[0];

    const hasHighExposureOverall = evaluatedRoutes.every(
      (r) => r.exposureCategory === 'high' || r.isNotRecommended
    );

    if (hasHighExposureOverall) {
      warnings.push(
        'All available candidate routes pass through active flood risk zones. Exercise caution or delay non-emergency travel.'
      );
    }

    const result: RouteComparisonResult = {
      routes: evaluatedRoutes,
      origin: fromCoords,
      destination: toCoords,
      fastestRouteId: fastest.id,
      safestRouteId: safest.id,
      recommendedRouteId: recommended.id,
      hasHighExposureOverall,
      computedAt: new Date().toISOString(),
      warnings,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Routing API Exception]', err);
    return NextResponse.json(
      { error: err?.message || 'An internal error occurred during route calculation.' },
      { status: 500 }
    );
  }
}
