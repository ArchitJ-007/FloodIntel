/**
 * FloodIntel — Risk Engine Test Suite
 * 
 * Verifies all mathematical properties and PRD requirements from Section 3.3.
 */

import {
  calculateRiskScore,
  calculateSeverityFactor,
  calculateCorroborationFactor,
  RISK_ENGINE_CONFIG,
} from './riskEngine.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- Running FloodIntel Deterministic Risk Engine Test Suite ---\n');

const now = Date.now();

// 1. Severe and recent incidents score higher than otherwise comparable minor, old incidents
const severeRecent = calculateRiskScore({
  severity: 'severe',
  depthCm: 75,
  reportedTimestamp: now - 15 * 60 * 1000, // 15 min ago
  nowTimestamp: now,
  rainRiskIndex: 50,
  corroborationCount: 2,
});

const minorOld = calculateRiskScore({
  severity: 'minor',
  depthCm: 10,
  reportedTimestamp: now - 8 * 60 * 60 * 1000, // 8 hours ago
  nowTimestamp: now,
  rainRiskIndex: 50,
  corroborationCount: 2,
});

assert(
  severeRecent.score !== null && minorOld.score !== null && severeRecent.score > minorOld.score,
  `Severe recent incident (${severeRecent.score}) scores strictly higher than minor old incident (${minorOld.score})`
);

// 2. Increasing recency age does not increase risk (monotonic decrease with age)
const age0 = calculateRiskScore({ severity: 'moderate', depthCm: 30, verificationStatus: 'verified', reportedTimestamp: now, nowTimestamp: now });
const age2h = calculateRiskScore({ severity: 'moderate', depthCm: 30, verificationStatus: 'verified', reportedTimestamp: now - 2 * 3600 * 1000, nowTimestamp: now });
const age6h = calculateRiskScore({ severity: 'moderate', depthCm: 30, verificationStatus: 'verified', reportedTimestamp: now - 6 * 3600 * 1000, nowTimestamp: now });

assert(
  (age0.score ?? 0) >= (age2h.score ?? 0) && (age2h.score ?? 0) >= (age6h.score ?? 0),
  `Risk score decreases or stays constant with age: age0=${age0.score}, age2h=${age2h.score}, age6h=${age6h.score}`
);

// 3. Increasing corroboration does not reduce corroboration contribution
const corr1 = calculateRiskScore({ corroborationCount: 1, reportedTimestamp: now, nowTimestamp: now });
const corr2 = calculateRiskScore({ corroborationCount: 2, reportedTimestamp: now, nowTimestamp: now });
const corr5 = calculateRiskScore({ corroborationCount: 5, reportedTimestamp: now, nowTimestamp: now });

assert(
  corr1.breakdown.corroboration.contribution <= corr2.breakdown.corroboration.contribution &&
  corr2.breakdown.corroboration.contribution <= corr5.breakdown.corroboration.contribution,
  `Corroboration contribution increases with reports: 1-rep=${corr1.breakdown.corroboration.contribution}, 2-rep=${corr2.breakdown.corroboration.contribution}, 5-rep=${corr5.breakdown.corroboration.contribution}`
);

// 4. Missing weather data results in correctly renormalized weights
const withRain = calculateRiskScore({
  severity: 'moderate',
  rainRiskIndex: 40,
  reportedTimestamp: now,
  nowTimestamp: now,
});
const withoutRain = calculateRiskScore({
  severity: 'moderate',
  rainRiskIndex: null,
  reportedTimestamp: now,
  nowTimestamp: now,
});

const activeWeightSum =
  withoutRain.breakdown.severity.weight +
  withoutRain.breakdown.recency.weight +
  withoutRain.breakdown.corroboration.weight +
  withoutRain.breakdown.hotspotHistory.weight;

assert(
  Math.abs(activeWeightSum - 1.0) < 0.01,
  `Renormalized weights sum to 1.0 when rain is missing (sum=${activeWeightSum})`
);
assert(
  withoutRain.breakdown.rain.available === false && withoutRain.breakdown.rain.contribution === 0,
  `Rain term is marked unavailable and contributes 0 pts when omitted`
);
assert(
  withoutRain.warnings.some((w) => w.includes('renormalized')),
  `Warning emitted explaining weight renormalization`
);

// 5. Insufficient data returns Unknown rather than Low
// PRD rule: unverified report older than 3 hours with no rain telemetry returns Unknown with score null
const staleUnverified = calculateRiskScore({
  severity: 'moderate',
  verificationStatus: 'unverified',
  reportedTimestamp: now - 4 * 3600 * 1000, // 4 hours ago (>3h)
  nowTimestamp: now,
  rainRiskIndex: null, // no rain
});

assert(
  staleUnverified.score === null && staleUnverified.category === 'unknown',
  `Unverified report > 3h with no rain returns score=null and category='unknown'`
);

const outsideCity = calculateRiskScore({
  isOutsideCityBounds: true,
  reportedTimestamp: now,
  nowTimestamp: now,
});

assert(
  outsideCity.score === null && outsideCity.category === 'unknown',
  `Incident outside city bounds returns score=null and category='unknown'`
);

// 6. Scores stay within 0-100 across extreme boundary conditions
const maxExtreme = calculateRiskScore({
  severity: 'severe',
  depthCm: 250, // very deep
  rainRiskIndex: 100,
  reportedTimestamp: now,
  nowTimestamp: now,
  corroborationCount: 20,
  verificationStatus: 'verified',
  incidentsWithin200mLast30d: 50,
});

const minExtreme = calculateRiskScore({
  severity: 'cleared',
  depthCm: 1,
  rainRiskIndex: 0,
  reportedTimestamp: now - 48 * 3600 * 1000, // 2 days ago
  nowTimestamp: now,
  corroborationCount: 1,
  incidentsWithin200mLast30d: 0,
});

assert(
  maxExtreme.score !== null && maxExtreme.score <= 100 && maxExtreme.score >= 0,
  `Maximum extreme input bounded in [0, 100] (score=${maxExtreme.score}, category=${maxExtreme.category})`
);
assert(
  minExtreme.score !== null && minExtreme.score <= 100 && minExtreme.score >= 0,
  `Minimum extreme input bounded in [0, 100] (score=${minExtreme.score}, category=${minExtreme.category})`
);

// 7. Demo incidents retain Demo data labels and warning
const demoIncident = calculateRiskScore({
  severity: 'severe',
  depthCm: 76,
  provenance: 'demo',
  verificationStatus: 'demo',
  reportedTimestamp: now - 18 * 60 * 1000,
  nowTimestamp: now,
});

assert(
  demoIncident.warnings.some((w) => w.includes('[DEMO DATA]')),
  `Demo incident carries explicit [DEMO DATA] warning`
);
assert(
  demoIncident.breakdown.corroboration.raw === RISK_ENGINE_CONFIG.corroborationValues.demo,
  `Demo incident uses PRD-specified fixed corroboration weight 0.7`
);

console.log('\n✨ ALL RISK ENGINE TESTS PASSED SUCCESSFULLY! ✨\n');
