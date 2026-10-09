import { NextRequest, NextResponse } from 'next/server';
import { normalizeOpenMeteoResponse } from '@/lib/weather';

export const dynamic = 'force-dynamic';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 7000;
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, retries: number = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FloodIntel/1.0 (Disaster-Response-Prototype)',
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      }

      // If rate limited (429) or client error (4xx), do not retry aggressively
      if (res.status >= 400 && res.status < 500) {
        return res;
      }

      lastError = new Error(`Open-Meteo returned status ${res.status}`);
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error('Open-Meteo request timed out (7s)');
      }
    }

    // Jittered backoff between retries (400ms, 1200ms)
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt)));
    }
  }

  throw lastError || new Error('Failed to fetch from Open-Meteo');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  if (!latStr || !lngStr) {
    return NextResponse.json(
      {
        error: 'Missing required query parameters: "lat" and "lng" are required.',
      },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json(
      {
        error: `Invalid latitude "${latStr}". Latitude must be a numeric value between -90 and 90.`,
      },
      { status: 400 }
    );
  }

  if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json(
      {
        error: `Invalid longitude "${lngStr}". Longitude must be a numeric value between -180 and 180.`,
      },
      { status: 400 }
    );
  }

  // Construct Open-Meteo API query
  // Rounded coordinates to 2 decimals (~1.1 km resolution) for caching per PRD Section 3.2 FR-WX-09
  const roundedLat = Number(lat.toFixed(4));
  const roundedLng = Number(lng.toFixed(4));

  const queryParams = new URLSearchParams({
    latitude: roundedLat.toString(),
    longitude: roundedLng.toString(),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m',
    hourly: 'precipitation,precipitation_probability',
    past_hours: '24',
    forecast_hours: '24',
    timezone: 'auto',
  });

  const apiUrl = `${OPEN_METEO_BASE_URL}?${queryParams.toString()}`;

  try {
    const response = await fetchWithRetry(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Open-Meteo weather service error: HTTP ${response.status}`,
          status: response.status,
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const rawData = await response.json();
    const normalizedSnapshot = normalizeOpenMeteoResponse(rawData, { lat: roundedLat, lng: roundedLng });

    return NextResponse.json(normalizedSnapshot, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        'X-Data-Source': 'Open-Meteo Forecast API',
      },
    });
  } catch (error: any) {
    const isTimeout = error.message?.includes('timed out');
    return NextResponse.json(
      {
        error: error.message || 'Weather telemetry service unavailable',
        provider: 'Open-Meteo',
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
