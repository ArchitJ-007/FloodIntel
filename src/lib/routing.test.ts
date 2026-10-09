import assert from 'node:assert/strict';
import {
  validateRouteCoordinates,
  evaluateRouteHazardExposure,
  rankAndCompareRoutes,
  type RawOsrmRoute,
  BUFFER_RADII,
} from './routing.ts';
import { type Incident } from './demoIncidents.ts';

console.log('--- Running FloodIntel Route Planning & Turf.js Hazard Test Suite ---\n');

// Mock route coordinates: straight line from [77.620, 12.930] to [77.640, 12.950]
const sampleRouteCoords: [number, number][] = [
  [77.6200, 12.9300],
  [77.6250, 12.9350],
  [77.6300, 12.9400],
  [77.6350, 12.9450],
  [77.6400, 12.9500],
];

// 1. Coordinates Validation Tests
{
  const valid = validateRouteCoordinates(
    { lat: 12.9348, lng: 77.6205 },
    { lat: 12.9550, lng: 77.6400 }
  );
  assert.equal(valid.valid, true, 'Valid coordinates within demo city should pass validation');

  const tooClose = validateRouteCoordinates(
    { lat: 12.934800, lng: 77.620500 },
    { lat: 12.934850, lng: 77.620520 } // ~7 meters
  );
  assert.equal(tooClose.valid, false, 'Endpoints < 200m apart should be rejected');
  assert.match(tooClose.error!, /too close/, 'Error message should indicate endpoints are too close');

  const invalidLat = validateRouteCoordinates(
    { lat: 95.0, lng: 77.6205 },
    { lat: 12.9550, lng: 77.6400 }
  );
  assert.equal(invalidLat.valid, false, 'Latitude > 90 must be rejected');

  const invalidType = validateRouteCoordinates(
    { lat: NaN, lng: 77.6205 },
    { lat: 12.9550, lng: 77.6400 }
  );
  assert.equal(invalidType.valid, false, 'NaN coordinates must be rejected');

  // National India-wide route (Mumbai to Delhi, ~1,150 km)
  const nationalRoute = validateRouteCoordinates(
    { lat: 19.0760, lng: 72.8777 }, // Mumbai
    { lat: 28.6139, lng: 77.2090 }  // Delhi
  );
  assert.equal(nationalRoute.valid, true, 'National route (Mumbai to Delhi ~1,150 km) must pass validation');

  // Extreme international / out of bounds distance (> 3,500 km, e.g. Mumbai to London ~7,200 km)
  const extremeDistance = validateRouteCoordinates(
    { lat: 19.0760, lng: 72.8777 }, // Mumbai
    { lat: 51.5074, lng: -0.1278 }  // London
  );
  assert.equal(extremeDistance.valid, false, 'Distance > 3500 km must be rejected');
  assert.match(extremeDistance.error!, /3,500 km/, 'Error mentions 3,500 km limit');

  console.log('✅ PASSED: Coordinate validation correctly rejects invalid, identical, <200m, and >3500km endpoints, while accepting national routes');
}

// 2. Route with Known Incident Near Route Increases Exposure Score
{
  // Point directly on the route line: [77.6300, 12.9400]
  const nearIncident: Incident = {
    id: '#TEST-001',
    title: 'Test Flooded Underpass',
    location: 'Central Cross',
    zone: 'Sector 4',
    hazardType: 'flooded_road',
    hazardTypeLabel: 'Flooded Road',
    severity: 'high',
    status: 'In Progress',
    depth: '2.0 ft',
    depthValueFt: 2.0,
    depthCm: 60,
    reportedTime: '10m ago',
    reportedTimestamp: Date.now() - 600000,
    createdAt: Date.now() - 600000,
    updatedAt: Date.now(),
    reportedBy: 'Scout',
    trafficImpact: 'Impassable',
    verifiedCount: 5,
    corroborationCount: 5,
    provenance: 'demo',
    verificationStatus: 'demo',
    riskScore: 85,
    riskCategory: 'high',
    confidence: 'high',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: {
      lat: 12.9400,
      lng: 77.6300, // Exactly on route line
      xPercent: 50,
      yPercent: 50,
    },
  };

  const cleanEval = evaluateRouteHazardExposure(sampleRouteCoords, []);
  assert.equal(cleanEval.hazardCount, 0, 'Clean route should have 0 hazards');
  assert.equal(cleanEval.exposureScore, 0, 'Clean route should have 0 exposure score');
  assert.equal(cleanEval.exposureCategory, 'low', 'Clean route should be low exposure category');
  assert.ok(cleanEval.exposureCaveat?.includes('incomplete'), 'Clean route must carry incomplete coverage caveat');

  const exposedEval = evaluateRouteHazardExposure(sampleRouteCoords, [nearIncident]);
  assert.equal(exposedEval.hazardCount, 1, 'Incident on route must be detected');
  assert.ok((exposedEval.exposureScore ?? 0) > 0, 'Incident on route must increase exposure score');
  assert.equal(exposedEval.relevantHazards[0].incidentId, '#TEST-001');
  assert.equal(exposedEval.hazardousSegments.length, 1, 'Must produce 1 hazardous road segment');

  console.log(`✅ PASSED: Known incident near route increases exposure score (from 0 to ${exposedEval.exposureScore})`);
}

// 3. Incident Outside Buffer Distance Does Not Affect Route
{
  const farIncident: Incident = {
    id: '#TEST-FAR',
    title: 'Far Lake Drain',
    location: 'Distant Basin',
    zone: 'Sector 9',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Waterlogging',
    severity: 'low',
    status: 'Reported',
    depth: '0.2 ft',
    depthValueFt: 0.2,
    depthCm: 6,
    reportedTime: '1h ago',
    reportedTimestamp: Date.now() - 3600000,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    reportedBy: 'Citizen',
    trafficImpact: 'Normal',
    verifiedCount: 1,
    corroborationCount: 1,
    provenance: 'demo',
    verificationStatus: 'demo',
    riskScore: 20,
    riskCategory: 'low',
    confidence: 'low',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: {
      lat: 12.9100, // > 2km south of route
      lng: 77.6100,
      xPercent: 10,
      yPercent: 10,
    },
  };

  const evalFar = evaluateRouteHazardExposure(sampleRouteCoords, [farIncident]);
  assert.equal(evalFar.hazardCount, 0, 'Distant incident outside buffer must not intersect route');
  assert.equal(evalFar.exposureScore, 0, 'Distant incident must not increase route exposure score');

  console.log('✅ PASSED: Incident outside severity buffer (>50-120m) does not affect route exposure');
}

// 4. Unavailable Hazard Data Returns Unknown Category
{
  const evalNull = evaluateRouteHazardExposure(sampleRouteCoords, null);
  assert.equal(evalNull.exposureScore, null, 'Null incident data must return null exposure score');
  assert.equal(evalNull.exposureCategory, 'unknown', 'Null incident data must return Unknown category');
  assert.notEqual(evalNull.exposureCategory, 'low', 'Unavailable data must never be presented as Low or Safe');
  assert.ok(evalNull.exposureCaveat?.includes('unavailable'), 'Caveat must indicate telemetry unavailable');

  console.log('✅ PASSED: Route with unavailable hazard data is labelled Unknown, never Low or Safe');
}

// 5. Saturating Union Score Bounded in [0, 100] with Multiple Overlapping Hazards
{
  // 5 severe hazards stacked along the route
  const multipleHazards: Incident[] = [0, 1, 2, 3, 4].map((idx) => ({
    id: `#FLD-SAT-${idx}`,
    title: `Choke Point ${idx}`,
    location: 'Corridor',
    zone: 'Sector 4',
    hazardType: 'flooded_road',
    hazardTypeLabel: 'Flooded Road',
    severity: 'high',
    status: 'In Progress',
    depth: '3.0 ft',
    depthValueFt: 3.0,
    depthCm: 90,
    reportedTime: '5m ago',
    reportedTimestamp: Date.now() - 300000,
    createdAt: Date.now() - 300000,
    updatedAt: Date.now(),
    reportedBy: 'Monitor',
    trafficImpact: 'Blocked',
    verifiedCount: 10,
    corroborationCount: 10,
    provenance: 'demo',
    verificationStatus: 'demo',
    riskScore: 95,
    riskCategory: 'high',
    confidence: 'high',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: {
      lat: 12.9300 + idx * 0.005,
      lng: 77.6200 + idx * 0.005,
      xPercent: 20,
      yPercent: 20,
    },
  }));

  const satEval = evaluateRouteHazardExposure(sampleRouteCoords, multipleHazards);
  assert.equal(satEval.hazardCount, 5, 'All 5 hazards along route should be detected');
  assert.ok(satEval.exposureScore! <= 100, 'Saturating union must never exceed 100');
  assert.ok(satEval.exposureScore! >= 90, 'Multiple severe hazards should yield high exposure score >= 90');
  assert.equal(satEval.exposureCategory, 'high');

  console.log(`✅ PASSED: Multiple overlapping hazards properly saturate union without exceeding 100 (got: ${satEval.exposureScore})`);
}

// 6. Route Comparison, Ranking, and Labels
{
  const rawRoutes: RawOsrmRoute[] = [
    {
      distance: 5000,
      duration: 300, // 5 min (Fastest, but crosses high hazard)
      geometry: {
        type: 'LineString',
        coordinates: sampleRouteCoords,
      },
      legs: [{ summary: 'Downtown Choke Route' }],
    },
    {
      distance: 7200,
      duration: 540, // 9 min (Bypasses hazard, 0 hazards)
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6200, 12.9300],
          [77.6150, 12.9420], // North arc bypass
          [77.6280, 12.9520],
          [77.6400, 12.9500],
        ],
      },
      legs: [{ summary: 'Outer Perimeter Safe Bypass' }],
    },
  ];

  const severeHazard: Incident = {
    id: '#FLD-CHOKE',
    title: 'Severe Underpass Choke',
    location: 'Downtown Center',
    zone: 'Sector 4',
    hazardType: 'flooded_road',
    hazardTypeLabel: 'Flooded Road',
    severity: 'high',
    status: 'In Progress',
    depth: '2.5 ft',
    depthValueFt: 2.5,
    depthCm: 76,
    reportedTime: '15m ago',
    reportedTimestamp: Date.now() - 900000,
    createdAt: Date.now() - 900000,
    updatedAt: Date.now(),
    reportedBy: 'Team',
    trafficImpact: 'Impassable',
    verifiedCount: 15,
    corroborationCount: 15,
    provenance: 'demo',
    verificationStatus: 'demo',
    riskScore: 80,
    riskCategory: 'high',
    confidence: 'high',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: {
      lat: 12.9350,
      lng: 77.6250, // on Route A, off Route B
      xPercent: 30,
      yPercent: 30,
    },
  };

  const ranked = rankAndCompareRoutes(rawRoutes, [severeHazard]);
  assert.equal(ranked.length, 2);

  const routeA = ranked[0];
  const routeB = ranked[1];

  // Route A has lowest duration -> Fastest
  assert.equal(routeA.isFastest, true, 'Route A must be flagged as Fastest');
  assert.equal(routeA.timeDeltaMin, 0);

  // Route A passes a severe hazard -> isNotRecommended must be true
  assert.equal(routeA.isNotRecommended, true, 'Route passing severe hazard must be flagged Not Recommended');

  // Route B has 0 hazards -> Safest
  assert.equal(routeB.isSafest, true, 'Route B must be flagged as Safest');
  assert.equal(routeB.hazardCount, 0, 'Route B must have 0 hazards');
  assert.equal(routeB.isRecommended, true, 'Route B must be Recommended over Route A because Route A is Not Recommended');
  assert.deepEqual(routeB.avoidsHazards, ['#FLD-CHOKE'], 'Route B must report avoiding #FLD-CHOKE');
  assert.ok(routeB.timeDeltaMin > 0, 'Route B must record additional duration compared to fastest route');

  console.log('✅ PASSED: Route comparison correctly assigns Fastest, Safest, and Recommended with severe hazard override');
}

console.log('\n✨ ALL ROUTE PLANNING & HAZARD TESTS PASSED SUCCESSFULLY! ✨\n');
