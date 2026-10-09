/**
 * FloodIntel — Weather Module & Rain Risk Test Suite
 * 
 * Verifies rainfall classification, accumulation parsing, weight renormalization,
 * and deterministic rainRiskIndex calculation against PRD Section 3.2.
 */

import {
  classifyRainfallIntensity,
  calculateRainRiskIndex,
  normalizeOpenMeteoResponse,
  WEATHER_CONFIG,
} from './weather.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- Running FloodIntel Weather & Rainfall Test Suite ---\n');

// 1. PRD Section 3.2: Rainfall intensity classification
assert(classifyRainfallIntensity(0).category === 'none', '0 mm/h is classified as none (No Rain)');
assert(classifyRainfallIntensity(1.2).category === 'light', '1.2 mm/h is classified as light');
assert(classifyRainfallIntensity(2.4).category === 'light', '2.4 mm/h boundary is classified as light');
assert(classifyRainfallIntensity(2.5).category === 'moderate', '2.5 mm/h boundary is classified as moderate');
assert(classifyRainfallIntensity(6.0).category === 'moderate', '6.0 mm/h is classified as moderate');
assert(classifyRainfallIntensity(7.6).category === 'heavy', '7.6 mm/h boundary is classified as heavy');
assert(classifyRainfallIntensity(15.0).category === 'heavy', '15.0 mm/h boundary is classified as heavy');
assert(classifyRainfallIntensity(15.1).category === 'very_heavy', '15.1 mm/h is classified as very_heavy');
assert(classifyRainfallIntensity(30.0).category === 'very_heavy', '30.0 mm/h is classified as very_heavy');
assert(classifyRainfallIntensity(35.0).category === 'extreme', '35.0 mm/h (>30) is classified as extreme');
assert(classifyRainfallIntensity(null).category === 'none', 'null precipitation is handled safely without throwing');

// 2. Deterministic rainRiskIndex — Saturation extremes
const maxAccumulations = {
  intensity1hMmPerHour: 30.0,
  accum3hMm: 60.0,
  accum24hMm: 120.0,
  forecastNext3hPeakMmPerHour: 30.0,
};
const maxRisk = calculateRainRiskIndex(maxAccumulations);
assert(
  maxRisk.rainRiskIndex === 100 && maxRisk.category === 'high',
  `Fully saturated precipitation inputs yield maximum rainRiskIndex of 100 (got: ${maxRisk.rainRiskIndex})`
);

const zeroAccumulations = {
  intensity1hMmPerHour: 0.0,
  accum3hMm: 0.0,
  accum24hMm: 0.0,
  forecastNext3hPeakMmPerHour: 0.0,
};
const zeroRisk = calculateRainRiskIndex(zeroAccumulations);
assert(
  zeroRisk.rainRiskIndex === 0 && zeroRisk.category === 'low',
  `Zero precipitation inputs yield rainRiskIndex of 0 (got: ${zeroRisk.rainRiskIndex})`
);

// 3. Weight renormalization on genuinely missing metrics (Never substitute 0 for missing)
const partialAccumulations = {
  intensity1hMmPerHour: 15.0, // 50% saturation (0.5)
  accum3hMm: null,            // missing
  accum24hMm: null,           // missing
  forecastNext3hPeakMmPerHour: 15.0, // 50% saturation (0.5)
};
const partialRisk = calculateRainRiskIndex(partialAccumulations);
assert(
  partialRisk.rainRiskIndex === 50,
  `Renormalized missing terms yield exact proportional weighted score of 50 (got: ${partialRisk.rainRiskIndex})`
);
assert(
  partialRisk.warnings.some((w) => w.includes('renormalized')),
  'Warning emitted explaining that missing precipitation metrics caused weight renormalization'
);

// 4. All metrics missing yields null and category 'unknown'
const allNullAccumulations = {
  intensity1hMmPerHour: null,
  accum3hMm: null,
  accum24hMm: null,
  forecastNext3hPeakMmPerHour: null,
};
const allNullRisk = calculateRainRiskIndex(allNullAccumulations);
assert(
  allNullRisk.rainRiskIndex === null && allNullRisk.category === 'unknown',
  'All null accumulations result in null rainRiskIndex and unknown category'
);

// 5. Normalization of Mock Open-Meteo response
const mockProviderData = {
  current: {
    temperature_2m: 24.5,
    apparent_temperature: 26.1,
    relative_humidity_2m: 88,
    precipitation: 4.8,
    rain: 4.8,
    weather_code: 61,
    wind_speed_10m: 14.2,
    time: '2026-10-09T10:00:00Z',
  },
  hourly: {
    time: [
      '2026-10-09T08:00:00Z',
      '2026-10-09T09:00:00Z',
      '2026-10-09T10:00:00Z',
      '2026-10-09T11:00:00Z',
      '2026-10-09T12:00:00Z',
    ],
    precipitation: [2.0, 3.5, 4.8, 6.0, 1.2],
  },
};

const normalized = normalizeOpenMeteoResponse(
  mockProviderData,
  { lat: 12.9352, lng: 77.6245 },
  new Date('2026-10-09T10:15:00Z').getTime() // 15 mins after provider time (fresh)
);

assert(normalized.current.temperatureC === 24.5, 'Temperature parsed accurately');
assert(normalized.intensityCategory === 'moderate', '4.8 mm/h mapped to moderate');
assert(normalized.isStale === false, '15-min-old data is marked fresh (isStale === false)');
assert(normalized.rainRiskIndex !== null && normalized.rainRiskIndex > 0, 'rainRiskIndex computed from series');

// 6. Stale data detection (>30 minutes)
const staleNormalized = normalizeOpenMeteoResponse(
  mockProviderData,
  { lat: 12.9352, lng: 77.6245 },
  new Date('2026-10-09T11:00:00Z').getTime() // 60 mins after provider time (>30 min threshold)
);

assert(staleNormalized.isStale === true, 'Data older than 30 minutes is flagged as stale');
assert(
  staleNormalized.warnings.some((w) => w.includes('freshness threshold')),
  'Warning attached when telemetry exceeds freshness threshold'
);

console.log('\n✨ ALL WEATHER TESTS PASSED SUCCESSFULLY! ✨\n');
