/**
 * FloodIntel — Reporting Validation and Duplicate Detection Test Suite
 * 
 * Tests Section 2 & 3 requirements of Phase 6:
 * - Hazard report input validation (required fields, lengths, bounds, enums)
 * - Safe sanitization without silent meaning changes
 * - Deterministic duplicate detection (spatial proximity, time window, category/keyword overlap)
 * - Boundary conditions and missing comparison fields
 */

import {
  validateHazardReport,
  detectDuplicateReport,
  sanitizeInputText,
  haversineDistanceM,
  REPORT_VALIDATION_CONFIG,
} from './reportingValidation.ts';
import type { Incident } from './demoIncidents.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- Running FloodIntel Reporting Validation & Duplicate Detection Test Suite ---\n');

// ==========================================
// 1. Text Sanitization
// ==========================================
console.log('Testing Text Sanitization:');
const htmlInput = '  <script>alert("xss")</script>Severe flooding on <b>Outer Ring Road</b> &amp; water rising!  ';
const sanitized = sanitizeInputText(htmlInput);
assert(
  !sanitized.includes('<script>') && !sanitized.includes('<b>') && sanitized.includes('Outer Ring Road'),
  `Sanitization strips HTML tags while preserving text content: "${sanitized}"`
);
assert(
  sanitized === 'alert("xss")Severe flooding on Outer Ring Road &amp; water rising!',
  `HTML entities and tags preserved safely without executing: "${sanitized}"`
);

// ==========================================
// 2. Input Validation: Invalid Cases
// ==========================================
console.log('\nTesting Report Input Validation (Invalid Cases):');

// Blank description
const blankDescResult = validateHazardReport({
  description: '   ',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175, lng: 77.6234 },
  hazardType: 'standing_water',
  severity: 'moderate',
  waterDepth: 'knee_deep',
});
assert(!blankDescResult.isValid, 'Rejects whitespace-only description');
assert(!!blankDescResult.errors.description, 'Provides description field error for whitespace-only');

// Too short description (< 15 chars)
const shortDescResult = validateHazardReport({
  description: 'Water here',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175, lng: 77.6234 },
  hazardType: 'standing_water',
  severity: 'moderate',
  waterDepth: 'knee_deep',
});
assert(!shortDescResult.isValid, 'Rejects description shorter than 15 chars');
assert(
  blankDescResult.errors.description?.includes('15') || shortDescResult.errors.description?.includes('15'),
  'Field error mentions minimum 15 characters'
);

// Too long description (> 500 chars)
const longDescResult = validateHazardReport({
  description: 'A'.repeat(501),
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175, lng: 77.6234 },
  hazardType: 'standing_water',
  severity: 'moderate',
  waterDepth: 'knee_deep',
});
assert(!longDescResult.isValid, 'Rejects description exceeding 500 chars');
assert(!!longDescResult.errors.description, 'Provides error for description > 500 chars');

// Blank location
const blankLocResult = validateHazardReport({
  description: 'Water is accumulating rapidly near the flyover ramp.',
  location: '   ',
  coordinates: { lat: 12.9175, lng: 77.6234 },
  hazardType: 'standing_water',
  severity: 'moderate',
  waterDepth: 'knee_deep',
});
assert(!blankLocResult.isValid, 'Rejects whitespace-only location');
assert(!!blankLocResult.errors.location, 'Provides location field error');

// Out of range coordinates
const invalidCoordsLatResult = validateHazardReport({
  description: 'Water is accumulating rapidly near the flyover ramp.',
  location: 'Silk Board Junction',
  coordinates: { lat: 95.0, lng: 77.6234 }, // Lat > 90
  hazardType: 'standing_water',
  severity: 'moderate',
  waterDepth: 'knee_deep',
});
assert(!invalidCoordsLatResult.isValid, 'Rejects latitude > 90');
assert(!!invalidCoordsLatResult.errors.coordinates, 'Provides coordinates field error for invalid lat');

const invalidCoordsLngResult = validateHazardReport({
  description: 'Water is accumulating rapidly near the flyover ramp.',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175, lng: 200.0 }, // Lng > 180
  hazardType: 'standing_water',
  severity: 'moderate',
  waterDepth: 'knee_deep',
});
assert(!invalidCoordsLngResult.isValid, 'Rejects longitude > 180');

// Invalid enums
const invalidEnumResult = validateHazardReport({
  description: 'Water is accumulating rapidly near the flyover ramp.',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175, lng: 77.6234 },
  hazardType: 'tsunami',
  severity: 'extreme',
  waterDepth: 'ocean_floor',
});
assert(!invalidEnumResult.isValid, 'Rejects invalid enum values');
assert(!!invalidEnumResult.errors.hazardType, 'Flags invalid hazardType enum');
assert(!!invalidEnumResult.errors.severity, 'Flags invalid severity enum');
assert(!!invalidEnumResult.errors.waterDepth, 'Flags invalid waterDepth enum');

// ==========================================
// 3. Input Validation: Valid Case
// ==========================================
console.log('\nTesting Report Input Validation (Valid Case):');
const validResult = validateHazardReport({
  description: '  Deep standing water blocking underpass traffic completely.  ',
  location: '  Silk Board Flyover Underpass  ',
  coordinates: { lat: 12.9175, lng: 77.6234 },
  hazardType: 'waterlogging',
  severity: 'high',
  waterDepth: 'knee',
});
assert(validResult.isValid, 'Accepts valid hazard report');
assert(Object.keys(validResult.errors).length === 0, 'Produces 0 errors for valid report');
assert(validResult.sanitized !== undefined, 'Returns sanitized and normalized data payload');
assert(
  validResult.sanitized?.description === 'Deep standing water blocking underpass traffic completely.',
  'Trims description cleanly'
);
assert(
  validResult.sanitized?.location === 'Silk Board Flyover Underpass',
  'Trims location cleanly'
);

// ==========================================
// 4. Distance Calculation
// ==========================================
console.log('\nTesting Haversine Distance Calculation:');
// Known distance: Silk Board (12.9175, 77.6234) to nearby point ~127m away (12.9185, 77.6240)
const dist1 = haversineDistanceM(12.9175, 77.6234, 12.9185, 77.6240);
assert(dist1 > 110 && dist1 < 160, `Calculates realistic geographic distance (~130m): ${Math.round(dist1)}m`);

const zeroDist = haversineDistanceM(12.9175, 77.6234, 12.9175, 77.6234);
assert(zeroDist === 0, 'Zero distance for identical coordinates');

// ==========================================
// 5. Duplicate Detection
// ==========================================
console.log('\nTesting Duplicate Detection:');

const baseNow = Date.now();
const mockActiveIncidents: Incident[] = [
  {
    id: 'INC-DEMO-001',
    title: 'Waterlogging at Silk Board Junction',
    location: 'Silk Board Junction',
    zone: 'South Corridor',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Standing Water',
    severity: 'high',
    status: 'Under Review',
    depth: 'knee_deep',
    depthValueFt: 1.5,
    depthCm: 45,
    reportedTime: '30m ago',
    reportedTimestamp: baseNow - 30 * 60 * 1000, // 30 mins ago
    createdAt: baseNow - 30 * 60 * 1000,
    updatedAt: baseNow - 30 * 60 * 1000,
    reportedBy: 'Citizen',
    trafficImpact: 'Severe delays',
    verifiedCount: 1,
    corroborationCount: 2,
    provenance: 'user',
    verificationStatus: 'unverified',
    riskScore: 78,
    riskCategory: 'high',
    confidence: 'high',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: { lat: 12.9175, lng: 77.6234, xPercent: 50, yPercent: 50 },
  } as unknown as Incident,
  {
    id: 'INC-DEMO-002',
    title: 'Bellandur EcoSpace Water Surge',
    location: 'Bellandur EcoSpace',
    zone: 'East Corridor',
    hazardType: 'flooded_road',
    hazardTypeLabel: 'Flooded Road',
    severity: 'high',
    status: 'In Progress',
    depth: 'waist_deep',
    depthValueFt: 3.0,
    depthCm: 90,
    reportedTime: '45m ago',
    reportedTimestamp: baseNow - 45 * 60 * 1000, // 45 mins ago
    createdAt: baseNow - 45 * 60 * 1000,
    updatedAt: baseNow - 45 * 60 * 1000,
    reportedBy: 'Field Agent',
    trafficImpact: 'Road closed',
    verifiedCount: 3,
    corroborationCount: 4,
    provenance: 'partner',
    verificationStatus: 'verified',
    riskScore: 92,
    riskCategory: 'high',
    confidence: 'high',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: { lat: 12.9260, lng: 77.6762, xPercent: 70, yPercent: 40 },
  } as unknown as Incident,
  {
    id: 'INC-DEMO-003',
    title: 'Old Resolved Silk Board Flood',
    location: 'Silk Board Junction',
    zone: 'South Corridor',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Standing Water',
    severity: 'low',
    status: 'Resolved', // RESOLVED!
    depth: 'ankle_deep',
    depthValueFt: 0.5,
    depthCm: 15,
    reportedTime: '20m ago',
    reportedTimestamp: baseNow - 20 * 60 * 1000,
    createdAt: baseNow - 20 * 60 * 1000,
    updatedAt: baseNow - 20 * 60 * 1000,
    reportedBy: 'Citizen',
    trafficImpact: 'Normal',
    verifiedCount: 1,
    corroborationCount: 1,
    provenance: 'user',
    verificationStatus: 'resolved',
    riskScore: 15,
    riskCategory: 'low',
    confidence: 'medium',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: { lat: 12.9176, lng: 77.6235, xPercent: 50, yPercent: 50 },
  } as unknown as Incident,
  {
    id: 'INC-DEMO-004',
    title: 'Silk Board Flood from Yesterday',
    location: 'Silk Board Junction',
    zone: 'South Corridor',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Standing Water',
    severity: 'high',
    status: 'Under Review',
    depth: 'knee_deep',
    depthValueFt: 1.5,
    depthCm: 45,
    reportedTime: '24h ago',
    reportedTimestamp: baseNow - 24 * 60 * 60 * 1000, // 24 hours ago (> 180 min threshold)
    createdAt: baseNow - 24 * 60 * 60 * 1000,
    updatedAt: baseNow - 24 * 60 * 60 * 1000,
    reportedBy: 'Citizen',
    trafficImpact: 'Severe',
    verifiedCount: 1,
    corroborationCount: 1,
    provenance: 'user',
    verificationStatus: 'unverified',
    riskScore: 40,
    riskCategory: 'moderate',
    confidence: 'low',
    scoreBreakdown: {} as any,
    warnings: [],
    coordinates: { lat: 12.9175, lng: 77.6234, xPercent: 50, yPercent: 50 },
  } as unknown as Incident,
];

// Test 5A: Matching duplicate candidate (< 250m, < 180min, matching category & location)
const duplicateCandidate = {
  description: 'Deep standing water at Silk Board Junction flyover blocking buses',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9180, lng: 77.6238 }, // ~70m away from INC-DEMO-001
  hazardType: 'waterlogging',
  severity: 'moderate',
};

const dupResult = detectDuplicateReport(duplicateCandidate, mockActiveIncidents, baseNow);
assert(dupResult.isDuplicateCandidate, 'Detects matching duplicate near Silk Board');
assert(dupResult.match?.id === 'INC-DEMO-001', 'Correctly matches active incident INC-DEMO-001');
assert(dupResult.match?.distanceM !== undefined && dupResult.match.distanceM < 250, 'Distance is within 250m threshold');
assert(dupResult.match?.minutesAgo !== undefined && dupResult.match.minutesAgo <= 35, 'Age is within 180min threshold');

// Test 5B: Unrelated nearby report with different category and non-overlapping keywords
const unrelatedNearbyCandidate = {
  description: 'A stray fallen branch on the footpath near the shop',
  location: 'Near Silk Board Tea Stall',
  coordinates: { lat: 12.9180, lng: 77.6238 }, // ~70m away
  hazardType: 'drainage_failure', // Different hazard category
  severity: 'low',
};
const unrelatedResult = detectDuplicateReport(unrelatedNearbyCandidate, mockActiveIncidents, baseNow);
assert(
  !unrelatedResult.isDuplicateCandidate,
  'Does not flag unrelated nearby event with different category & no flood keyword overlap'
);

// Test 5C: Distant report (> 250m) with identical category & description
const distantCandidate = {
  description: 'Deep standing water at Silk Board Junction flyover blocking buses',
  location: 'Silk Board Outer Area',
  coordinates: { lat: 12.9220, lng: 77.6280 }, // ~700m away (> 250m threshold)
  hazardType: 'waterlogging',
  severity: 'moderate',
};
const distantResult = detectDuplicateReport(distantCandidate, mockActiveIncidents, baseNow);
assert(!distantResult.isDuplicateCandidate, 'Rejects distant report (> 250m) despite same category and text');

// Test 5D: Same location, but existing incident is older than threshold (> 180 min)
const oldIncidentOnly: Incident[] = [mockActiveIncidents[3]];
const oldResult = detectDuplicateReport(duplicateCandidate, oldIncidentOnly, baseNow);
assert(!oldResult.isDuplicateCandidate, 'Does not match incident older than 180 minutes');

// Test 5E: Same location, but existing incident is already marked RESOLVED
const resolvedIncidentOnly: Incident[] = [mockActiveIncidents[2]];
const resolvedResult = detectDuplicateReport(duplicateCandidate, resolvedIncidentOnly, baseNow);
assert(!resolvedResult.isDuplicateCandidate, 'Does not match against already resolved incidents');

// Test 5F: Missing coordinates on candidate
const missingCoordsCandidate = {
  description: 'Deep standing water at Silk Board Junction flyover blocking buses',
  location: 'Silk Board Junction',
  coordinates: undefined,
  hazardType: 'waterlogging',
  severity: 'moderate',
};
const missingCoordsResult = detectDuplicateReport(missingCoordsCandidate, mockActiveIncidents, baseNow);
assert(!missingCoordsResult.isDuplicateCandidate, 'Gracefully returns false when candidate coordinates are missing');

// Test 5G: Boundary testing (at 240m vs 265m)
// 1 degree lat is ~111,139m. 240m is 240 / 111139 = 0.002159 deg. 265m is 265 / 111139 = 0.002384 deg.
const boundaryInsideCandidate = {
  description: 'Waterlogging at Silk Board Junction',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175 + (240 / 111139), lng: 77.6234 }, // ~240m away
  hazardType: 'waterlogging',
  severity: 'moderate',
};
const boundaryInsideResult = detectDuplicateReport(boundaryInsideCandidate, [mockActiveIncidents[0]], baseNow);
assert(
  boundaryInsideResult.isDuplicateCandidate,
  `Boundary inside (dist=${Math.round(boundaryInsideResult.match!.distanceM)}m < 250m) is flagged`
);

const boundaryOutsideCandidate = {
  description: 'Waterlogging at Silk Board Junction',
  location: 'Silk Board Junction',
  coordinates: { lat: 12.9175 + (265 / 111139), lng: 77.6234 }, // ~265m away
  hazardType: 'waterlogging',
  severity: 'moderate',
};
const boundaryOutsideResult = detectDuplicateReport(boundaryOutsideCandidate, [mockActiveIncidents[0]], baseNow);
assert(!boundaryOutsideResult.isDuplicateCandidate, 'Boundary outside (> 250m) is not flagged');

console.log('\n✨ ALL REPORTING VALIDATION & DUPLICATE DETECTION TESTS PASSED SUCCESSFULLY! ✨');
