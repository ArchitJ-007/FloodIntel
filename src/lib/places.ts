/**
 * FloodIntel — Places & Geocoding Service
 *
 * Supports India-wide location search and geocoding:
 * 1. Mappls Geocode/AutoSuggest if MAPPLS_API_KEY is configured
 * 2. Open-Meteo Geocoding API (free, reliable, city/district level nationwide)
 * 3. Curated Indian Urban Inundation Landmarks (Silk Board, Hindmata, Minto Bridge, Velachery, etc.)
 */

export interface PlaceResult {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  countryCode: string;
  state?: string;
  source: 'mappls' | 'open-meteo' | 'curated' | 'manual';
}

// Bounding box for the Republic of India:
// Latitude: 6.0° N (Great Nicobar) to 37.5° N (Indira Col, Ladakh)
// Longitude: 68.0° E (Ghuar Mota, Gujarat) to 97.5° E (Kibithu, Arunachal Pradesh)
export const INDIA_BOUNDS = {
  minLat: 6.0,
  maxLat: 37.5,
  minLng: 68.0,
  maxLng: 97.5,
};

export function isCoordinatesInIndia(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng
  );
}

/**
 * Curated list of major Indian flood-prone transit junctions and tech corridors
 * for sub-second, hyper-local precision matching even when geocoding APIs only return city centers.
 */
export const CURATED_INDIAN_LANDMARKS: PlaceResult[] = [
  // Bengaluru
  {
    id: 'curated-blr-silk-board',
    name: 'Silk Board Junction',
    formattedAddress: 'Central Silk Board Flyover, Outer Ring Road, Bengaluru, Karnataka, India',
    lat: 12.9175,
    lng: 77.6234,
    countryCode: 'IN',
    state: 'Karnataka',
    source: 'curated',
  },
  {
    id: 'curated-blr-koramangala',
    name: 'Koramangala 4th Block',
    formattedAddress: 'Koramangala 80ft Road, Sector 4 Basin, Bengaluru, Karnataka, India',
    lat: 12.9348,
    lng: 77.6205,
    countryCode: 'IN',
    state: 'Karnataka',
    source: 'curated',
  },
  {
    id: 'curated-blr-bellandur',
    name: 'Bellandur EcoSpace',
    formattedAddress: 'Outer Ring Road, Bellandur Lake Corridor, Bengaluru, Karnataka, India',
    lat: 12.9260,
    lng: 77.6762,
    countryCode: 'IN',
    state: 'Karnataka',
    source: 'curated',
  },
  {
    id: 'curated-blr-indiranagar',
    name: 'Indiranagar 100ft Road',
    formattedAddress: '100 Feet Road, Indiranagar, Bengaluru, Karnataka, India',
    lat: 12.9719,
    lng: 77.6412,
    countryCode: 'IN',
    state: 'Karnataka',
    source: 'curated',
  },
  {
    id: 'curated-blr-whitefield',
    name: 'Whitefield ITPL',
    formattedAddress: 'ITPL Main Road, Whitefield, Bengaluru, Karnataka, India',
    lat: 12.9863,
    lng: 77.7380,
    countryCode: 'IN',
    state: 'Karnataka',
    source: 'curated',
  },
  {
    id: 'curated-blr-majestic',
    name: 'Majestic Bus Stand',
    formattedAddress: 'Kempegowda Bus Station, Majestic, Bengaluru, Karnataka, India',
    lat: 12.9772,
    lng: 77.5713,
    countryCode: 'IN',
    state: 'Karnataka',
    source: 'curated',
  },
  // Mumbai
  {
    id: 'curated-bom-hindmata',
    name: 'Hindmata Flyover',
    formattedAddress: 'Hindmata Cinema Junction, Dadar East, Mumbai, Maharashtra, India',
    lat: 19.0068,
    lng: 72.8427,
    countryCode: 'IN',
    state: 'Maharashtra',
    source: 'curated',
  },
  {
    id: 'curated-bom-milan-subway',
    name: 'Milan Subway',
    formattedAddress: 'Milan Flyover Underpass, Santacruz West, Mumbai, Maharashtra, India',
    lat: 19.0833,
    lng: 72.8415,
    countryCode: 'IN',
    state: 'Maharashtra',
    source: 'curated',
  },
  {
    id: 'curated-bom-bkc',
    name: 'Bandra Kurla Complex (BKC)',
    formattedAddress: 'BKC Mithi River Basin, Bandra East, Mumbai, Maharashtra, India',
    lat: 19.0657,
    lng: 72.8687,
    countryCode: 'IN',
    state: 'Maharashtra',
    source: 'curated',
  },
  {
    id: 'curated-bom-andheri-subway',
    name: 'Andheri Subway',
    formattedAddress: 'Andheri West Railway Underpass, Mumbai, Maharashtra, India',
    lat: 19.1197,
    lng: 72.8464,
    countryCode: 'IN',
    state: 'Maharashtra',
    source: 'curated',
  },
  // Delhi NCR
  {
    id: 'curated-del-minto-bridge',
    name: 'Minto Bridge Underpass',
    formattedAddress: 'Minto Road Railway Bridge, Connaught Place, New Delhi, India',
    lat: 28.6369,
    lng: 77.2273,
    countryCode: 'IN',
    state: 'Delhi',
    source: 'curated',
  },
  {
    id: 'curated-del-ito',
    name: 'ITO Junction',
    formattedAddress: 'ITO Vikas Marg Ring Road, New Delhi, India',
    lat: 28.6297,
    lng: 77.2435,
    countryCode: 'IN',
    state: 'Delhi',
    source: 'curated',
  },
  {
    id: 'curated-del-dhaula-kuan',
    name: 'Dhaula Kuan Underpass',
    formattedAddress: 'Dhaula Kuan Enclave, Ring Road, New Delhi, India',
    lat: 28.5921,
    lng: 77.1584,
    countryCode: 'IN',
    state: 'Delhi',
    source: 'curated',
  },
  // Chennai
  {
    id: 'curated-maa-velachery',
    name: 'Velachery Lake Basin',
    formattedAddress: 'Velachery Bypass Road, Chennai, Tamil Nadu, India',
    lat: 12.9791,
    lng: 80.2185,
    countryCode: 'IN',
    state: 'Tamil Nadu',
    source: 'curated',
  },
  {
    id: 'curated-maa-t-nagar',
    name: 'T. Nagar Ranganathan St',
    formattedAddress: 'Usman Road & Ranganathan Street, T. Nagar, Chennai, Tamil Nadu, India',
    lat: 13.0418,
    lng: 80.2341,
    countryCode: 'IN',
    state: 'Tamil Nadu',
    source: 'curated',
  },
  // Pune
  {
    id: 'curated-pnq-swargate',
    name: 'Swargate Flyover',
    formattedAddress: 'Swargate Chowk, Shivaji Road, Pune, Maharashtra, India',
    lat: 18.5018,
    lng: 73.8586,
    countryCode: 'IN',
    state: 'Maharashtra',
    source: 'curated',
  },
  {
    id: 'curated-pnq-hinjawadi',
    name: 'Hinjawadi Phase 1',
    formattedAddress: 'Rajiv Gandhi Infotech Park, Hinjawadi, Pune, Maharashtra, India',
    lat: 18.5913,
    lng: 73.7389,
    countryCode: 'IN',
    state: 'Maharashtra',
    source: 'curated',
  },
  // Hyderabad
  {
    id: 'curated-hyd-hitec-city',
    name: 'HITEC City Cyber Towers',
    formattedAddress: 'HITEC City Main Road, Madhapur, Hyderabad, Telangana, India',
    lat: 17.4474,
    lng: 78.3762,
    countryCode: 'IN',
    state: 'Telangana',
    source: 'curated',
  },
  {
    id: 'curated-hyd-tolichowki',
    name: 'Tolichowki Flyover',
    formattedAddress: 'Tolichowki Main Road, Hyderabad, Telangana, India',
    lat: 17.4022,
    lng: 78.4093,
    countryCode: 'IN',
    state: 'Telangana',
    source: 'curated',
  },
];

// Simple in-memory cache for place searches
const searchCache = new Map<string, { timestamp: number; results: PlaceResult[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Searches places across India matching a query string.
 */
export function searchCuratedLandmarks(query: string): PlaceResult[] {
  const queryLower = (query || '').trim().toLowerCase();
  if (queryLower.length < 2) return [];
  return CURATED_INDIAN_LANDMARKS.filter((item) => {
    return (
      item.name.toLowerCase().includes(queryLower) ||
      item.formattedAddress.toLowerCase().includes(queryLower)
    );
  });
}

export async function searchPlacesIndia(query: string): Promise<PlaceResult[]> {
  const trimmed = (query || '').trim();
  if (trimmed.length < 2) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  const results: PlaceResult[] = [];

  // 1. Check curated landmarks first for instant high-relevance match
  const matchedCurated = searchCuratedLandmarks(trimmed);
  results.push(...matchedCurated);

  // 2. If MAPPLS_API_KEY is configured, try Mappls
  const mapplsKey = process.env.MAPPLS_API_KEY;
  if (mapplsKey) {
    try {
      const mapplsUrl = `https://atlas.mappls.com/api/places/geocode?address=${encodeURIComponent(
        trimmed
      )}&itemCount=5`;
      const res = await fetch(mapplsUrl, {
        headers: { Authorization: `Bearer ${mapplsKey}` },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const copResults = data?.copResults || [];
        for (const item of copResults) {
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          if (isCoordinatesInIndia(lat, lng)) {
            results.push({
              id: item.eLoc || `mappls-${lat}-${lng}`,
              name: item.placeName || item.formattedAddress || trimmed,
              formattedAddress: item.formattedAddress || item.placeName || `${trimmed}, India`,
              lat,
              lng,
              countryCode: 'IN',
              state: item.state,
              source: 'mappls',
            });
          }
        }
      }
    } catch {
      // Mappls failed or timed out; continue to Open-Meteo fallback
    }
  }

  // 3. Open-Meteo Geocoding API (Fast, Free, Works nationwide across India)
  try {
    const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=10&language=en&format=json`;

    const res = await fetch(openMeteoUrl, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      const rawResults = Array.isArray(data?.results) ? data.results : [];

      for (const item of rawResults) {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        const countryCode = String(item.country_code || '').toUpperCase();
        const country = String(item.country || '');

        // Prioritize results in India or within India's coordinate bounding box
        if (countryCode === 'IN' || country.toLowerCase() === 'india' || isCoordinatesInIndia(lat, lng)) {
          const state = item.admin1 || '';
          const district = item.admin2 || '';
          const addressParts = [item.name, district, state, 'India'].filter(Boolean);
          const formattedAddress = Array.from(new Set(addressParts)).join(', ');

          // Prevent exact duplicates with curated items
          const isDuplicate = results.some(
            (r) =>
              Math.abs(r.lat - lat) < 0.005 &&
              Math.abs(r.lng - lng) < 0.005
          );

          if (!isDuplicate) {
            results.push({
              id: `om-${item.id}`,
              name: item.name,
              formattedAddress,
              lat,
              lng,
              countryCode: 'IN',
              state: state || undefined,
              source: 'open-meteo',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Open-Meteo geocoding search failed:', err);
  }

  // Sort: curated landmarks and state capitals first, limit to 8
  const dedupedResults = results.slice(0, 8);

  searchCache.set(cacheKey, {
    timestamp: Date.now(),
    results: dedupedResults,
  });

  return dedupedResults;
}
