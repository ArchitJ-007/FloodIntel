'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { RouteOption, RouteComparisonResult, RouteCoordinates } from '@/lib/routing';
import { useIncidents } from '@/context/IncidentContext';
import { LocationSearchBox } from '@/components/LocationSearchBox';

// Dynamically import Leaflet Journey Map to prevent SSR execution
const InteractiveJourneyMap = dynamic(() => import('@/components/InteractiveJourneyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#070e17] text-on-surface-variant font-mono text-xs gap-3">
      <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
      <span>Loading OpenStreetMap trajectory corridors...</span>
    </div>
  ),
});

// Major Indian Metros Corridor Presets
const CORRIDOR_PRESETS = [
  {
    name: 'Silk Board → EcoSpace (Bengaluru)',
    origin: { name: 'Silk Board Junction, Bengaluru', coords: { lat: 12.9175, lng: 77.6234 } },
    dest: { name: 'Bellandur EcoSpace, Bengaluru', coords: { lat: 12.9260, lng: 77.6762 } },
  },
  {
    name: 'Dadar → BKC (Mumbai)',
    origin: { name: 'Hindmata Flyover, Dadar, Mumbai', coords: { lat: 19.0068, lng: 72.8427 } },
    dest: { name: 'Bandra Kurla Complex (BKC), Mumbai', coords: { lat: 19.0657, lng: 72.8687 } },
  },
  {
    name: 'Connaught Place → ITO (Delhi)',
    origin: { name: 'Minto Bridge Underpass, New Delhi', coords: { lat: 28.6369, lng: 77.2273 } },
    dest: { name: 'ITO Ring Road, New Delhi', coords: { lat: 28.6297, lng: 77.2435 } },
  },
  {
    name: 'Velachery → T. Nagar (Chennai)',
    origin: { name: 'Velachery Bypass, Chennai', coords: { lat: 12.9791, lng: 80.2185 } },
    dest: { name: 'T. Nagar Usman Rd, Chennai', coords: { lat: 13.0418, lng: 80.2341 } },
  },
];

function PlanJourneyContent() {
  const { incidents } = useIncidents();
  const searchParams = useSearchParams();

  const paramFromLat = searchParams.get('fromLat') ? parseFloat(searchParams.get('fromLat')!) : null;
  const paramFromLng = searchParams.get('fromLng') ? parseFloat(searchParams.get('fromLng')!) : null;
  const paramFromName = searchParams.get('fromName') || null;

  const paramToLat = searchParams.get('toLat') ? parseFloat(searchParams.get('toLat')!) : null;
  const paramToLng = searchParams.get('toLng') ? parseFloat(searchParams.get('toLng')!) : null;
  const paramToName = searchParams.get('toName') || null;

  // Route Origin and Destination state
  const [originName, setOriginName] = useState(
    paramFromName || 'Koramangala 4th Cross & 80ft Rd'
  );
  const [originCoords, setOriginCoords] = useState<RouteCoordinates>({
    lat: paramFromLat !== null && !isNaN(paramFromLat) ? paramFromLat : 12.9348,
    lng: paramFromLng !== null && !isNaN(paramFromLng) ? paramFromLng : 77.6205,
  });

  const [destName, setDestName] = useState(
    paramToName || 'Tech Park Campus (North Ring Rd J4)'
  );
  const [destCoords, setDestCoords] = useState<RouteCoordinates>({
    lat: paramToLat !== null && !isNaN(paramToLat) ? paramToLat : 12.9550,
    lng: paramToLng !== null && !isNaN(paramToLng) ? paramToLng : 77.6400,
  });

  // Sync searchParams if URL changes
  useEffect(() => {
    if (paramFromLat !== null && paramFromLng !== null && !isNaN(paramFromLat) && !isNaN(paramFromLng)) {
      setOriginCoords({ lat: paramFromLat, lng: paramFromLng });
      if (paramFromName) setOriginName(paramFromName);
    }
    if (paramToLat !== null && paramToLng !== null && !isNaN(paramToLat) && !isNaN(paramToLng)) {
      setDestCoords({ lat: paramToLat, lng: paramToLng });
      if (paramToName) setDestName(paramToName);
    }
  }, [paramFromLat, paramFromLng, paramFromName, paramToLat, paramToLng, paramToName]);

  const [travelMode, setTravelMode] = useState<'drive' | 'bike' | 'transit'>('drive');

  // Calculated routes state
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('A');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [computedTimestamp, setComputedTimestamp] = useState<string | null>(null);

  // AI Route Summary state
  const [aiRouteSummary, setAiRouteSummary] = useState<{
    headline: string;
    summary: string;
    tradeoffs: Array<{ routeId: string; summary: string }>;
    caveats: string[];
    recommendedRouteId: string;
    generatedBy: 'gemini' | 'template';
  } | null>(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);

  const originProp = useMemo(
    () => ({ ...originCoords, name: originName }),
    [originCoords.lat, originCoords.lng, originName]
  );

  const destProp = useMemo(
    () => ({ ...destCoords, name: destName }),
    [destCoords.lat, destCoords.lng, destName]
  );

  // Fetch routes from API
  const handleCalculateRoutes = useCallback(async () => {
    setIsCalculating(true);
    setCalculationError(null);

    try {
      const response = await fetch('/api/routes/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: originCoords,
          to: destCoords,
          profile: travelMode === 'bike' ? 'bike' : 'driving',
          avoidHazards: true,
          hazards: incidents, // Pass live/demo active hazards
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCalculationError(data.error || 'Failed to calculate candidate routes.');
        setRoutes([]);
        setIsCalculating(false);
        return;
      }

      const result = data as RouteComparisonResult;
      setRoutes(result.routes);
      setSelectedRouteId(result.recommendedRouteId || result.fastestRouteId || 'A');
      setWarnings(result.warnings || []);
      setComputedTimestamp(new Date().toLocaleTimeString());

      // Fetch AI route comparison summary
      fetchAiRouteSummary(result.routes);
    } catch (err: any) {
      setCalculationError(err.message || 'Routing service is temporarily unavailable.');
      setRoutes([]);
    } finally {
      setIsCalculating(false);
    }
  }, [originCoords, destCoords, travelMode, incidents, fetchAiRouteSummary]);

  const fetchAiRouteSummary = useCallback(
    async (candidateRoutes: RouteOption[]) => {
      if (!candidateRoutes || candidateRoutes.length === 0) return;
      setIsAiSummarizing(true);
      try {
        const res = await fetch('/api/ai/route-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routes: candidateRoutes.map((r) => ({
              id: r.id,
              name: r.name,
              distanceKm: r.distanceKm,
              durationMin: r.durationMin,
              hazardCount: r.hazardCount,
              exposureScore: r.exposureScore,
              exposureCategory: r.exposureCategory,
              isFastest: r.isFastest,
              isSafest: r.isSafest,
              isRecommended: r.isRecommended,
              relevantHazards: r.relevantHazards.map((h) => ({
                incidentId: h.incidentId,
                title: h.title,
                severity: h.severity,
                distanceAlongRouteKm: h.distanceAlongRouteKm,
              })),
            })),
            travelMode,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiRouteSummary(data);
        }
      } catch (e) {
        console.warn('AI route summary fetch failed:', e);
      } finally {
        setIsAiSummarizing(false);
      }
    },
    [travelMode]
  );

  // Initial load calculation
  useEffect(() => {
    handleCalculateRoutes();
  }, [handleCalculateRoutes]);

  const handleSwapLocations = () => {
    const tempName = originName;
    const tempCoords = originCoords;
    setOriginName(destName);
    setOriginCoords(destCoords);
    setDestName(tempName);
    setDestCoords(tempCoords);
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col font-sans">
      <TopNavBar />

      {/* Main Content Layout (Two-Column Split View) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Route Controls & Alternatives (~440px width) */}
        <aside className="w-full lg:w-[450px] shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col h-auto lg:h-[calc(100vh-4rem)] overflow-y-auto custom-scroll">
          <div className="p-4 md:p-5 space-y-4">
            {/* Header Context */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-display font-bold text-on-surface">
                  Hydrologic Route Planner
                </h1>
                <p className="text-xs text-on-surface-variant">
                  Real OSRM trajectories with Turf.js flood hazard analysis
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest border border-outline-variant text-[11px] text-secondary font-mono">
                OSRM + TURF
              </span>
            </div>

            {/* 1. Journey Input Card */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 space-y-3 shadow-md">
              <div className="space-y-2.5 relative">
                {/* Connecting guideline between origin and destination */}
                <div className="absolute left-[19px] top-[26px] bottom-[26px] w-0.5 border-l-2 border-dashed border-outline-variant pointer-events-none"></div>

                {/* Origin Field */}
                <div className="space-y-1">
                  <LocationSearchBox
                    id="journey-origin"
                    placeholder="Search origin across India (e.g. Silk Board, Dadar, CP)..."
                    initialValue={originName}
                    icon="trip_origin"
                    iconColor="text-tertiary"
                    onSelect={(place) => {
                      setOriginName(place.formattedAddress || place.name);
                      setOriginCoords({ lat: place.lat, lng: place.lng });
                    }}
                    inputClassName="bg-surface-container-low"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-outline px-1">
                    <span>GPS: {originCoords.lat.toFixed(4)}° N, {originCoords.lng.toFixed(4)}° E</span>
                    <span className="text-tertiary">Origin Resolved</span>
                  </div>
                </div>

                {/* Swap button in middle */}
                <div className="flex justify-end pr-1 -my-1 z-10 relative">
                  <button
                    onClick={handleSwapLocations}
                    className="w-6 h-6 rounded bg-surface-container-highest border border-outline-variant flex items-center justify-center text-outline hover:text-primary transition-colors shadow-sm"
                    title="Swap origin and destination"
                  >
                    <span className="material-symbols-outlined text-sm">swap_vert</span>
                  </button>
                </div>

                {/* Destination Field */}
                <div className="space-y-1">
                  <LocationSearchBox
                    id="journey-destination"
                    placeholder="Search destination across India (e.g. Bellandur, BKC, Noida)..."
                    initialValue={destName}
                    icon="location_on"
                    iconColor="text-error"
                    onSelect={(place) => {
                      setDestName(place.formattedAddress || place.name);
                      setDestCoords({ lat: place.lat, lng: place.lng });
                    }}
                    inputClassName="bg-surface-container-low"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-outline px-1">
                    <span>GPS: {destCoords.lat.toFixed(4)}° N, {destCoords.lng.toFixed(4)}° E</span>
                    <span className="text-error">Destination Resolved</span>
                  </div>
                </div>
              </div>

              {/* Corridor Preset Chips for Quick Testing */}
              <div className="pt-2 border-t border-outline-variant/60">
                <span className="text-[10px] uppercase font-mono text-outline block mb-1.5">
                  India Corridor Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CORRIDOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setOriginName(preset.origin.name);
                        setOriginCoords(preset.origin.coords);
                        setDestName(preset.dest.name);
                        setDestCoords(preset.dest.coords);
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-surface-container-high border border-outline-variant hover:border-primary text-on-surface-variant hover:text-white transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selector */}
              <div className="space-y-2 pt-1 border-t border-outline-variant">
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span className="font-semibold uppercase tracking-wider">TRAVEL MODE</span>
                  <span className="text-secondary font-mono">Live OSRM Routing</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTravelMode('drive')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      travelMode === 'drive'
                        ? 'bg-surface-container-highest border border-primary text-primary shadow-sm'
                        : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">directions_car</span>
                    <span>Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('bike')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      travelMode === 'bike'
                        ? 'bg-surface-container-highest border border-primary text-primary shadow-sm'
                        : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">pedal_bike</span>
                    <span>Bike</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('transit')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      travelMode === 'transit'
                        ? 'bg-surface-container-highest border border-primary text-primary shadow-sm'
                        : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">directions_bus</span>
                    <span>Transit</span>
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleCalculateRoutes}
                disabled={isCalculating}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-on-primary font-display font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isCalculating ? 'sync' : 'navigation'}
                </span>
                <span>{isCalculating ? 'Computing Road Trajectories...' : 'Calculate Safe Routes'}</span>
              </button>

              {/* Error Notice */}
              {calculationError && (
                <div className="p-2.5 rounded bg-error/15 border border-error/40 text-xs text-error flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
                  <div className="flex-1">
                    <span>{calculationError}</span>
                    <button
                      onClick={handleCalculateRoutes}
                      className="block mt-1 underline font-semibold hover:text-white"
                    >
                      Retry Calculation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Hydrologic Routing Advisory Box */}
            <div className="bg-surface-container rounded-xl border border-secondary-container/40 p-4 relative overflow-hidden shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-secondary-container/20 text-secondary border border-secondary/30 shrink-0">
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_awesome
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-secondary">
                    AI Hydrologic Route Advisory
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {aiRouteSummary && (
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                        aiRouteSummary.generatedBy === 'gemini'
                          ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                          : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                      }`}
                    >
                      {aiRouteSummary.generatedBy === 'gemini' ? '✨ Gemini AI' : 'Deterministic'}
                    </span>
                  )}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    {computedTimestamp ? `Updated ${computedTimestamp}` : 'Real-time'}
                  </span>
                </div>
              </div>

              {isAiSummarizing ? (
                <div className="space-y-1.5 animate-pulse py-1">
                  <div className="h-3.5 bg-surface-container-high rounded w-3/4"></div>
                  <div className="h-3 bg-surface-container-high rounded w-full"></div>
                  <span className="text-[10px] text-outline font-mono flex items-center gap-1.5 pt-1">
                    <span className="material-symbols-outlined text-xs animate-spin text-secondary">sync</span>
                    <span>Analyzing flood exposure trade-offs with Gemini...</span>
                  </span>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-on-surface text-xs">
                    {aiRouteSummary?.headline || 'Optimal Corridor Selected'}
                  </div>
                  <p className="text-on-surface-variant leading-relaxed text-xs">
                    {aiRouteSummary?.summary ||
                      selectedRoute?.recommendationReason ||
                      'Route evaluated against active municipal waterlogging and storm drain telemetry using Turf.js proximity buffers.'}
                  </p>

                  {/* Route Trade-off breakdown */}
                  {aiRouteSummary?.tradeoffs && aiRouteSummary.tradeoffs.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-outline-variant/30">
                      <span className="text-[10px] uppercase font-mono text-outline block">
                        Trade-Off Breakdown:
                      </span>
                      {aiRouteSummary.tradeoffs.map((t, idx) => (
                        <div key={idx} className="text-[11px] text-on-surface-variant flex items-start gap-1.5">
                          <strong className="font-mono text-primary shrink-0">Route {t.routeId}:</strong>
                          <span>{t.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Route Alternatives List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                  Calculated Route Options ({routes.length})
                </h2>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  Ranked by Cost Index
                </span>
              </div>

              {/* Demo Fallback Advisory Banner */}
              {routes.some((r) => r.provenance === 'demo_fallback') && (
                <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-base mt-0.5 text-amber-400 shrink-0">
                    science
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-amber-300 uppercase tracking-wider">
                      Demo Fallback Trajectory Active
                    </p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Public OSRM routing was unreachable, so synthetic demo corridors are displayed. These represent simulated trajectories and are <strong className="text-amber-300">not live driving directions</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading Skeleton */}
              {isCalculating && routes.length === 0 && (
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-4 rounded-xl bg-surface-container border border-outline-variant animate-pulse space-y-2"
                    >
                      <div className="h-4 bg-surface-container-high rounded w-3/4"></div>
                      <div className="h-3 bg-surface-container-high rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render Candidate Routes */}
              {routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const isHighRisk = route.exposureCategory === 'high';
                const isModRisk = route.exposureCategory === 'moderate';

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? isHighRisk
                          ? 'bg-surface-container-highest/80 border-2 border-error shadow-lg ring-1 ring-error/20'
                          : isModRisk
                          ? 'bg-surface-container-highest/80 border-2 border-amber-400 shadow-lg ring-1 ring-amber-400/20'
                          : 'bg-surface-container-highest/80 border-2 border-primary shadow-lg ring-1 ring-primary/20'
                        : 'bg-surface-container border border-outline-variant hover:border-outline'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {route.id}
                        </span>
                        <h3 className="font-display font-semibold text-sm text-on-surface line-clamp-1">
                          {route.name}
                        </h3>
                      </div>

                      {/* Badge Tags */}
                      <div className="flex items-center gap-1 shrink-0">
                        {route.provenance === 'demo_fallback' ? (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider"
                            title="Synthesized demo route - Public OSRM routing was unavailable. Not real driving directions."
                          >
                            <span className="material-symbols-outlined text-[10px]">science</span>
                            DEMO FALLBACK
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider"
                            title="Real road network route calculated via OpenStreetMap OSRM"
                          >
                            <span className="material-symbols-outlined text-[10px]">satellite_alt</span>
                            LIVE OSRM
                          </span>
                        )}
                        {route.isRecommended && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[11px]">verified</span>
                            RECOMMENDED
                          </span>
                        )}
                        {route.isSafest && !route.isRecommended && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[11px]">shield</span>
                            SAFEST
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hazard Pill & Avoidance Chip */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          route.hazardCount === 0
                            ? 'bg-tertiary/15 border-tertiary/40 text-tertiary'
                            : isHighRisk
                            ? 'bg-error/15 border-error/40 text-error'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {route.hazardCount === 0 ? 'check_circle' : 'warning'}
                        </span>
                        <span>
                          {route.hazardCount === 0
                            ? '0 Known Hazards'
                            : `${route.hazardCount} Waterlogging Hazard${route.hazardCount > 1 ? 's' : ''}`}
                        </span>
                      </span>

                      {route.avoidsHazards.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface-container-high border border-outline-variant text-on-surface-variant">
                          <span className="material-symbols-outlined text-[10px] text-tertiary">alt_route</span>
                          <span>Avoids {route.avoidsHazards.join(', ')}</span>
                        </span>
                      )}
                    </div>

                    {/* Metric Details Bar */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/60 text-on-surface-variant font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isHighRisk ? 'text-error' : isModRisk ? 'text-amber-400' : 'text-primary'
                          }`}
                        >
                          {route.durationMin} min
                        </span>
                        {route.timeDeltaMin > 0 && (
                          <span className="text-[11px] text-outline">
                            (+{route.timeDeltaMin}m)
                          </span>
                        )}
                        <span className="text-outline">•</span>
                        <span>{route.distanceKm} km</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px]">
                        <span>Exposure:</span>
                        <strong
                          className={
                            isHighRisk ? 'text-error' : isModRisk ? 'text-amber-400' : 'text-tertiary'
                          }
                        >
                          {route.exposureScore !== null ? `${route.exposureScore}/100` : 'Unknown'}
                        </strong>
                      </div>
                    </div>

                    {/* Selected Route Hazard Expansion */}
                    {isSelected && route.relevantHazards.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-outline-variant/60 space-y-1.5">
                        <span className="text-[10px] uppercase font-mono text-outline block">
                          Hazards Encountered On This Path:
                        </span>
                        {route.relevantHazards.map((h, hIdx) => (
                          <div
                            key={hIdx}
                            className="p-1.5 rounded bg-surface-container-low border border-outline-variant/60 text-[11px] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs text-error">warning</span>
                              <strong className="font-mono text-error">{h.incidentId}</strong>
                              <span className="line-clamp-1 text-on-surface">{h.title}</span>
                            </div>
                            <span className="font-mono text-[10px] text-outline shrink-0">
                              {h.distanceAlongRouteKm} km in
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 4. Crucial Safety Warning Card */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
              <div className="flex items-start gap-2.5">
                <span
                  className="material-symbols-outlined text-amber-400 text-lg shrink-0 mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  report_problem
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Hydro Safety Advisory
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    <strong className="text-amber-300 font-semibold">Warning:</strong> Lower known hazard
                    exposure does not guarantee completely dry roads. Flash runoff can accumulate during active
                    downpours. Obey physical barriers and police barricades.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Interactive Leaflet Route Map */}
        <section className="flex-1 relative bg-[#07101d] flex flex-col overflow-hidden min-h-[500px]">
          <InteractiveJourneyMap
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            origin={originProp}
            destination={destProp}
          />

          {/* Bottom HUD Metrics Bar on Map */}
          {selectedRoute && (
            <div className="absolute bottom-4 left-4 right-16 sm:right-auto bg-surface-container/95 backdrop-blur-md border border-outline-variant rounded-xl p-3 shadow-2xl z-[1000] flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                <span className="font-semibold text-on-surface">
                  Selected: <strong className="text-primary font-mono">Route {selectedRoute.id}</strong>
                </span>
              </div>
              <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
              <div className="text-on-surface-variant font-mono">
                Duration: <strong className="text-on-surface">{selectedRoute.durationMin} min</strong> ({selectedRoute.distanceKm} km)
              </div>
              <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
              <div className="text-on-surface-variant font-mono">
                Hazards: <span className={selectedRoute.hazardCount > 0 ? 'text-error font-bold' : 'text-tertiary font-bold'}>{selectedRoute.hazardCount}</span>
              </div>
              <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
              {selectedRoute.provenance === 'demo_fallback' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-semibold">
                  <span className="material-symbols-outlined text-[11px]">science</span>
                  DEMO FALLBACK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-semibold">
                  <span className="material-symbols-outlined text-[11px]">satellite_alt</span>
                  LIVE OSRM
                </span>
              )}
              <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
              <Link
                href="/risk-map"
                className="text-primary hover:underline font-medium text-xs hidden sm:inline"
              >
                Inspect City Map →
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function PlanJourneyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant font-mono text-xs">
          Loading Journey Planner...
        </div>
      }
    >
      <PlanJourneyContent />
    </Suspense>
  );
}
