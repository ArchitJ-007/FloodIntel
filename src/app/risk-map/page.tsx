'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TopNavBar } from '@/components/TopNavBar';
import { SeverityBadge } from '@/components/SeverityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useIncidents, Incident, normalizeSeverity } from '@/context/IncidentContext';
import { useWeather } from '@/hooks/useWeather';
import { calculateRiskScore } from '@/lib/riskEngine';
import { AiRiskExplanation } from '@/components/AiRiskExplanation';
import { LocationSearchBox } from '@/components/LocationSearchBox';

// Dynamically import InteractiveFloodMap to prevent Leaflet browser APIs from executing during SSR
const InteractiveFloodMap = dynamic(() => import('@/components/InteractiveFloodMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#070e17] text-on-surface-variant font-mono text-xs gap-3">
      <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
      <span>Loading OpenStreetMap geospatial tiles...</span>
    </div>
  ),
});

function RiskMapContent() {
  const { incidents, selectedIncident, setSelectedIncidentId, stats } = useIncidents();
  const searchParams = useSearchParams();
  const paramLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const paramLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
  const paramLabel = searchParams.get('label') || null;

  const [activeLocation, setActiveLocation] = useState<{ lat: number; lng: number; label: string }>({
    lat: paramLat !== null && !isNaN(paramLat) ? paramLat : 12.9352,
    lng: paramLng !== null && !isNaN(paramLng) ? paramLng : 77.6245,
    label: paramLabel || 'Koramangala, Bengaluru',
  });

  useEffect(() => {
    if (paramLat !== null && paramLng !== null && !isNaN(paramLat) && !isNaN(paramLng)) {
      setActiveLocation({
        lat: paramLat,
        lng: paramLng,
        label: paramLabel || 'Selected Location',
      });
    }
  }, [paramLat, paramLng, paramLabel]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<{
    high: boolean;
    moderate: boolean;
    low: boolean;
    cleared: boolean;
  }>({
    high: true,
    moderate: true,
    low: true,
    cleared: true,
  });
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [zoneFilter, setZoneFilter] = useState('All Zones');
  const [timeWindow, setTimeWindow] = useState<'3h' | '12h' | '24h' | 'all'>('24h');
  const [spatialScope, setSpatialScope] = useState<'regional' | 'nationwide'>('regional');
  const [sharedAlertMessage, setSharedAlertMessage] = useState<string | null>(null);

  // Live Weather Telemetry (Open-Meteo) for dynamically selected city coordinates across India
  const {
    weather,
    isLoading: isWeatherLoading,
    error: weatherError,
    refetch: refetchWeather,
  } = useWeather(activeLocation.lat, activeLocation.lng);

  // Filtered incidents (PRD F-03 & F-15)
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // 1. Spatial Scope filter (75km regional corridor vs nationwide)
      if (spatialScope === 'regional' && incident.coordinates?.lat && incident.coordinates?.lng) {
        // Haversine distance in meters
        const R = 6371000;
        const dLat = ((incident.coordinates.lat - activeLocation.lat) * Math.PI) / 180;
        const dLon = ((incident.coordinates.lng - activeLocation.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((activeLocation.lat * Math.PI) / 180) *
            Math.cos((incident.coordinates.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const distM = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

        if (distM > 75000) return false;
      }

      // 2. Time Window filter (PRD F-15)
      if (timeWindow === '3h') {
        const cutoff = Date.now() - 3 * 60 * 60 * 1000;
        if (incident.reportedTimestamp < cutoff) return false;
      } else if (timeWindow === '12h') {
        const cutoff = Date.now() - 12 * 60 * 60 * 1000;
        if (incident.reportedTimestamp < cutoff) return false;
      } else if (timeWindow === '24h') {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        if (incident.reportedTimestamp < cutoff) return false;
      }

      // 3. Severity
      if (!severityFilter[incident.severity]) return false;

      // 4. Status
      if (statusFilter !== 'All Statuses' && incident.status !== statusFilter) return false;

      // 5. Zone
      if (zoneFilter !== 'All Zones' && !incident.zone.includes(zoneFilter.replace(' (', '')))
        return false;

      // 6. Text Search Query (separate from location search! F-03)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = incident.id.toLowerCase().includes(query);
        const matchesTitle = incident.title.toLowerCase().includes(query);
        const matchesLoc = incident.location.toLowerCase().includes(query);
        if (!matchesId && !matchesTitle && !matchesLoc) return false;
      }

      return true;
    });
  }, [
    incidents,
    spatialScope,
    activeLocation,
    timeWindow,
    severityFilter,
    statusFilter,
    zoneFilter,
    searchQuery,
  ]);

  // PRD F-03: Deselect incident if it is no longer valid in the visible filtered results
  useEffect(() => {
    if (selectedIncident && !filteredIncidents.some((i) => i.id === selectedIncident.id)) {
      setSelectedIncidentId('');
    }
  }, [filteredIncidents, selectedIncident, setSelectedIncidentId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSpatialScope('regional');
    setSeverityFilter({ high: true, moderate: true, low: true, cleared: true });
    setStatusFilter('All Statuses');
    setZoneFilter('All Zones');
    setTimeWindow('all');
  };

  const handleShareAlert = (incident: Incident) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(
        `[FloodIntel Alert] ${incident.id} at ${incident.location} - Water Depth: ${incident.depth}, Severity: ${incident.severity.toUpperCase()}`
      );
    }
    setSharedAlertMessage(`Alert ${incident.id} copied to clipboard!`);
    setTimeout(() => setSharedAlertMessage(null), 3000);
  };

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col font-sans overflow-x-hidden">
      <TopNavBar />

      {/* Sub-header Bar / Tactical Control Strip */}
      <section className="w-full bg-surface-container-low border-b border-outline-variant py-2.5 px-4 md:px-6 z-30">
        <div className="w-full mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Location Search Input (PRD F-03: Decoupled from incident text-filter) */}
          <div className="relative flex-1 max-w-xl">
            <LocationSearchBox
              id="risk-map-place-search"
              placeholder="Fly to any Indian city or locality (e.g. Mumbai, Delhi, Pune, Silk Board)..."
              initialValue={activeLocation.label}
              onSelect={(place) => {
                setActiveLocation({
                  lat: place.lat,
                  lng: place.lng,
                  label: place.formattedAddress || place.name,
                });
                // PRD F-03: Do not overwrite incident text searchQuery!
              }}
              inputClassName="bg-surface h-[38px]"
            />
          </div>

          {/* Active City Location Chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container border border-outline-variant text-xs text-on-surface">
            <span className="material-symbols-outlined text-primary text-sm">pin_drop</span>
            <span className="font-semibold text-primary truncate max-w-[140px] sm:max-w-xs">
              {activeLocation.label.split(',')[0]}
            </span>
            <span className="text-outline text-[10px] font-mono hidden sm:inline">
              ({activeLocation.lat.toFixed(3)}°, {activeLocation.lng.toFixed(3)}°)
            </span>
          </div>

          {/* Quick Statistics Badge & Weather Telemetry Pill */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Quick Statistics Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container border border-outline-variant text-xs text-on-surface-variant">
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                <span className="tabular-nums font-mono">{stats.activeHazards}</span> Active Incidents
              </span>
              <span className="text-outline-variant">•</span>
              <span className="flex items-center gap-1 text-error font-semibold">
                <span className="w-2 h-2 rounded-full bg-error inline-block"></span>
                <span className="tabular-nums font-mono">{stats.highSeverity}</span> High Severity
              </span>
              <span className="text-outline-variant hidden sm:inline">•</span>
              <span className="text-outline text-[11px] font-mono hidden sm:inline">
                EDP-9 Live Ingest
              </span>
            </div>

            {/* Live Weather Telemetry Pill (Open-Meteo) */}
            {isWeatherLoading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container-high border border-outline-variant text-xs text-on-surface animate-pulse">
                <span className="material-symbols-outlined text-secondary text-base animate-spin">sync</span>
                <span className="font-mono text-outline">Ingesting Open-Meteo...</span>
              </div>
            ) : weatherError ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container-high border border-error/30 text-xs text-error">
                <span className="material-symbols-outlined text-base">cloud_off</span>
                <span>Weather Telemetry Offline</span>
                <button
                  onClick={refetchWeather}
                  className="text-primary hover:underline font-mono text-[11px] ml-1"
                  title="Retry fetching weather telemetry"
                >
                  Retry
                </button>
              </div>
            ) : weather ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container-high border border-outline-variant text-xs text-on-surface">
                <span className="material-symbols-outlined text-secondary text-base">
                  {weather.current.precipitationMmPerHour && weather.current.precipitationMmPerHour > 0
                    ? 'rainy'
                    : 'cloud'}
                </span>
                <span className="font-mono">
                  {weather.intensityCategoryLabel}:{' '}
                  <strong className="text-secondary font-bold">
                    {weather.current.precipitationMmPerHour !== null
                      ? `${weather.current.precipitationMmPerHour}mm/h`
                      : '0mm/h'}
                  </strong>
                  {weather.current.temperatureC !== null && (
                    <span className="text-on-surface-variant font-normal ml-1">
                      ({weather.current.temperatureC}°C)
                    </span>
                  )}
                </span>
                <span className="text-outline-variant">•</span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${
                    weather.rainRiskCategory === 'high'
                      ? 'bg-error/20 text-error border-error/30'
                      : weather.rainRiskCategory === 'moderate'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-primary/20 text-primary border-primary/30'
                  }`}
                  title={`Rain Risk Index: ${weather.rainRiskIndex}/100`}
                >
                  Rain Risk: {weather.rainRiskCategory}
                </span>
                {weather.isStale && (
                  <span className="text-[10px] text-amber-400 font-mono px-1 rounded bg-amber-500/10 border border-amber-500/30">
                    Stale
                  </span>
                )}
                <button
                  onClick={refetchWeather}
                  className="text-outline hover:text-primary transition-colors ml-0.5"
                  title={`Updated ${weather.providerTimestamp}. Click to refresh.`}
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Main Body: 30% Sidebar / 70% Map Canvas split */}
      <main className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden bg-surface-dim relative">
        {/* Left Filter & Inspection Sidebar (~30% Desktop width) */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] bg-surface-container-low border-r border-outline-variant flex flex-col h-auto lg:h-[calc(100vh-112px)] custom-scroll overflow-y-auto z-20 shrink-0">
          {/* Filter Section */}
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">tune</span>
                <h2 className="font-display font-semibold text-sm text-on-surface">
                  Filter Incident Feeds
                </h2>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-primary hover:underline font-medium"
                title="Reset all applied filters"
              >
                Reset
              </button>
            </div>

            {/* Incident Text Search (PRD F-03: Independent from place search) */}
            <div className="mb-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by report ID, title, road name..."
                  className="w-full bg-surface border border-outline-variant rounded-lg pl-8 pr-7 py-1.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs"
                    aria-label="Clear incident text search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Spatial Scope Toggle (PRD F-03: Regional 75km vs All Nationwide) */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                Geographic Scope
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded bg-surface border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setSpatialScope('regional')}
                  className={`py-1 text-center text-xs rounded transition-colors ${
                    spatialScope === 'regional'
                      ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Near {activeLocation.label.split(',')[0]} (75km)
                </button>
                <button
                  type="button"
                  onClick={() => setSpatialScope('nationwide')}
                  className={`py-1 text-center text-xs rounded transition-colors ${
                    spatialScope === 'nationwide'
                      ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All Nationwide ({incidents.length})
                </button>
              </div>
            </div>

            {/* Severity Checkboxes */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Severity Filter
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* High (Red) */}
                <label
                  className={`flex items-center gap-2 p-2 rounded bg-surface border cursor-pointer transition-colors ${
                    severityFilter.high
                      ? 'border-error/50 bg-error/5'
                      : 'border-outline-variant opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={severityFilter.high}
                    onChange={(e) =>
                      setSeverityFilter({ ...severityFilter, high: e.target.checked })
                    }
                    className="rounded border-outline-variant text-error focus:ring-error bg-surface-container"
                  />
                  <span className="text-xs font-semibold text-error flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error"></span> High
                  </span>
                </label>

                {/* Moderate (Amber) */}
                <label
                  className={`flex items-center gap-2 p-2 rounded bg-surface border cursor-pointer transition-colors ${
                    severityFilter.moderate
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-outline-variant opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={severityFilter.moderate}
                    onChange={(e) =>
                      setSeverityFilter({ ...severityFilter, moderate: e.target.checked })
                    }
                    className="rounded border-outline-variant text-amber-500 focus:ring-amber-500 bg-surface-container"
                  />
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> Moderate
                  </span>
                </label>

                {/* Unverified / Low (Blue) */}
                <label
                  className={`flex items-center gap-2 p-2 rounded bg-surface border cursor-pointer transition-colors ${
                    severityFilter.low
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-outline-variant opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={severityFilter.low}
                    onChange={(e) =>
                      setSeverityFilter({ ...severityFilter, low: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary bg-surface-container"
                  />
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary"></span> Low / Info
                  </span>
                </label>
              </div>
            </div>

            {/* Status & Zone Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Status Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option>All Statuses</option>
                  <option>Reported</option>
                  <option>Under Review</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
              </div>

              {/* Zone Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                  Zone
                </label>
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option>All Zones</option>
                  <option>Sector 4 & 5</option>
                  <option>Sector 1</option>
                  <option>Sector 2</option>
                  <option>Sector 3</option>
                </select>
              </div>
            </div>

            {/* Time Range Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Time Window
              </label>
              <div className="flex items-center rounded bg-surface border border-outline-variant p-0.5">
                {(['3h', '12h', '24h'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeWindow(t)}
                    className={`flex-1 py-1 text-center text-xs rounded transition-colors ${
                      timeWindow === t
                        ? 'bg-surface-container-highest text-primary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Last {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toast message if alert copied */}
          {sharedAlertMessage && (
            <div className="mx-4 mt-2 p-2 bg-primary/20 border border-primary/40 rounded text-xs text-primary text-center animate-in fade-in">
              {sharedAlertMessage}
            </div>
          )}

          {/* Active Selected Incident Detail Card */}
          {selectedIncident && (
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">
                  Active Selection
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  Pin Locked
                </span>
              </div>

              <article className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col gap-3 shadow-lg hover:border-primary/40 transition-colors">
                {/* Card Header & ID */}
                <div className="flex items-start justify-between border-b border-outline-variant/60 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-primary">
                        Report ID {selectedIncident.id}
                      </span>
                      {selectedIncident.provenance === 'demo' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-surface-container-highest text-secondary border border-outline-variant">
                          Demo Data
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-primary-container/40 text-primary border border-primary/30">
                          Citizen Report
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-semibold text-sm text-on-surface mt-0.5">
                      {selectedIncident.title}
                    </h3>
                  </div>
                  <SeverityBadge severity={selectedIncident.severity} />
                </div>

                {/* Deterministic Risk Engine Score Card (PRD F-05: Canonical authoritative score) */}
                {(() => {
                  const displayRiskScore = selectedIncident.riskScore;
                  const displayCategory = selectedIncident.riskCategory;
                  const displayConfidence = selectedIncident.confidence;
                  const displayBreakdown = selectedIncident.scoreBreakdown;
                  const displayWarnings = selectedIncident.warnings;

                  return (
                    <div className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-outline uppercase font-semibold tracking-wider">
                          Deterministic Risk Score
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          Confidence:{' '}
                          <strong className="text-on-surface uppercase">
                            {displayConfidence}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between" suppressHydrationWarning>
                        <div className="flex items-baseline gap-1.5" suppressHydrationWarning>
                          <span
                            suppressHydrationWarning
                            className={`text-2xl font-display font-bold tabular-nums font-mono ${
                              displayCategory === 'high'
                                ? 'text-error'
                                : displayCategory === 'moderate'
                                ? 'text-amber-400'
                                : displayCategory === 'low'
                                ? 'text-primary'
                                : 'text-outline'
                            }`}
                          >
                            {displayRiskScore !== null ? displayRiskScore : 'N/A'}
                          </span>
                          <span className="text-xs text-outline font-mono">/ 100</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            displayCategory === 'high'
                              ? 'bg-error/15 text-error border-error/30'
                              : displayCategory === 'moderate'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : displayCategory === 'low'
                              ? 'bg-primary/15 text-primary border-primary/30'
                              : 'bg-surface-container-highest text-outline border-outline-variant'
                          }`}
                        >
                          {displayCategory} Risk
                        </span>
                      </div>

                      {/* 5-Component Score Breakdown */}
                      {displayBreakdown && (
                        <div className="space-y-1 pt-1.5 border-t border-outline-variant/40 text-[10px]">
                          <div className="flex justify-between text-on-surface-variant font-mono">
                            <span>Severity (S)</span>
                            <span>{displayBreakdown.severity.contribution} pts</span>
                          </div>
                          <div className="flex justify-between text-on-surface-variant font-mono">
                            <span>Rain Telemetry (R)</span>
                            <span className={displayBreakdown.rain.available ? 'text-secondary font-bold' : ''}>
                              {displayBreakdown.rain.available
                                ? `${displayBreakdown.rain.contribution} pts (Open-Meteo)`
                                : 'Renormalized (N/A)'}
                            </span>
                          </div>
                          <div className="flex justify-between text-on-surface-variant font-mono">
                            <span>Recency Half-Life (T)</span>
                            <span>{displayBreakdown.recency.contribution} pts</span>
                          </div>
                          <div className="flex justify-between text-on-surface-variant font-mono">
                            <span>Corroboration (C)</span>
                            <span>{displayBreakdown.corroboration.contribution} pts</span>
                          </div>
                          <div className="flex justify-between text-on-surface-variant font-mono">
                            <span>Spatial History (H)</span>
                            <span>{displayBreakdown.hotspotHistory.contribution} pts</span>
                          </div>
                        </div>
                      )}

                      {/* Warnings / Caveats */}
                      {displayWarnings && displayWarnings.length > 0 && (
                        <div className="pt-1.5 border-t border-outline-variant/40 space-y-1">
                          {displayWarnings.map((warn, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] text-outline leading-tight flex items-start gap-1"
                            >
                              <span className="text-secondary shrink-0">•</span>
                              <span>{warn}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* AI Natural-Language Risk Explanation (PRD F-05: Driven by canonical risk score) */}
                <AiRiskExplanation
                  incident={selectedIncident}
                  calculatedRiskScore={selectedIncident.riskScore}
                  scoreBreakdown={
                    selectedIncident.scoreBreakdown
                      ? {
                          severityScore: selectedIncident.scoreBreakdown.severity.contribution,
                          rainScore: selectedIncident.scoreBreakdown.rain.contribution,
                          recencyScore: selectedIncident.scoreBreakdown.recency.contribution,
                          corroborationScore: selectedIncident.scoreBreakdown.corroboration.contribution,
                          hotspotScore: selectedIncident.scoreBreakdown.hotspotHistory.contribution,
                        }
                      : undefined
                  }
                  weatherSnapshot={
                    weather
                      ? {
                          precipitationMm: weather.current.precipitationMmPerHour,
                          rainRiskIndex: weather.rainRiskIndex,
                          intensityLabel: weather.intensityCategoryLabel,
                          isStale: weather.isStale,
                        }
                      : undefined
                  }
                />

                {/* Hazard Type & Depth */}
                <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/40">
                  <div>
                    <span className="block text-[10px] text-outline uppercase">Hazard Type</span>
                    <span className="text-xs font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-primary text-sm">water</span>
                      <span className="line-clamp-1">{selectedIncident.hazardTypeLabel}</span>
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-outline uppercase">Measured Depth</span>
                    <span
                      className={`text-xs font-mono font-bold mt-0.5 block ${
                        selectedIncident.severity === 'high' ? 'text-error' : 'text-amber-400'
                      }`}
                    >
                      ≈ {selectedIncident.depth}
                    </span>
                  </div>
                </div>

                {/* Description and Impassability alert */}
                <div className="p-2.5 rounded bg-surface-container-high/60 border border-outline-variant text-xs text-on-surface-variant">
                  <p className="leading-relaxed">
                    <strong className="text-on-surface font-semibold">Traffic Impact:</strong>{' '}
                    {selectedIncident.trafficImpact}
                  </p>
                </div>

                {/* Telemetry & Verification Metadata */}
                <div className="flex flex-col gap-1.5 text-xs border-t border-outline-variant/60 pt-2 text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-outline">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      Reported:
                    </span>
                    <span className="font-mono text-on-surface text-xs">
                      {selectedIncident.reportedTime} by {selectedIncident.reportedBy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-outline">
                      <span className="material-symbols-outlined text-xs">verified_user</span>
                      Status:
                    </span>
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  {selectedIncident.sensorNode && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-outline">Sensor Telemetry:</span>
                      <span className="text-secondary font-mono">
                        {selectedIncident.sensorNode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <Link
                    href="/plan-journey"
                    className="py-2 px-2 bg-error/20 text-error hover:bg-error hover:text-white text-center rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-error/30"
                  >
                    <span className="material-symbols-outlined text-sm">alt_route</span>
                    <span>Avoid Route</span>
                  </Link>
                  <Link
                    href="/officials"
                    className="py-2 px-2 bg-surface-container-highest border border-outline-variant hover:border-primary text-on-surface text-center rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    <span>Triage</span>
                  </Link>
                  <button
                    onClick={() => handleShareAlert(selectedIncident)}
                    className="py-2 px-2 bg-surface-container-highest border border-outline-variant hover:border-primary text-on-surface text-center rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">share</span>
                    <span>Share</span>
                  </button>
                </div>
              </article>
            </div>
          )}

          {/* Secondary Queue Snippet for quick switching (PRD F-03: Honest empty state) */}
          <div className="p-4 pt-0 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">
                {spatialScope === 'regional'
                  ? `Regional Incidents Near ${activeLocation.label.split(',')[0]} (${filteredIncidents.length})`
                  : `Nationwide Incidents (${filteredIncidents.length})`}
              </span>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="p-5 rounded-xl bg-surface border border-outline-variant text-center space-y-3 my-2 animate-in fade-in">
                <div className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-outline mx-auto">
                  <span className="material-symbols-outlined text-xl">location_off</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">No Active Incidents in This Area</h4>
                  <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                    {spatialScope === 'regional'
                      ? `No verified waterlogging hazards reported within 75 km of ${activeLocation.label.split(',')[0]}. Existing demo records are currently centered around the Bengaluru metropolitan corridor.`
                      : 'No reports match the current filter criteria.'}
                  </p>
                </div>
                {spatialScope === 'regional' && (
                  <button
                    type="button"
                    onClick={() => setSpatialScope('nationwide')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-highest border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">travel_explore</span>
                    <span>View All Nationwide Reports ({incidents.length})</span>
                  </button>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="block mx-auto text-primary text-[11px] hover:underline"
                  >
                    Clear text filter &ldquo;{searchQuery}&rdquo;
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredIncidents.map((incident) => {
                  const isSelected = selectedIncident?.id === incident.id;
                  return (
                    <button
                      type="button"
                      key={incident.id}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-surface-container-highest border-primary shadow-sm'
                          : 'bg-surface border-outline-variant/60 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-xs font-bold ${
                            incident.severity === 'high'
                              ? 'text-error'
                              : incident.severity === 'moderate'
                              ? 'text-amber-400'
                              : 'text-primary'
                          }`}
                        >
                          {incident.id}
                        </span>
                        <span className="text-[11px] text-outline">{incident.reportedTime}</span>
                      </div>
                      <p className="text-xs font-medium text-on-surface line-clamp-1 mt-0.5">
                        {incident.title}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-outline">
                          {incident.severity.toUpperCase()} • {incident.depth}
                        </span>
                        <StatusBadge status={incident.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Large Map Canvas (~70% width) - Interactive Leaflet Map */}
        <div className="flex-1 relative bg-[#070e17] h-[650px] lg:h-[calc(100vh-112px)] overflow-hidden select-none">
          <InteractiveFloodMap
            incidents={filteredIncidents}
            selectedIncidentId={selectedIncident?.id || null}
            onSelectIncident={setSelectedIncidentId}
            center={[activeLocation.lat, activeLocation.lng]}
          />

          {/* Floating 'Plan a Journey' Shortcut Button on Map */}
          <div className="absolute bottom-6 right-16 z-[1000] hidden sm:block">
            <Link
              href="/plan-journey"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs shadow-2xl border border-primary-fixed/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="w-5 h-5 rounded-md bg-on-primary/20 flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-sm">alt_route</span>
              </span>
              <span>Plan Safe Route</span>
              <span className="material-symbols-outlined text-xs ml-0.5">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Prototype Disclaimer Footer Strip */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-2 px-4 md:px-6 z-40 text-center">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-outline">
          <div className="flex items-center gap-1.5 text-amber-400/90 font-medium mx-auto sm:mx-0">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>Simulated data for prototype demonstration. Not connected to real municipal 911 dispatch.</span>
          </div>
          <div className="text-[10px] text-on-surface-variant/70">
            © 2025 FloodIntel Municipal Environmental Monitoring System. EDP-9 Active Mode.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function RiskMapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-dim flex items-center justify-center text-on-surface-variant font-mono text-xs">
          Loading Risk Map...
        </div>
      }
    >
      <RiskMapContent />
    </Suspense>
  );
}
