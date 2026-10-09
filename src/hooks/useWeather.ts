'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherSnapshot } from '@/lib/weather';

interface UseWeatherReturn {
  weather: WeatherSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastFetchedAt: Date | null;
}

export function useWeather(lat: number, lng: number): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWeather = useCallback(async () => {
    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Weather error (${res.status})`);
      }

      const data: WeatherSnapshot = await res.json();
      setWeather(data);
      setLastFetchedAt(new Date());
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Ignore intentional abort
      }
      setError(err.message || 'Failed to load weather telemetry');
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchWeather();

    // Auto-refresh weather every 10 minutes (600,000 ms)
    const interval = setInterval(() => {
      fetchWeather();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchWeather]);

  return {
    weather,
    isLoading,
    error,
    refetch: fetchWeather,
    lastFetchedAt,
  };
}
