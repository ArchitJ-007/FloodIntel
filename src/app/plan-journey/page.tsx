'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';

export default function PlanJourneyPage() {
  const [origin, setOrigin] = useState('Tech Park Campus, Building B');
  const [destination, setDestination] = useState('North Metro Railway Station');
  const [travelMode, setTravelMode] = useState<'drive' | 'bike' | 'transit'>('drive');
  const [selectedRoute, setSelectedRoute] = useState<'A' | 'B' | 'C'>('A');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedMessage, setCalculatedMessage] = useState<string | null>(null);

  const handleFindRoutes = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setCalculatedMessage('Hydrologic path recalculated. Route A remains optimal.');
      setTimeout(() => setCalculatedMessage(null), 4000);
    }, 600);
  };

  const handleSwapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col font-sans">
      <TopNavBar />

      {/* Main Content Layout (Two-Column Split View) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Route Controls & Alternatives (~430px width) */}
        <aside className="w-full lg:w-[440px] shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col h-auto lg:h-[calc(100vh-4rem)] overflow-y-auto custom-scroll">
          <div className="p-4 md:p-5 space-y-4">
            {/* Header Context */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-display font-bold text-on-surface">
                  Hydrologic Route Planner
                </h1>
                <p className="text-xs text-on-surface-variant">
                  Real-time flood-avoidance routing & elevation check
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest border border-outline-variant text-[11px] text-secondary font-mono">
                GRID V4.8
              </span>
            </div>

            {/* 1. Journey Input Card */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 space-y-3 shadow-md">
              <div className="space-y-2.5 relative">
                {/* Connecting guideline between origin and destination */}
                <div className="absolute left-[19px] top-[26px] bottom-[26px] w-0.5 border-l-2 border-dashed border-outline-variant pointer-events-none"></div>

                {/* Origin Field */}
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center justify-center text-tertiary">
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      trip_origin
                    </span>
                  </div>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Starting Location"
                    className="w-full pl-9 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs sm:text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Swap button in middle */}
                <div className="flex justify-end pr-1 -my-1 z-10 relative">
                  <button
                    onClick={handleSwapLocations}
                    className="w-6 h-6 rounded bg-surface-container-highest border border-outline-variant flex items-center justify-center text-outline hover:text-primary transition-colors"
                    title="Swap locations"
                  >
                    <span className="material-symbols-outlined text-sm">swap_vert</span>
                  </button>
                </div>

                {/* Destination Field */}
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center justify-center text-error">
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      location_on
                    </span>
                  </div>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Destination"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs sm:text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Mode / Departure Selector */}
              <div className="space-y-2 pt-1 border-t border-outline-variant">
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span className="font-semibold uppercase tracking-wider">TRAVEL MODE</span>
                  <span className="text-secondary font-mono">Depart Now (Live)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Drive */}
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

                  {/* Bike */}
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

                  {/* Transit */}
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

              {/* Primary Button: Find Routes */}
              <button
                type="button"
                onClick={handleFindRoutes}
                disabled={isCalculating}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-on-primary font-display font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  navigation
                </span>
                <span>{isCalculating ? 'Computing Hydro Trajectory...' : 'Find Elevation-Safe Routes'}</span>
              </button>

              {calculatedMessage && (
                <div className="p-2 rounded bg-tertiary/10 border border-tertiary/30 text-xs text-tertiary text-center">
                  {calculatedMessage}
                </div>
              )}
            </div>

            {/* 2. AI Journey Advisory Box */}
            <div className="bg-surface-container rounded-xl border border-secondary-container/40 p-4 relative overflow-hidden shadow-sm">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-secondary-container/20 text-secondary border border-secondary/30 shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-secondary">
                      AI Journey Advisory (Hydro-ML)
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      Real-time
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Route A adds 6.3 km but completely bypasses{' '}
                    <span className="text-error font-semibold">Central Underpass (water depth 2.5 ft)</span>{' '}
                    and avoids estimated 40-minute flood bottleneck. Recommended for all vehicle classes.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Route Alternatives List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                  Calculated Route Options (3)
                </h2>
                <span className="text-[11px] text-on-surface-variant">Sorted by safety index</span>
              </div>

              {/* ROUTE A (Recommended - Hazard-Free) */}
              <div
                onClick={() => setSelectedRoute('A')}
                className={`rounded-xl p-4 cursor-pointer transition-all ${
                  selectedRoute === 'A'
                    ? 'bg-surface-container-highest/80 border-2 border-primary shadow-lg ring-1 ring-primary/20'
                    : 'bg-surface-container border border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
                      A
                    </span>
                    <h3 className="font-display font-semibold text-sm text-on-surface">
                      Via Outer Ring Expressway
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary/15 border border-tertiary/40 text-tertiary">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>0 Known Hazards</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-outline-variant/60">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-primary font-mono">
                      {travelMode === 'drive' ? '32 min' : travelMode === 'bike' ? '48 min' : '41 min'}
                    </span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant font-mono">18.4 km</span>
                  </div>
                  <span className="text-[11px] text-tertiary font-bold flex items-center gap-1 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    RECOMMENDED
                  </span>
                </div>
              </div>

              {/* ROUTE B (Direct but Risky) */}
              <div
                onClick={() => setSelectedRoute('B')}
                className={`rounded-xl p-4 cursor-pointer transition-all ${
                  selectedRoute === 'B'
                    ? 'bg-surface-container-highest/80 border-2 border-error shadow-lg ring-1 ring-error/20'
                    : 'bg-surface-container border border-outline-variant hover:border-error/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-xs font-bold">
                      B
                    </span>
                    <h3 className="font-display font-semibold text-sm text-on-surface">
                      Via Downtown Central Ave
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-error shrink-0">Direct</span>
                </div>

                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-error/15 border border-error/40 text-error">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    <span>2 Severe Hazards (#FLD-084, #FLD-071)</span>
                  </span>
                </div>

                <div className="p-2 rounded bg-surface-container-low border border-error/20 flex items-start gap-1.5 text-xs text-error">
                  <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">block</span>
                  <span>Central Underpass flooded (2.5 ft depth). Impassable for light vehicles.</span>
                </div>

                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-outline-variant/60 text-on-surface-variant">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-error">
                      {travelMode === 'drive' ? '48 min' : travelMode === 'bike' ? '65 min' : '52 min'}
                    </span>
                    <span className="text-[11px] text-outline">(Heavy Delays)</span>
                    <span className="text-outline">•</span>
                    <span className="font-mono">12.1 km</span>
                  </div>
                </div>
              </div>

              {/* ROUTE C (Moderate Risk) */}
              <div
                onClick={() => setSelectedRoute('C')}
                className={`rounded-xl p-4 cursor-pointer transition-all ${
                  selectedRoute === 'C'
                    ? 'bg-surface-container-highest/80 border-2 border-amber-400 shadow-lg ring-1 ring-amber-400/20'
                    : 'bg-surface-container border border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-xs font-bold">
                      C
                    </span>
                    <h3 className="font-display font-semibold text-sm text-on-surface">
                      Via Riverbank Parkway
                    </h3>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-mono">Secondary</span>
                </div>

                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-400">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>1 Moderate Waterlogging Hazard</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-outline-variant/60 text-on-surface-variant">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-amber-400">
                      {travelMode === 'drive' ? '39 min' : travelMode === 'bike' ? '54 min' : '45 min'}
                    </span>
                    <span className="text-outline">•</span>
                    <span className="font-mono">14.8 km</span>
                  </div>
                  <span className="text-[11px] text-outline">Surface Runoff Zone</span>
                </div>
              </div>
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
                    <strong className="text-amber-300 font-semibold">Warning:</strong> Avoiding reported
                    hazards does not guarantee dry conditions. Flash runoff may occur during active
                    downpours. Obey roadside barriers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Route Map Visualization (flex-1) */}
        <section className="flex-1 relative bg-[#07101d] flex flex-col overflow-hidden min-h-[500px]">
          {/* Tactical SVG Map Vector Surface */}
          <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
            <svg
              className="w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 700"
            >
              <defs>
                <pattern
                  id="journey-grid-pattern"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#122131" strokeWidth="0.8" />
                </pattern>
                <filter id="route-blue-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#7bd0ff" />
                </marker>
              </defs>

              {/* Grid Background */}
              <rect width="1000" height="700" fill="url(#journey-grid-pattern)" />

              {/* Municipal River / Canal (Flood Basin) */}
              <path
                d="M 0 350 C 250 310, 400 480, 650 420 C 800 380, 920 440, 1000 430"
                fill="none"
                stroke="#00354a"
                strokeWidth="38"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M 0 350 C 250 310, 400 480, 650 420 C 800 380, 920 440, 1000 430"
                fill="none"
                stroke="#00a6e0"
                strokeWidth="8"
                strokeDasharray="8 6"
                opacity="0.3"
              />

              {/* Secondary Grid Roads */}
              <g opacity="0.6" stroke="#1c2b3c" strokeWidth="2">
                <line x1="80" y1="0" x2="80" y2="700" />
                <line x1="280" y1="0" x2="280" y2="700" />
                <line x1="480" y1="0" x2="480" y2="700" />
                <line x1="720" y1="0" x2="720" y2="700" />
                <line x1="880" y1="0" x2="880" y2="700" />
                <line x1="0" y1="120" x2="1000" y2="120" />
                <line x1="0" y1="240" x2="1000" y2="240" />
                <line x1="0" y1="520" x2="1000" y2="520" />
                <line x1="0" y1="620" x2="1000" y2="620" />
              </g>

              {/* ROUTE B (Downtown Central Ave - Risky / Dashed) */}
              <path
                d="M 180 560 L 290 420 L 480 340 L 640 260 L 820 180"
                fill="none"
                stroke={selectedRoute === 'B' ? '#ef4444' : '#424754'}
                strokeWidth={selectedRoute === 'B' ? '6' : '4'}
                strokeDasharray="6 6"
                opacity={selectedRoute === 'B' ? '1' : '0.7'}
              />
              {/* Flooded Red Segment on Route B */}
              <path
                d="M 450 355 L 530 315"
                fill="none"
                stroke="#ef4444"
                strokeWidth="7"
                opacity="0.9"
              />

              {/* ROUTE C (Riverbank Parkway - Amber Alternate) */}
              <path
                d="M 180 560 L 320 600 L 580 520 L 710 380 L 820 180"
                fill="none"
                stroke={selectedRoute === 'C' ? '#f59e0b' : '#7c6126'}
                strokeWidth={selectedRoute === 'C' ? '5.5' : '3.5'}
                strokeDasharray="5 5"
                opacity={selectedRoute === 'C' ? '1' : '0.5'}
              />

              {/* ROUTE A (SELECTED / RECOMMENDED - Cyan Polyline) */}
              <path
                d="M 180 560 L 150 320 L 240 180 L 460 140 L 740 130 L 820 180"
                fill="none"
                stroke="#4d8eff"
                strokeWidth={selectedRoute === 'A' ? '10' : '6'}
                filter="url(#route-blue-glow)"
                opacity={selectedRoute === 'A' ? '0.5' : '0.2'}
              />
              <path
                d="M 180 560 L 150 320 L 240 180 L 460 140 L 740 130 L 820 180"
                fill="none"
                stroke="#7bd0ff"
                strokeWidth={selectedRoute === 'A' ? '5' : '3.5'}
                strokeLinejoin="round"
                opacity={selectedRoute === 'A' ? '1' : '0.7'}
              />

              {/* Water Sensor Nodes Scattered on Grid */}
              <circle cx="340" cy="220" r="4" fill="#4edea3" opacity="0.8" />
              <circle cx="680" cy="140" r="4" fill="#4edea3" opacity="0.8" />
              <circle cx="210" cy="380" r="4" fill="#4edea3" opacity="0.8" />
              <circle cx="790" cy="480" r="4" fill="#f59e0b" opacity="0.8" />
            </svg>

            {/* HTML Anchored Map Overlays */}
            {/* ORIGIN PIN: Tech Park Campus */}
            <div
              className="absolute pointer-events-none"
              style={{ left: '18%', top: '78%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 rounded bg-surface-container-high border border-outline text-[11px] font-semibold text-tertiary mb-1 shadow-lg whitespace-nowrap">
                  Origin: {origin.split(',')[0]}
                </div>
                <div className="relative flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full bg-tertiary/20 animate-ping absolute"></span>
                  <div className="w-6 h-6 rounded-full bg-tertiary border-2 border-surface text-on-tertiary flex items-center justify-center shadow-lg font-bold text-xs">
                    <span className="material-symbols-outlined text-[14px]">trip_origin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DESTINATION PIN: North Metro Railway */}
            <div
              className="absolute pointer-events-none"
              style={{ left: '82%', top: '25%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 rounded bg-surface-container-high border border-outline text-[11px] font-semibold text-on-surface mb-1 shadow-lg whitespace-nowrap flex items-center gap-1">
                  <span className="material-symbols-outlined text-error text-[13px]">location_on</span>
                  <span>Dest: {destination.split(',')[0]}</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-error border-2 border-surface text-white flex items-center justify-center shadow-lg">
                  <span
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    location_on
                  </span>
                </div>
              </div>
            </div>

            {/* HAZARD MARKER 1: Central Underpass FLD-084 */}
            <div
              className="absolute cursor-pointer z-20 group"
              style={{ left: '48%', top: '48%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-error/20 border border-error/50 animate-ping absolute -top-1"></div>
                <div className="relative z-10 w-7 h-7 rounded-full bg-error border-2 border-surface flex items-center justify-center text-white shadow-xl">
                  <span className="material-symbols-outlined text-xs">warning</span>
                </div>
                {/* Tooltip */}
                <div className="absolute top-full mt-1.5 hidden group-hover:flex flex-col bg-surface-container-high border border-outline-variant p-2 rounded text-xs min-w-[170px] shadow-2xl">
                  <span className="text-error font-bold text-[10px]">#FLD-084 BLOCKED</span>
                  <span className="text-on-surface">Central Underpass (2.5 ft)</span>
                  <span className="text-outline text-[10px]">Route B crosses this choke</span>
                </div>
              </div>
            </div>

            {/* Bottom HUD Metrics Bar on Map */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-surface-container/90 backdrop-blur-md border border-outline-variant rounded-xl p-3 shadow-2xl z-30 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="font-semibold text-on-surface">
                  Active Route: <strong className="text-primary font-mono">Route {selectedRoute}</strong>
                </span>
              </div>
              <div className="h-4 w-px bg-outline-variant"></div>
              <div className="text-on-surface-variant font-mono">
                Elevation Margin: <span className="text-tertiary font-bold">+4.2 m Safe</span>
              </div>
              <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
              <Link
                href="/risk-map"
                className="text-primary hover:underline font-medium text-xs hidden sm:inline"
              >
                Inspect in Risk Map →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
