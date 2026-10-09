/**
 * FloodIntel — Weather & Precipitation Normalization & Risk Module
 * 
 * Implements Section 3.2 of FloodIntel PRD:
 * - Open-Meteo response normalization
 * - PRD Rainfall Intensity Classification
 * - 1h, 3h, 24h accumulation and 3h forecast peak calculations
 * - Deterministic rainRiskIndex (0-100) with weight renormalization for missing terms
 * - Never substitutes 0 for missing values (preserves null)
 * - Pure functions with zero side-effects
 */

export type RainfallIntensityCategory =
  | 'none'
  | 'light'
  | 'moderate'
  | 'heavy'
  | 'very_heavy'
  | 'extreme';

export interface WeatherCurrentSnapshot {
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPercent: number | null;
  precipitationMmPerHour: number | null;
  rainMmPerHour: number | null;
  weatherCode: number | null;
  windSpeedKmh: number | null;
  time: string; // ISO string from provider
}

export interface RainfallAccumulations {
  intensity1hMmPerHour: number | null;
  accum3hMm: number | null;
  accum24hMm: number | null;
  forecastNext3hPeakMmPerHour: number | null;
}

export interface WeatherSnapshot {
  coordinates: {
    lat: number;
    lng: number;
  };
  current: WeatherCurrentSnapshot;
  intensityCategory: RainfallIntensityCategory;
  intensityCategoryLabel: string;
  accumulations: RainfallAccumulations;
  rainRiskIndex: number | null; // [0, 100] or null if insufficient data
  rainRiskCategory: 'low' | 'moderate' | 'high' | 'unknown';
  providerTimestamp: string;
  fetchedAtTimestamp: number;
  isStale: boolean; // true if providerTimestamp > 30 minutes old
  warnings: string[];
}

export const WEATHER_CONFIG = {
  // PRD Section 3.2: Rainfall intensity classification (mm/h)
  intensityThresholds: {
    none: 0,
    lightMax: 2.4,      // 0.1 to 2.4 mm/h
    moderateMax: 7.5,   // 2.5 to 7.5 mm/h
    heavyMax: 15.0,     // 7.6 to 15.0 mm/h
    veryHeavyMax: 30.0, // 15.1 to 30.0 mm/h
    // > 30.0 mm/h is extreme
  },
  // PRD Section 3.2 FR-WX-07: Default normalization saturation values
  saturationValues: {
    intensity1hMmPerHour: 30.0,       // 30 mm/h
    accum3hMm: 60.0,                  // 60 mm / 3h
    accum24hMm: 120.0,                // 120 mm / 24h
    forecastNext3hPeakMmPerHour: 30.0,// 30 mm/h
  },
  // PRD Section 3.2 FR-WX-07: Base term weights
  baseWeights: {
    intensity1h: 0.45,
    accum3h: 0.25,
    accum24h: 0.15,
    forecastNext3hPeak: 0.15,
  },
  staleThresholdMinutes: 30,
};

/**
 * Classifies rainfall rate in mm/h according to PRD Section 3.2.
 */
export function classifyRainfallIntensity(
  mmPerHour: number | null
): { category: RainfallIntensityCategory; label: string } {
  if (mmPerHour === null || mmPerHour === undefined || isNaN(mmPerHour)) {
    return { category: 'none', label: 'Unavailable' };
  }
  if (mmPerHour <= WEATHER_CONFIG.intensityThresholds.none) {
    return { category: 'none', label: 'No Rain' };
  }
  if (mmPerHour <= WEATHER_CONFIG.intensityThresholds.lightMax) {
    return { category: 'light', label: 'Light Rain' };
  }
  if (mmPerHour <= WEATHER_CONFIG.intensityThresholds.moderateMax) {
    return { category: 'moderate', label: 'Moderate Rain' };
  }
  if (mmPerHour <= WEATHER_CONFIG.intensityThresholds.heavyMax) {
    return { category: 'heavy', label: 'Heavy Rain' };
  }
  if (mmPerHour <= WEATHER_CONFIG.intensityThresholds.veryHeavyMax) {
    return { category: 'very_heavy', label: 'Very Heavy Rain' };
  }
  return { category: 'extreme', label: 'Extreme Downpour' };
}

/**
 * Calculates rainRiskIndex (0-100) using the PRD formula:
 * rainRiskIndex = 100 * (0.45*norm(intensity_1h) + 0.25*norm(accum_3h) + 0.15*norm(accum_24h) + 0.15*norm(forecast_next_3h_peak))
 * 
 * If any term is null, its weight is omitted and remaining weights are renormalized.
 * If all terms are null, returns null.
 */
export function calculateRainRiskIndex(
  accumulations: RainfallAccumulations
): {
  rainRiskIndex: number | null;
  category: 'low' | 'moderate' | 'high' | 'unknown';
  warnings: string[];
} {
  const warnings: string[] = [];

  const {
    intensity1hMmPerHour,
    accum3hMm,
    accum24hMm,
    forecastNext3hPeakMmPerHour,
  } = accumulations;

  const terms: { raw: number | null; baseWeight: number; name: string }[] = [
    {
      raw: intensity1hMmPerHour !== null ? Math.min(1.0, Math.max(0.0, intensity1hMmPerHour / WEATHER_CONFIG.saturationValues.intensity1hMmPerHour)) : null,
      baseWeight: WEATHER_CONFIG.baseWeights.intensity1h,
      name: '1h intensity',
    },
    {
      raw: accum3hMm !== null ? Math.min(1.0, Math.max(0.0, accum3hMm / WEATHER_CONFIG.saturationValues.accum3hMm)) : null,
      baseWeight: WEATHER_CONFIG.baseWeights.accum3h,
      name: '3h accumulation',
    },
    {
      raw: accum24hMm !== null ? Math.min(1.0, Math.max(0.0, accum24hMm / WEATHER_CONFIG.saturationValues.accum24hMm)) : null,
      baseWeight: WEATHER_CONFIG.baseWeights.accum24h,
      name: '24h accumulation',
    },
    {
      raw: forecastNext3hPeakMmPerHour !== null ? Math.min(1.0, Math.max(0.0, forecastNext3hPeakMmPerHour / WEATHER_CONFIG.saturationValues.forecastNext3hPeakMmPerHour)) : null,
      baseWeight: WEATHER_CONFIG.baseWeights.forecastNext3hPeak,
      name: '3h forecast peak',
    },
  ];

  const availableTerms = terms.filter((t) => t.raw !== null);

  if (availableTerms.length === 0) {
    warnings.push('All precipitation metrics unavailable; rainRiskIndex cannot be computed.');
    return { rainRiskIndex: null, category: 'unknown', warnings };
  }

  const missingTerms = terms.filter((t) => t.raw === null);
  if (missingTerms.length > 0) {
    warnings.push(
      `Missing ${missingTerms.map((t) => t.name).join(', ')}; rain risk weights renormalized across available metrics.`
    );
  }

  const totalAvailableWeight = availableTerms.reduce((sum, t) => sum + t.baseWeight, 0);

  const weightedSum = availableTerms.reduce((sum, t) => {
    const normalizedWeight = t.baseWeight / totalAvailableWeight;
    return sum + (t.raw as number) * normalizedWeight;
  }, 0);

  const index = Math.min(100, Math.max(0, Math.round(weightedSum * 100)));

  let category: 'low' | 'moderate' | 'high' = 'low';
  if (index > 66) {
    category = 'high';
  } else if (index > 33) {
    category = 'moderate';
  }

  return {
    rainRiskIndex: index,
    category,
    warnings,
  };
}

/**
 * Normalizes Open-Meteo forecast API response into structured WeatherSnapshot.
 */
export function normalizeOpenMeteoResponse(
  raw: any,
  coords: { lat: number; lng: number },
  fetchedAtTimestamp: number = Date.now()
): WeatherSnapshot {
  const current = raw?.current;
  const hourly = raw?.hourly;
  const warnings: string[] = [];

  const temperatureC = typeof current?.temperature_2m === 'number' ? current.temperature_2m : null;
  const apparentTemperatureC = typeof current?.apparent_temperature === 'number' ? current.apparent_temperature : null;
  const relativeHumidityPercent = typeof current?.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null;
  const precipitationMmPerHour = typeof current?.precipitation === 'number' ? current.precipitation : null;
  const rainMmPerHour = typeof current?.rain === 'number' ? current.rain : null;
  const weatherCode = typeof current?.weather_code === 'number' ? current.weather_code : null;
  const windSpeedKmh = typeof current?.wind_speed_10m === 'number' ? current.wind_speed_10m : null;
  const providerTimestamp = typeof current?.time === 'string' ? current.time : new Date().toISOString();

  // Freshness check (FR-WX-08: Stale if older than 30 mins)
  const providerTimeMs = new Date(providerTimestamp).getTime();
  const ageMinutes = (fetchedAtTimestamp - providerTimeMs) / (1000 * 60);
  const isStale = !isNaN(ageMinutes) && ageMinutes > WEATHER_CONFIG.staleThresholdMinutes;
  if (isStale) {
    warnings.push(`Weather telemetry is ${Math.round(ageMinutes)} min old (exceeds 30 min freshness threshold).`);
  }

  // Parse Hourly precipitation series
  // hourly.time: string[], hourly.precipitation: number[]
  let accum3h: number | null = null;
  let accum24h: number | null = null;
  let forecastNext3hPeak: number | null = null;

  if (Array.isArray(hourly?.time) && Array.isArray(hourly?.precipitation)) {
    const times: string[] = hourly.time;
    const precip: number[] = hourly.precipitation;

    // Find index of current hour
    const currentHourIso = providerTimestamp.slice(0, 13); // "YYYY-MM-DDTHH"
    let currentIndex = times.findIndex((t) => t.startsWith(currentHourIso));
    if (currentIndex === -1) currentIndex = Math.floor(times.length / 2); // fallback to midpoint if timezone difference

    // 1. Past 3h accumulation (hours current - 2, current - 1, current)
    const past3Start = Math.max(0, currentIndex - 2);
    const past3Values = precip.slice(past3Start, currentIndex + 1);
    if (past3Values.length > 0 && past3Values.every((v) => typeof v === 'number')) {
      accum3h = Number(past3Values.reduce((a, b) => a + b, 0).toFixed(2));
    }

    // 2. Past 24h accumulation
    const past24Start = Math.max(0, currentIndex - 23);
    const past24Values = precip.slice(past24Start, currentIndex + 1);
    if (past24Values.length > 0 && past24Values.every((v) => typeof v === 'number')) {
      accum24h = Number(past24Values.reduce((a, b) => a + b, 0).toFixed(2));
    }

    // 3. Next 3h forecast peak (hours current + 1, current + 2, current + 3)
    const next3Start = currentIndex + 1;
    const next3End = Math.min(times.length, currentIndex + 4);
    const next3Values = precip.slice(next3Start, next3End);
    if (next3Values.length > 0 && next3Values.every((v) => typeof v === 'number')) {
      forecastNext3hPeak = Number(Math.max(...next3Values).toFixed(2));
    }
  }

  const currentRate = precipitationMmPerHour !== null ? precipitationMmPerHour : (rainMmPerHour ?? null);
  const { category: intensityCategory, label: intensityCategoryLabel } = classifyRainfallIntensity(currentRate);

  const accumulations: RainfallAccumulations = {
    intensity1hMmPerHour: currentRate,
    accum3hMm: accum3h,
    accum24hMm: accum24h,
    forecastNext3hPeakMmPerHour: forecastNext3hPeak,
  };

  const riskResult = calculateRainRiskIndex(accumulations);

  return {
    coordinates: coords,
    current: {
      temperatureC,
      apparentTemperatureC,
      relativeHumidityPercent,
      precipitationMmPerHour,
      rainMmPerHour,
      weatherCode,
      windSpeedKmh,
      time: providerTimestamp,
    },
    intensityCategory,
    intensityCategoryLabel,
    accumulations,
    rainRiskIndex: riskResult.rainRiskIndex,
    rainRiskCategory: riskResult.category,
    providerTimestamp,
    fetchedAtTimestamp,
    isStale,
    warnings: [...warnings, ...riskResult.warnings],
  };
}
