import { type Incident } from './demoIncidents.ts';

// ==============================================================================
// FloodIntel — Hazard Reporting Validation & Duplicate Detection Engine
// PRD Reference: FR-REP-01 through FR-REP-06, Section 3.1 & 3.3
// Design Principle: Strict field validation, safe sanitization, and deterministic
// geospatial + temporal duplicate detection.
// ==============================================================================

export const REPORT_VALIDATION_CONFIG = {
  minDescriptionLength: 15,
  maxDescriptionLength: 500,
  minLocationLength: 3,
  maxLocationLength: 120,
  validHazardTypes: ['waterlogging', 'flooded_road', 'blocked_road', 'drainage_failure'] as const,
  validSeverities: ['low', 'moderate', 'high'] as const,
  validWaterDepths: ['curb', 'knee', 'deep'] as const,
  // Republic of India Sovereign Geographic Bounds (Nationwide Support)
  indiaBounds: {
    minLat: 6.0,
    maxLat: 37.5,
    minLng: 68.0,
    maxLng: 97.5,
  },
  // Metropolitan reference corridor
  cityBounds: {
    minLat: 12.80,
    maxLat: 13.15,
    minLng: 77.45,
    maxLng: 77.80,
  },
  // Configurable duplicate matching thresholds (PRD FR-REP-05)
  duplicateThresholds: {
    maxDistanceM: 250, // Proximity threshold: reports within 250m are checked
    maxAgeMinutes: 180, // Recency threshold: active reports within 3 hours
    strictMatchDistanceM: 60, // Immediate proximity: highly probable duplicate
  },
};

export type ValidHazardType = (typeof REPORT_VALIDATION_CONFIG.validHazardTypes)[number];
export type ValidSeverity = (typeof REPORT_VALIDATION_CONFIG.validSeverities)[number];
export type ValidWaterDepth = (typeof REPORT_VALIDATION_CONFIG.validWaterDepths)[number];

export interface HazardReportInput {
  location: string;
  hazardType: string;
  severity: string;
  waterDepth: string;
  description: string;
  reporterMode?: string;
  contact?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SanitizedReportData {
  location: string;
  hazardType: ValidHazardType;
  severity: ValidSeverity;
  waterDepth: ValidWaterDepth;
  description: string;
  reporterMode: 'anonymous' | 'notify';
  contact?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
  sanitized?: SanitizedReportData;
}

export interface DuplicateMatchInfo {
  id: string;
  title: string;
  location: string;
  distanceM: number;
  minutesAgo: number;
  severity: string;
  status: string;
  reason: string;
}

export interface DuplicateCheckResult {
  isDuplicateCandidate: boolean;
  match?: DuplicateMatchInfo;
}

/**
 * Calculates great-circle haversine distance in meters between two lat/lng coordinates.
 */
export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Sanitizes user input text by removing executable tags and trimming whitespace.
 */
export function sanitizeInputText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Strip control chars
    .trim();
}

/**
 * Validates a hazard report submission against required schema, lengths, and bounds.
 */
export function validateHazardReport(input: HazardReportInput): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // 1. Description Validation
  const rawDesc = input.description || '';
  const trimmedDesc = sanitizeInputText(rawDesc);

  if (!trimmedDesc || trimmedDesc.length === 0) {
    errors.description = 'Incident description is required. Please explain observed road conditions.';
  } else if (trimmedDesc.length < REPORT_VALIDATION_CONFIG.minDescriptionLength) {
    errors.description = `Description is too brief (${trimmedDesc.length} chars). Minimum ${REPORT_VALIDATION_CONFIG.minDescriptionLength} characters required to describe the hazard accurately.`;
  } else if (trimmedDesc.length > REPORT_VALIDATION_CONFIG.maxDescriptionLength) {
    errors.description = `Description exceeds maximum limit of ${REPORT_VALIDATION_CONFIG.maxDescriptionLength} characters (${trimmedDesc.length} chars).`;
  }

  // 2. Location Validation
  const rawLoc = input.location || '';
  const trimmedLoc = sanitizeInputText(rawLoc);

  if (!trimmedLoc || trimmedLoc.length === 0) {
    errors.location = 'Street address or landmark location is required.';
  } else if (trimmedLoc.length < REPORT_VALIDATION_CONFIG.minLocationLength) {
    errors.location = `Location name must be at least ${REPORT_VALIDATION_CONFIG.minLocationLength} characters.`;
  } else if (trimmedLoc.length > REPORT_VALIDATION_CONFIG.maxLocationLength) {
    errors.location = `Location name cannot exceed ${REPORT_VALIDATION_CONFIG.maxLocationLength} characters.`;
  }

  // 3. Hazard Type Enumeration Validation
  const hazardType = input.hazardType as ValidHazardType;
  if (!REPORT_VALIDATION_CONFIG.validHazardTypes.includes(hazardType)) {
    errors.hazardType = `Invalid hazard type '${input.hazardType}'. Must be one of: ${REPORT_VALIDATION_CONFIG.validHazardTypes.join(', ')}.`;
  }

  // 4. Severity Enumeration Validation
  const severity = input.severity as ValidSeverity;
  if (!REPORT_VALIDATION_CONFIG.validSeverities.includes(severity)) {
    errors.severity = `Invalid severity '${input.severity}'. Must be one of: ${REPORT_VALIDATION_CONFIG.validSeverities.join(', ')}.`;
  }

  // 5. Water Depth Enumeration Validation
  const waterDepth = input.waterDepth as ValidWaterDepth;
  if (!REPORT_VALIDATION_CONFIG.validWaterDepths.includes(waterDepth)) {
    errors.waterDepth = `Invalid water depth '${input.waterDepth}'. Must be one of: ${REPORT_VALIDATION_CONFIG.validWaterDepths.join(', ')}.`;
  }

  // 6. Coordinates Validation
  const lat = input.coordinates?.lat;
  const lng = input.coordinates?.lng;

  let resolvedCoords = { lat: 12.9352, lng: 77.6245 }; // Default to Sector 4 Basin center if omitted

  if (lat !== undefined && lng !== undefined) {
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      errors.coordinates = `Latitude must be a valid number between -90 and 90 (received: ${lat}).`;
    }
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      errors.coordinates = `Longitude must be a valid number between -180 and 180 (received: ${lng}).`;
    }

    if (!errors.coordinates) {
      resolvedCoords = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };

      // Geographic boundary check (Republic of India)
      const b = REPORT_VALIDATION_CONFIG.indiaBounds;
      if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) {
        warnings.push(
          `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) lie outside standard national monitoring bounds for India. Report will be logged with international coordination.`
        );
      }
    }
  }

  // 7. Contact Info Validation when notify mode is selected
  let contact: string | undefined = undefined;
  if (input.reporterMode === 'notify' && input.contact) {
    const trimmedContact = sanitizeInputText(input.contact);
    if (trimmedContact.length > 0) {
      contact = trimmedContact;
    }
  }

  const isValid = Object.keys(errors).length === 0;

  let sanitized: SanitizedReportData | undefined = undefined;
  if (isValid) {
    sanitized = {
      location: trimmedLoc,
      hazardType,
      severity,
      waterDepth,
      description: trimmedDesc,
      reporterMode: input.reporterMode === 'notify' ? 'notify' : 'anonymous',
      contact,
      coordinates: resolvedCoords,
    };
  }

  return {
    isValid,
    errors,
    warnings,
    sanitized,
  };
}

/**
 * Detects whether a candidate report matches an existing active incident based on
 * geospatial proximity (<250m), recency (<180 min), and category/text overlap (FR-REP-05).
 */
export function detectDuplicateReport(
  candidate: {
    coordinates?: { lat: number; lng: number } | null;
    hazardType?: string;
    description?: string;
    location?: string;
  },
  existingIncidents: Incident[],
  nowTimestamp: number = Date.now()
): DuplicateCheckResult {
  if (
    !candidate?.coordinates ||
    typeof candidate.coordinates.lat !== 'number' ||
    typeof candidate.coordinates.lng !== 'number'
  ) {
    return { isDuplicateCandidate: false };
  }

  if (!existingIncidents || existingIncidents.length === 0) {
    return { isDuplicateCandidate: false };
  }

  const { maxDistanceM, maxAgeMinutes, strictMatchDistanceM } =
    REPORT_VALIDATION_CONFIG.duplicateThresholds;

  const candidateKeywords = (candidate.description || '')
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter((w) => w.length > 4);

  for (const existing of existingIncidents) {
    // 1. Skip resolved incidents (not an active duplicate)
    if (existing.status?.toLowerCase() === 'resolved' || existing.verificationStatus === 'resolved') continue;

    // 2. Validate coordinates presence
    if (!existing.coordinates?.lat || !existing.coordinates?.lng) continue;

    // 3. Compute distance
    const distM = haversineDistanceM(
      candidate.coordinates.lat,
      candidate.coordinates.lng,
      existing.coordinates.lat,
      existing.coordinates.lng
    );

    if (distM > maxDistanceM) continue;

    // 4. Compute age
    const incidentTime =
      typeof existing.reportedTimestamp === 'number'
        ? existing.reportedTimestamp
        : typeof existing.createdAt === 'number'
        ? existing.createdAt
        : nowTimestamp;
    const ageMin = Math.round((nowTimestamp - incidentTime) / (60 * 1000));

    if (ageMin > maxAgeMinutes) continue;

    // 5. Evaluate Similarity
    // Case A: Strict proximity (<60m) - almost certainly same physical junction
    if (distM <= strictMatchDistanceM) {
      return {
        isDuplicateCandidate: true,
        match: {
          id: existing.id,
          title: existing.title,
          location: existing.location,
          distanceM: distM,
          minutesAgo: Math.max(1, ageMin),
          severity: existing.severity,
          status: existing.status,
          reason: `Immediate physical proximity (${distM}m away, reported ${ageMin}m ago).`,
        },
      };
    }

    // Case B: Moderate proximity (60m - 250m) with matching category or keyword overlap
    const categoryMatch =
      candidate.hazardType &&
      existing.hazardType &&
      (candidate.hazardType === existing.hazardType ||
        (candidate.hazardType === 'flooded_road' && existing.hazardType === 'waterlogging') ||
        (candidate.hazardType === 'waterlogging' && existing.hazardType === 'flooded_road'));

    const existingText = `${existing.title} ${existing.notes || ''} ${existing.location}`.toLowerCase();
    const hasKeywordOverlap = candidateKeywords.some((kw) => existingText.includes(kw));

    if (categoryMatch || hasKeywordOverlap) {
      return {
        isDuplicateCandidate: true,
        match: {
          id: existing.id,
          title: existing.title,
          location: existing.location,
          distanceM: distM,
          minutesAgo: Math.max(1, ageMin),
          severity: existing.severity,
          status: existing.status,
          reason: `Nearby active incident within ${distM}m with matching hazard profile reported ${ageMin}m ago.`,
        },
      };
    }
  }

  return { isDuplicateCandidate: false };
}
