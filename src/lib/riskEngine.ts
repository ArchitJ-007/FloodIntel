/**
 * FloodIntel — Deterministic Flood-Risk Scoring Engine
 * 
 * Implements Section 3.3 of FloodIntel PRD:
 * Pure mathematical scoring function:
 *   score = 100 * (0.35*S + 0.25*R + 0.15*T + 0.15*C + 0.10*H)
 * 
 * Rules:
 * - Deterministic, reproducible, zero-hallucination.
 * - Missing weather data renormalizes remaining weights.
 * - Insufficient evidence yields score: null and category: 'unknown'.
 * - Rainfall alone is never treated as confirmed street waterlogging.
 */

export type RiskCategory = 'low' | 'moderate' | 'high' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type SeverityInput = 'minor' | 'moderate' | 'severe' | 'high' | 'low' | 'cleared';

export interface ScoreComponentDetail {
  raw: number;          // [0, 1] normalized term value
  weight: number;       // active normalized weight
  contribution: number; // raw * weight * 100
  available: boolean;
}

export interface ScoreBreakdown {
  severity: ScoreComponentDetail;
  rain: ScoreComponentDetail;
  recency: ScoreComponentDetail & { ageHours: number };
  corroboration: ScoreComponentDetail;
  hotspotHistory: ScoreComponentDetail;
}

export interface RiskCalculationInput {
  severity?: SeverityInput;
  depthCm?: number | null;
  rainRiskIndex?: number | null; // [0, 100], null if weather telemetry unavailable
  reportedTimestamp?: number;
  nowTimestamp?: number;         // Defaults to Date.now()
  corroborationCount?: number;
  verificationStatus?: 'demo' | 'unverified' | 'corroborated' | 'verified' | 'resolved' | 'expired';
  provenance?: 'demo' | 'user' | 'partner';
  incidentsWithin200mLast30d?: number | null;
  isOutsideCityBounds?: boolean;
}

export interface RiskCalculationResult {
  score: number | null; // 0-100 or null when unknown/insufficient data
  category: RiskCategory;
  confidence: ConfidenceLevel;
  breakdown: ScoreBreakdown;
  warnings: string[];
}

export const RISK_ENGINE_CONFIG = {
  baseWeights: {
    severity: 0.35,      // S
    rainContext: 0.25,   // R
    recency: 0.15,       // T
    corroboration: 0.15, // C
    hotspotHistory: 0.10 // H
  },
  severityValues: {
    minor: 0.35,
    low: 0.35,
    moderate: 0.65,
    severe: 1.0,
    high: 1.0,
    cleared: 0.1,
  },
  depthScaling: {
    minClamped: 0.2,
    maxClamped: 1.0,
    divisorCm: 60, // clamp(depthCm / 60, 0.2, 1.0)
  },
  recencyHalfLifeHours: 2.0, // 0.5 ^ (ageHours / 2)
  corroborationValues: {
    singleReport: 0.4,
    twoReports: 0.7,
    threeOrMore: 1.0,
    verified: 1.0,
    demo: 0.7,
  },
  hotspotHistoryDivisor: 5, // min(1, incidents / 5)
  thresholds: {
    lowMax: 33,
    moderateMax: 66,
  },
};

/**
 * Normalizes input severity to [0, 1] raw factor S.
 */
export function calculateSeverityFactor(
  severity?: SeverityInput,
  depthCm?: number | null
): number {
  if (depthCm !== undefined && depthCm !== null && depthCm > 0) {
    const rawRatio = depthCm / RISK_ENGINE_CONFIG.depthScaling.divisorCm;
    return Math.min(
      RISK_ENGINE_CONFIG.depthScaling.maxClamped,
      Math.max(RISK_ENGINE_CONFIG.depthScaling.minClamped, rawRatio)
    );
  }

  if (!severity) return RISK_ENGINE_CONFIG.severityValues.minor;
  const key = severity.toLowerCase() as keyof typeof RISK_ENGINE_CONFIG.severityValues;
  return RISK_ENGINE_CONFIG.severityValues[key] ?? RISK_ENGINE_CONFIG.severityValues.minor;
}

/**
 * Normalizes corroboration factor C.
 */
export function calculateCorroborationFactor(
  status?: string,
  provenance?: string,
  count: number = 1
): number {
  if (status === 'verified') {
    return RISK_ENGINE_CONFIG.corroborationValues.verified;
  }
  if (status === 'demo' || provenance === 'demo') {
    return RISK_ENGINE_CONFIG.corroborationValues.demo;
  }
  if (count >= 3) {
    return RISK_ENGINE_CONFIG.corroborationValues.threeOrMore;
  }
  if (count === 2) {
    return RISK_ENGINE_CONFIG.corroborationValues.twoReports;
  }
  return RISK_ENGINE_CONFIG.corroborationValues.singleReport;
}

/**
 * Pure calculation function for flood risk.
 */
export function calculateRiskScore(input: RiskCalculationInput): RiskCalculationResult {
  const warnings: string[] = [];
  const now = input.nowTimestamp ?? Date.now();
  const reportedTime = input.reportedTimestamp ?? now;
  const ageHours = Math.max(0, (now - reportedTime) / (1000 * 60 * 60));

  const isDemo = input.provenance === 'demo' || input.verificationStatus === 'demo';
  if (isDemo) {
    warnings.push('[DEMO DATA] Synthetic incident record — for evaluation only.');
  }

  // Insufficient-data Rule Checks (PRD Section 3.3)
  // 1. Outside covered city bounds
  if (input.isOutsideCityBounds) {
    warnings.push('Location is outside monitored city bounds.');
    return makeUnknownResult(warnings, ageHours);
  }

  // 2. The only report is unverified and older than 3 hours with no rain telemetry
  const isUnverified = input.verificationStatus === 'unverified' || (!input.verificationStatus && !isDemo);
  const rainUnavailable = input.rainRiskIndex === null || input.rainRiskIndex === undefined;
  if (isUnverified && ageHours > 3 && rainUnavailable) {
    warnings.push('Incident report is unverified and older than 3 hours with no rainfall data.');
    return makeUnknownResult(warnings, ageHours);
  }

  // Severity Factor S
  const rawS = calculateSeverityFactor(input.severity, input.depthCm);

  // Rain Factor R
  const hasRain = !rainUnavailable;
  const rawR = hasRain
    ? Math.min(1.0, Math.max(0.0, (input.rainRiskIndex as number) / 100))
    : 0;
  if (!hasRain) {
    warnings.push('Live rainfall telemetry unavailable; remaining term weights renormalized.');
  }

  // Recency Factor T (2-hour half-life)
  const rawT = Math.pow(0.5, ageHours / RISK_ENGINE_CONFIG.recencyHalfLifeHours);
  if (ageHours >= 6) {
    warnings.push('Incident is over 6 hours old; conditions may have changed.');
  }

  // Corroboration Factor C
  const rawC = calculateCorroborationFactor(
    input.verificationStatus,
    input.provenance,
    input.corroborationCount ?? 1
  );

  // Hotspot History Factor H
  const hasHistory = input.incidentsWithin200mLast30d !== null && input.incidentsWithin200mLast30d !== undefined;
  const rawH = hasHistory
    ? Math.min(1.0, (input.incidentsWithin200mLast30d as number) / RISK_ENGINE_CONFIG.hotspotHistoryDivisor)
    : 0.0;
  if (!hasHistory) {
    warnings.push('30-day spatial hotspot history unavailable (weight contribution 0).');
  }

  // Weight Renormalization if Rain is missing
  let weightS = RISK_ENGINE_CONFIG.baseWeights.severity;
  let weightR = hasRain ? RISK_ENGINE_CONFIG.baseWeights.rainContext : 0;
  let weightT = RISK_ENGINE_CONFIG.baseWeights.recency;
  let weightC = RISK_ENGINE_CONFIG.baseWeights.corroboration;
  let weightH = RISK_ENGINE_CONFIG.baseWeights.hotspotHistory;

  if (!hasRain) {
    const totalWithoutR = weightS + weightT + weightC + weightH;
    weightS = weightS / totalWithoutR;
    weightT = weightT / totalWithoutR;
    weightC = weightC / totalWithoutR;
    weightH = weightH / totalWithoutR;
  }

  // Final deterministic score calculation
  const calculatedRawScore = 100 * (
    weightS * rawS +
    weightR * rawR +
    weightT * rawT +
    weightC * rawC +
    weightH * rawH
  );

  const finalScore = Math.min(100, Math.max(0, Math.round(calculatedRawScore)));

  // Risk Category Bucketing (PRD 3.0)
  let category: RiskCategory = 'low';
  if (finalScore > RISK_ENGINE_CONFIG.thresholds.moderateMax) {
    category = 'high';
  } else if (finalScore > RISK_ENGINE_CONFIG.thresholds.lowMax) {
    category = 'moderate';
  } else {
    category = 'low';
  }

  // Confidence assessment
  let confidence: ConfidenceLevel = 'medium';
  if ((input.corroborationCount ?? 1) >= 2 || input.verificationStatus === 'verified') {
    confidence = hasRain && ageHours < 2 ? 'high' : 'medium';
  } else if (ageHours > 3 || (!hasRain && !hasHistory)) {
    confidence = 'low';
  }

  const breakdown: ScoreBreakdown = {
    severity: {
      raw: Number(rawS.toFixed(3)),
      weight: Number(weightS.toFixed(3)),
      contribution: Number((rawS * weightS * 100).toFixed(1)),
      available: true,
    },
    rain: {
      raw: Number(rawR.toFixed(3)),
      weight: Number(weightR.toFixed(3)),
      contribution: Number((rawR * weightR * 100).toFixed(1)),
      available: hasRain,
    },
    recency: {
      raw: Number(rawT.toFixed(3)),
      weight: Number(weightT.toFixed(3)),
      contribution: Number((rawT * weightT * 100).toFixed(1)),
      ageHours: Number(ageHours.toFixed(2)),
      available: true,
    },
    corroboration: {
      raw: Number(rawC.toFixed(3)),
      weight: Number(weightC.toFixed(3)),
      contribution: Number((rawC * weightC * 100).toFixed(1)),
      available: true,
    },
    hotspotHistory: {
      raw: Number(rawH.toFixed(3)),
      weight: Number(weightH.toFixed(3)),
      contribution: Number((rawH * weightH * 100).toFixed(1)),
      available: hasHistory,
    },
  };

  return {
    score: finalScore,
    category,
    confidence,
    breakdown,
    warnings,
  };
}

function makeUnknownResult(warnings: string[], ageHours: number): RiskCalculationResult {
  return {
    score: null,
    category: 'unknown',
    confidence: 'low',
    breakdown: {
      severity: { raw: 0, weight: 0, contribution: 0, available: false },
      rain: { raw: 0, weight: 0, contribution: 0, available: false },
      recency: { raw: 0, weight: 0, contribution: 0, ageHours, available: false },
      corroboration: { raw: 0, weight: 0, contribution: 0, available: false },
      hotspotHistory: { raw: 0, weight: 0, contribution: 0, available: false },
    },
    warnings,
  };
}
