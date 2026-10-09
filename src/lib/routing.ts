import * as turf from '@turf/turf';
import { type Incident, normalizeSeverity } from './demoIncidents.ts';

export interface RouteCoordinates {
  lat: number;
  lng: number;
}

export interface HazardousSegment {
  startKm: number;
  endKm: number;
  lengthM: number;
  incidentId: string;
  severity: 'minor' | 'moderate' | 'severe';
}

export interface RouteHazardImpact {
  incidentId: string;
  title: string;
  location: string;
  severity: 'high' | 'moderate' | 'low' | 'cleared';
  depth: string;
  riskScore: number;
  distanceAlongRouteKm: number;
  distanceToRouteM: number;
  bufferRadiusM: number;
  impact: number; // 0.0 to 1.0
  coordinates: { lat: number; lng: number };
}

export interface RouteOption {
  id: string; // 'A', 'B', 'C', etc.
  name: string;
  distanceM: number;
  distanceKm: number;
  durationS: number;
  durationMin: number;
  timeDeltaMin: number; // Compared with the fastest route
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // GeoJSON [lng, lat]
  };
  hazardCount: number;
  exposureScore: number | null; // 0 to 100, or null if hazard data unavailable
  exposureCategory: 'low' | 'moderate' | 'high' | 'unknown';
  exposureCaveat?: string;
  relevantHazards: RouteHazardImpact[];
  hazardousSegments: HazardousSegment[];
  avoidsHazards: string[]; // List of incident IDs avoided compared to other candidates
  isFastest: boolean;
  isSafest: boolean;
  isRecommended: boolean;
  isNotRecommended: boolean;
  recommendationReason?: string;
  cost: number; // durationMinutes + 0.4 * exposureScore
  provenance: 'osrm' | 'demo_fallback';
}

export interface RouteComparisonResult {
  routes: RouteOption[];
  origin: RouteCoordinates & { name?: string };
  destination: RouteCoordinates & { name?: string };
  fastestRouteId: string;
  safestRouteId: string;
  recommendedRouteId: string;
  hasHighExposureOverall: boolean;
  computedAt: string;
  warnings: string[];
}

export interface RawOsrmRoute {
  geometry: {
    coordinates: [number, number][]; // [lng, lat]
    type: string;
  };
  distance: number; // meters
  duration: number; // seconds
  legs?: Array<{ summary?: string }>;
}

// PRD Section 3.4 Severity-based buffer distances
export const BUFFER_RADII: Record<'minor' | 'moderate' | 'severe', number> = {
  minor: 50,
  moderate: 75,
  severe: 120,
};

/**
 * Validates coordinate inputs according to PRD constraints:
 * - Latitude in [-90, 90], Longitude in [-180, 180]
 * - Start and destination must differ by > 200m
 */
export function validateRouteCoordinates(
  from: RouteCoordinates,
  to: RouteCoordinates
): { valid: boolean; error?: string; distanceKm?: number } {
  if (
    typeof from?.lat !== 'number' ||
    typeof from?.lng !== 'number' ||
    typeof to?.lat !== 'number' ||
    typeof to?.lng !== 'number' ||
    isNaN(from.lat) ||
    isNaN(from.lng) ||
    isNaN(to.lat) ||
    isNaN(to.lng)
  ) {
    return { valid: false, error: 'Origin and destination must provide valid numeric latitude and longitude.' };
  }

  if (from.lat < -90 || from.lat > 90 || to.lat < -90 || to.lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees.' };
  }

  if (from.lng < -180 || from.lng > 180 || to.lng < -180 || to.lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees.' };
  }

  const pFrom = turf.point([from.lng, from.lat]);
  const pTo = turf.point([to.lng, to.lat]);
  const distanceKm = turf.distance(pFrom, pTo, { units: 'kilometers' });

  if (distanceKm < 0.2) {
    return {
      valid: false,
      error: 'Origin and destination are too close (< 200m). Please select distinct departure and arrival points.',
      distanceKm,
    };
  }

  if (distanceKm > 300) {
    return {
      valid: false,
      error: 'Route distance exceeds maximum supported regional corridor range (300 km).',
      distanceKm,
    };
  }

  return { valid: true, distanceKm };
}

/**
 * Calculates hazard exposure for a single route geometry using Turf.js
 * Implements Section 3.4 of FloodIntel PRD.
 */
export function evaluateRouteHazardExposure(
  routeCoordinates: [number, number][],
  incidents: Incident[] | null | undefined
): {
  hazardCount: number;
  exposureScore: number | null;
  exposureCategory: 'low' | 'moderate' | 'high' | 'unknown';
  exposureCaveat?: string;
  relevantHazards: RouteHazardImpact[];
  hazardousSegments: HazardousSegment[];
} {
  // If incident data is unavailable or omitted, return Unknown exposure per PRD Section 3.4
  if (!incidents || !Array.isArray(incidents)) {
    return {
      hazardCount: 0,
      exposureScore: null,
      exposureCategory: 'unknown',
      exposureCaveat: 'Hazard telemetry unavailable. Road flood exposure cannot be verified.',
      relevantHazards: [],
      hazardousSegments: [],
    };
  }

  if (routeCoordinates.length < 2) {
    return {
      hazardCount: 0,
      exposureScore: 0,
      exposureCategory: 'low',
      exposureCaveat: 'No known hazards. Data may be incomplete.',
      relevantHazards: [],
      hazardousSegments: [],
    };
  }

  const routeLine = turf.lineString(routeCoordinates);
  const routeTotalKm = turf.length(routeLine, { units: 'kilometers' });

  const relevantHazards: RouteHazardImpact[] = [];
  const hazardousSegments: HazardousSegment[] = [];

  // Active / non-cleared hazards
  const candidateIncidents = incidents.filter(
    (i) => i.severity !== 'cleared' && i.status !== 'Resolved'
  );

  for (const incident of candidateIncidents) {
    const { lat, lng } = incident.coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;

    const hazardPoint = turf.point([lng, lat]);
    const normSev = normalizeSeverity(incident.severity);
    const bufferRadiusM = BUFFER_RADII[normSev];

    // Check distance from hazard to route polyline
    const distM = turf.pointToLineDistance(hazardPoint, routeLine, { units: 'meters' });

    if (distM <= bufferRadiusM) {
      // Find nearest point along the route
      const nearest = turf.nearestPointOnLine(routeLine, hazardPoint, { units: 'kilometers' });
      const distanceAlongRouteKm = Number((nearest.properties.location ?? 0).toFixed(2));

      // Proximity factor: 1 if within 30m, falls linearly to 0.3 at buffer edge (PRD Section 3.4)
      let proximityFactor = 1.0;
      if (distM > 30) {
        const denom = Math.max(1, bufferRadiusM - 30);
        proximityFactor = Math.max(0.3, 1.0 - 0.7 * ((distM - 30) / denom));
      }

      // Base risk score (use computed deterministic score, fallback to severity estimate if null)
      const baseRiskScore =
        incident.riskScore !== null && incident.riskScore !== undefined
          ? incident.riskScore
          : normSev === 'severe'
          ? 80
          : normSev === 'moderate'
          ? 50
          : 25;

      const impact = Number(((baseRiskScore / 100) * proximityFactor).toFixed(4));

      relevantHazards.push({
        incidentId: incident.id,
        title: incident.title,
        location: incident.location,
        severity: incident.severity,
        depth: incident.depth,
        riskScore: baseRiskScore,
        distanceAlongRouteKm,
        distanceToRouteM: Math.round(distM),
        bufferRadiusM,
        impact,
        coordinates: { lat, lng },
      });

      // Compute hazardous road segment
      const bufferKm = bufferRadiusM / 1000;
      const startKm = Number(Math.max(0, distanceAlongRouteKm - bufferKm).toFixed(2));
      const endKm = Number(Math.min(routeTotalKm, distanceAlongRouteKm + bufferKm).toFixed(2));
      const lengthM = Math.round((endKm - startKm) * 1000);

      hazardousSegments.push({
        startKm,
        endKm,
        lengthM,
        incidentId: incident.id,
        severity: normSev,
      });
    }
  }

  // Sort hazards by their position along the route
  relevantHazards.sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);
  hazardousSegments.sort((a, b) => a.startKm - b.startKm);

  // Saturating union: Exposure score = 100 * (1 - Π(1 - impact_h)) (PRD Section 3.4)
  let complementProduct = 1.0;
  for (const h of relevantHazards) {
    complementProduct *= Math.max(0, 1 - h.impact);
  }

  const rawExposure = Math.round(100 * (1 - complementProduct));
  const exposureScore = Math.min(100, Math.max(0, rawExposure));

  // Category determination
  let exposureCategory: 'low' | 'moderate' | 'high' = 'low';
  if (exposureScore > 66) {
    exposureCategory = 'high';
  } else if (exposureScore > 33) {
    exposureCategory = 'moderate';
  }

  let exposureCaveat: string | undefined;
  if (relevantHazards.length === 0) {
    exposureCaveat = 'No known waterlogging reports on this path. Verification coverage may be incomplete.';
  } else if (exposureCategory === 'high') {
    exposureCaveat = 'High flood exposure. Impassable choke points or deep water reported along this corridor.';
  }

  return {
    hazardCount: relevantHazards.length,
    exposureScore,
    exposureCategory,
    exposureCaveat,
    relevantHazards,
    hazardousSegments,
  };
}

/**
 * Fetches real driving routes from the OSRM routing service
 * Calls https://router.project-osrm.org with timeout & retry
 */
export async function fetchOsrmRoutes(
  from: RouteCoordinates,
  to: RouteCoordinates,
  profile: string = 'driving',
  incidentsForDetour?: Incident[]
): Promise<{ routes: RawOsrmRoute[]; warnings: string[] }> {
  const osrmProfile = profile === 'bike' ? 'driving' : 'driving'; // Public OSRM demo predominantly hosts car driving profile
  const coordsParam = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordsParam}?overview=full&geometries=geojson&alternatives=3&steps=false`;

  const warnings: string[] = [
    'Public OSRM demo server used for routing trajectory. Subject to usage restrictions; production deployments require dedicated OSRM/Valhalla hosting.',
  ];

  let lastError: Error | null = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FloodIntel/1.0 (Municipal Environmental Monitoring System)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM responded with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error(`OSRM route calculation error: ${data.message || data.code || 'No route found'}`);
      }

      const finalRoutes = data.routes as RawOsrmRoute[];

      // When OSRM returns fewer than 3 routes and hazards exist on the primary path,
      // generate hazard-avoiding via-point alternatives (PRD Section 3.4 Algorithm step 4)
      if (finalRoutes.length < 3 && incidentsForDetour && incidentsForDetour.length > 0) {
        const primaryRoute = finalRoutes[0];
        const primaryExposure = evaluateRouteHazardExposure(primaryRoute.geometry.coordinates, incidentsForDetour);

        if (primaryExposure.hazardCount > 0) {
          const topHazards = primaryExposure.relevantHazards.slice(0, 2);
          for (const th of topHazards) {
            if (finalRoutes.length >= 3) break;
            const inc = incidentsForDetour.find((i) => i.id === th.incidentId);
            if (!inc) continue;

            // Generate perpendicular offsets (450m East and West)
            const hazardPoint = turf.point([inc.coordinates.lng, inc.coordinates.lat]);
            const offsets = [
              turf.destination(hazardPoint, 0.45, 90, { units: 'kilometers' }),
              turf.destination(hazardPoint, 0.45, 270, { units: 'kilometers' }),
            ];

            for (const offsetPoint of offsets) {
              if (finalRoutes.length >= 3) break;
              const [viaLng, viaLat] = offsetPoint.geometry.coordinates;
              const viaUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${from.lng},${from.lat};${viaLng},${viaLat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`;

              try {
                const viaRes = await fetch(viaUrl, {
                  headers: {
                    Accept: 'application/json',
                    'User-Agent': 'FloodIntel/1.0 (Municipal Environmental Monitoring System)',
                  },
                  signal: AbortSignal.timeout(3500),
                });
                if (viaRes.ok) {
                  const viaData = await viaRes.json();
                  if (viaData.code === 'Ok' && Array.isArray(viaData.routes) && viaData.routes.length > 0) {
                    const candidateRoute = viaData.routes[0];
                    if (candidateRoute.duration <= primaryRoute.duration * 1.8) {
                      candidateRoute.legs = [{ summary: `Detour Bypassing ${th.incidentId}` }];
                      finalRoutes.push(candidateRoute);
                    }
                  }
                }
              } catch {
                // Ignore via-point timeout/error and proceed with existing candidates
              }
            }
          }
        }
      }

      return {
        routes: finalRoutes,
        warnings,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt < maxAttempts) {
        // Backoff delay
        await new Promise((res) => setTimeout(res, 400 * attempt));
      }
    }
  }

  throw lastError || new Error('Failed to retrieve routes from OSRM.');
}

/**
 * Fallback route generator when public OSRM is unreachable
 * Clearly marked as demo fallback per PRD instructions
 */
export function generateDemoFallbackRoutes(
  from: RouteCoordinates,
  to: RouteCoordinates
): RawOsrmRoute[] {
  // Direct baseline route
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;

  const directDist = turf.distance(turf.point([from.lng, from.lat]), turf.point([to.lng, to.lat]), {
    units: 'meters',
  });

  // Candidate 1: North detour (bypasses central canal)
  const c1Coords: [number, number][] = [
    [from.lng, from.lat],
    [from.lng + 0.005, from.lat + 0.008],
    [midLng + 0.008, midLat + 0.012],
    [to.lng - 0.004, to.lat + 0.005],
    [to.lng, to.lat],
  ];

  // Candidate 2: Central direct route (crosses central basin)
  const c2Coords: [number, number][] = [
    [from.lng, from.lat],
    [from.lng + 0.002, from.lat + 0.001],
    [midLng, midLat],
    [to.lng - 0.002, to.lat - 0.001],
    [to.lng, to.lat],
  ];

  // Candidate 3: South bypass (longer, around south basin)
  const c3Coords: [number, number][] = [
    [from.lng, from.lat],
    [from.lng - 0.003, from.lat - 0.006],
    [midLng - 0.006, midLat - 0.008],
    [to.lng + 0.003, to.lat - 0.004],
    [to.lng, to.lat],
  ];

  return [
    {
      distance: Math.round(directDist * 1.3),
      duration: Math.round((directDist * 1.3) / 8.5), // ~30 km/h
      geometry: { coordinates: c1Coords, type: 'LineString' },
      legs: [{ summary: 'Via Outer Perimeter Bypass' }],
    },
    {
      distance: Math.round(directDist * 1.05),
      duration: Math.round((directDist * 1.05) / 6.0), // ~22 km/h
      geometry: { coordinates: c2Coords, type: 'LineString' },
      legs: [{ summary: 'Via Central Avenue' }],
    },
    {
      distance: Math.round(directDist * 1.45),
      duration: Math.round((directDist * 1.45) / 9.0), // ~32 km/h
      geometry: { coordinates: c3Coords, type: 'LineString' },
      legs: [{ summary: 'Via Southern Canal Parkway' }],
    },
  ];
}

/**
 * Ranks and compares all candidate routes according to PRD Section 3.4
 */
export function rankAndCompareRoutes(
  rawRoutes: RawOsrmRoute[],
  incidents: Incident[] | null | undefined,
  provenance: 'osrm' | 'demo_fallback' = 'osrm'
): RouteOption[] {
  if (rawRoutes.length === 0) return [];

  // 1. Evaluate hazard exposure for each candidate
  const evaluated = rawRoutes.map((raw, idx) => {
    const coords = raw.geometry.coordinates;
    const exposureData = evaluateRouteHazardExposure(coords, incidents);

    const distanceM = Math.round(raw.distance);
    const distanceKm = Number((distanceM / 1000).toFixed(1));
    const durationS = Math.round(raw.duration);
    const durationMin = Math.max(1, Math.round(durationS / 60));

    // Summary naming
    const idLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', ...
    const summary = raw.legs?.[0]?.summary?.trim();
    const name = summary && summary.length > 0 ? `Via ${summary}` : `Route ${idLetter} Corridor`;

    // Cost formula: durationMinutes + 0.4 * exposureScore (PRD Section 3.4)
    const exposureForCost = exposureData.exposureScore ?? 25;
    const cost = Number((durationMin + 0.4 * exposureForCost).toFixed(1));

    // Severe hazard check
    const hasSevereHazard = exposureData.relevantHazards.some(
      (h) => normalizeSeverity(h.severity) === 'severe'
    );

    return {
      id: idLetter,
      name,
      distanceM,
      distanceKm,
      durationS,
      durationMin,
      timeDeltaMin: 0,
      geometry: {
        type: 'LineString' as const,
        coordinates: coords,
      },
      ...exposureData,
      avoidsHazards: [] as string[],
      isFastest: false,
      isSafest: false,
      isRecommended: false,
      isNotRecommended: hasSevereHazard,
      recommendationReason: undefined,
      cost,
      provenance,
    } as RouteOption;
  });

  // 2. Identify fastest route
  let fastestIdx = 0;
  for (let i = 1; i < evaluated.length; i++) {
    if (evaluated[i].durationS < evaluated[fastestIdx].durationS) {
      fastestIdx = i;
    }
  }
  const fastestDurationMin = evaluated[fastestIdx].durationMin;

  // Calculate time delta vs fastest
  for (const r of evaluated) {
    r.timeDeltaMin = Math.max(0, r.durationMin - fastestDurationMin);
  }
  evaluated[fastestIdx].isFastest = true;

  // 3. Identify safest route (lowest exposure score, duration as tiebreaker)
  let safestIdx = 0;
  for (let i = 1; i < evaluated.length; i++) {
    const currExp = evaluated[i].exposureScore ?? 999;
    const bestExp = evaluated[safestIdx].exposureScore ?? 999;
    if (currExp < bestExp || (currExp === bestExp && evaluated[i].durationS < evaluated[safestIdx].durationS)) {
      safestIdx = i;
    }
  }
  evaluated[safestIdx].isSafest = true;

  // 4. Identify recommended route (lowest cost, with severe hazard check)
  // Hard rule: route with severe hazard is Not Recommended unless all routes have severe hazards
  const allHaveSevere = evaluated.every((r) => r.isNotRecommended);
  if (allHaveSevere) {
    for (const r of evaluated) {
      r.isNotRecommended = false; // reset flag if all fail
    }
  }

  const eligibleForRec = evaluated.filter((r) => !r.isNotRecommended);
  let recommendedItem = evaluated[0];

  if (eligibleForRec.length > 0) {
    recommendedItem = eligibleForRec.reduce((prev, curr) => (curr.cost < prev.cost ? curr : prev));
  } else {
    recommendedItem = evaluated.reduce((prev, curr) => (curr.cost < prev.cost ? curr : prev));
  }
  recommendedItem.isRecommended = true;

  // 5. Calculate avoided hazards compared to other candidates
  // Collect all hazard IDs present on any route
  const allEncounteredHazards = new Set<string>();
  for (const r of evaluated) {
    for (const h of r.relevantHazards) {
      allEncounteredHazards.add(h.incidentId);
    }
  }

  for (const r of evaluated) {
    const thisRouteHazards = new Set(r.relevantHazards.map((h) => h.incidentId));
    const avoided = Array.from(allEncounteredHazards).filter((id) => !thisRouteHazards.has(id));
    r.avoidsHazards = avoided;

    // Build recommendation reason explanation
    if (r.isRecommended) {
      if (r.hazardCount === 0 && r.isFastest) {
        r.recommendationReason = 'Fastest route and completely bypasses all known waterlogging reports.';
      } else if (r.hazardCount === 0) {
        r.recommendationReason = `Adds ${r.timeDeltaMin} min, but avoids all ${avoided.length} hazard choke points detected on alternative routes.`;
      } else if (r.isSafest) {
        r.recommendationReason = 'Offers lowest overall flood risk exposure among available routes.';
      } else {
        r.recommendationReason = 'Provides optimal balance between transit duration and flood safety margin.';
      }
    } else if (r.isNotRecommended) {
      r.recommendationReason = 'Crosses critical waterlogging choke point with severe measured water depth.';
    }
  }

  return evaluated;
}
