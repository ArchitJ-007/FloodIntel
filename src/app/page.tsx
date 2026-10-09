'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { useIncidents } from '@/context/IncidentContext';

export default function LandingPage() {
  const { stats, incidents } = useIncidents();
  const [activePinId, setActivePinId] = useState<string>('#FLD-084');

  const selectedIncident =
    incidents.find((i) => i.id === activePinId) || incidents[0];

  return (
    <div className="bg-surface-dim text-on-surface antialiased min-h-screen flex flex-col font-sans">
      <TopNavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="max-w-3xl space-y-4">
            {/* Status / Prototype Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-surface-container-low border border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                SIMULATED DATA PROTOTYPE • COMMUNITY HYDROLOGIC WATCH
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-on-surface tracking-tight leading-tight">
              Stay Informed. Travel Safer.
            </h1>

            {/* Supporting text */}
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              View citizen-reported waterlogging incidents, track live monsoon inundation alerts, and make safer, data-informed travel decisions before stepping out.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/risk-map"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-opacity-95 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-lg">map</span>
                <span>Explore Risk Map</span>
              </Link>
              <Link
                href="/report-hazard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high transition-all font-semibold"
              >
                <span className="material-symbols-outlined text-lg text-error">crisis_alert</span>
                <span>Report a Hazard</span>
              </Link>
              <Link
                href="/plan-journey"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all text-sm font-medium"
              >
                <span className="material-symbols-outlined text-lg">alt_route</span>
                <span>Plan Journey</span>
              </Link>
            </div>
          </div>

          {/* Real-Time Telemetry Ticker (3-column Bento Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Metric 1: Active Hazards */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Active Reported Hazards
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-secondary tabular-nums">
                    {stats.activeHazards}
                  </span>
                  <span className="text-xs text-secondary-container font-medium">
                    +4 in past hour
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant text-secondary">
                <span className="material-symbols-outlined text-2xl">flood</span>
              </div>
            </div>

            {/* Metric 2: High-Risk Blockages */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  High-Risk Blockages
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-error tabular-nums">
                    {stats.highSeverity}
                  </span>
                  <span className="text-xs text-error font-medium">Critical pass blocked</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-error/30 text-error">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
            </div>

            {/* Metric 3: Verified Resolved */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Verified Resolved
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-tertiary tabular-nums">
                    {stats.resolved}
                  </span>
                  <span className="text-xs text-tertiary font-medium">Water receded</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant text-tertiary">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
            </div>
          </div>
        </section>

        {/* Compact Interactive Map Preview Section */}
        <section className="space-y-3" id="map-preview">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-on-surface">
                Monsoon Hazard Canvas
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Live sector telemetry & spatial waterlogging coordinate matrix
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span> High Risk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Moderate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Unverified
              </span>
            </div>
          </div>

          {/* Map Frame Canvas */}
          <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-outline-variant bg-[#070e17] shadow-xl select-none">
            {/* Tactical Grid SVG Canvas */}
            <svg
              className="absolute inset-0 w-full h-full opacity-80"
              preserveAspectRatio="none"
              viewBox="0 0 1000 500"
            >
              <defs>
                <pattern id="landing-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#132235" strokeWidth="0.8" />
                  <circle cx="40" cy="40" r="1" fill="#1e324d" />
                </pattern>
                <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0e3a5d" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#114b78" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0b2c47" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <rect width="1000" height="500" fill="url(#landing-grid)" />
              {/* Rivers */}
              <path
                d="M -20,180 C 180,140 320,260 490,240 C 660,220 800,340 1020,310"
                fill="none"
                stroke="url(#riverGrad)"
                strokeWidth="32"
                strokeLinecap="round"
              />
              <path
                d="M -20,180 C 180,140 320,260 490,240 C 660,220 800,340 1020,310"
                fill="none"
                stroke="#2272a8"
                strokeWidth="3"
                strokeDasharray="10 5"
              />
              {/* Roads */}
              <line x1="0" y1="120" x2="1000" y2="120" stroke="#1f2f45" strokeWidth="6" />
              <line x1="0" y1="380" x2="1000" y2="380" stroke="#1f2f45" strokeWidth="6" />
              <line x1="320" y1="0" x2="320" y2="500" stroke="#1f2f45" strokeWidth="6" />
              <line x1="720" y1="0" x2="720" y2="500" stroke="#1f2f45" strokeWidth="6" />
              <path d="M 80,-20 L 640,520" stroke="#253a54" strokeWidth="4" />
              <path d="M 920,-20 L 420,520" stroke="#253a54" strokeWidth="4" />
            </svg>

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-surface-dim/80 via-transparent to-transparent"></div>

            {/* Interactive Pins */}
            {/* Pin 1: High Risk (#FLD-084) */}
            <div
              onClick={() => setActivePinId('#FLD-084')}
              className="absolute top-[42%] left-[44%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-error opacity-40"></span>
                <div
                  className={`relative w-8 h-8 rounded-full bg-surface-container-lowest border-2 flex items-center justify-center text-error shadow-xl transition-transform group-hover:scale-110 ${
                    activePinId === '#FLD-084' ? 'border-error ring-4 ring-error/30' : 'border-error'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm font-bold">report</span>
                </div>
              </div>
            </div>

            {/* Pin 2: High Risk (#FLD-071) */}
            <div
              onClick={() => setActivePinId('#FLD-071')}
              className="absolute top-[32%] left-[68%] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-error opacity-30"></span>
                <div
                  className={`w-7 h-7 rounded-full bg-surface-container-lowest border-2 flex items-center justify-center text-error shadow-md transition-transform group-hover:scale-110 ${
                    activePinId === '#FLD-071' ? 'border-error ring-4 ring-error/30' : 'border-error'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">warning</span>
                </div>
              </div>
            </div>

            {/* Pin 3: Moderate Risk (#FLD-063) */}
            <div
              onClick={() => setActivePinId('#FLD-063')}
              className="absolute top-[65%] left-[30%] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
            >
              <div
                className={`w-6 h-6 rounded-full bg-surface-container-lowest border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-md transition-transform group-hover:scale-110 ${
                  activePinId === '#FLD-063' ? 'ring-4 ring-amber-400/30' : ''
                }`}
              >
                <span className="material-symbols-outlined text-xs">water_loss</span>
              </div>
            </div>

            {/* Pin 4: Unverified (#FLD-091) */}
            <div
              onClick={() => setActivePinId('#FLD-091')}
              className="absolute top-[60%] left-[75%] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
            >
              <div
                className={`w-6 h-6 rounded-full bg-surface-container-lowest border-2 border-primary flex items-center justify-center text-primary shadow-sm transition-transform group-hover:scale-110 ${
                  activePinId === '#FLD-091' ? 'ring-4 ring-primary/30' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[11px]">help</span>
              </div>
            </div>

            {/* Floating Overlay Card (Selected Hazard Callout) */}
            <div className="absolute top-4 left-4 max-w-sm w-[calc(100%-2rem)] sm:w-80 bg-surface-container-low/95 backdrop-blur-md border border-outline-variant rounded-xl p-4 shadow-2xl z-30">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-outline-variant/60">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedIncident.severity === 'high'
                        ? 'bg-error'
                        : selectedIncident.severity === 'moderate'
                        ? 'bg-amber-400'
                        : 'bg-primary'
                    }`}
                  ></span>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      selectedIncident.severity === 'high'
                        ? 'text-error'
                        : selectedIncident.severity === 'moderate'
                        ? 'text-amber-400'
                        : 'text-primary'
                    }`}
                  >
                    {selectedIncident.severity === 'high'
                      ? 'Critical Hazard Alert'
                      : selectedIncident.severity === 'moderate'
                      ? 'Moderate Hazard Notice'
                      : 'Unverified Incident'}
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant font-mono">
                  {selectedIncident.reportedTime}
                </span>
              </div>

              <div className="mt-2 space-y-2">
                <div className="font-display font-semibold text-sm text-on-surface">
                  {selectedIncident.title}
                </div>
                <div className="grid grid-cols-2 gap-2 py-2 bg-surface-container rounded-lg px-3 border border-outline-variant/40">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase block">
                      Water Depth
                    </span>
                    <span
                      className={`text-sm font-display font-bold ${
                        selectedIncident.severity === 'high' ? 'text-error' : 'text-amber-400'
                      }`}
                    >
                      ~{selectedIncident.depth}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase block">
                      Status
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      {selectedIncident.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                  {selectedIncident.trafficImpact}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-outline-variant/40">
                <span className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-tertiary">
                    verified
                  </span>{' '}
                  {selectedIncident.verifiedCount} Confirms
                </span>
                <Link
                  href="/risk-map"
                  className="text-primary text-xs font-semibold hover:underline flex items-center gap-0.5"
                >
                  Drilldown <span className="material-symbols-outlined text-xs">chevron_right</span>
                </Link>
              </div>
            </div>

            {/* Floating Map Utility Dock (Bottom Right) */}
            <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-1 bg-surface-container-low border border-outline-variant rounded-lg p-1 shadow-lg z-20">
              <Link
                href="/risk-map"
                className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface"
                title="Open Interactive Full Map"
              >
                <span className="material-symbols-outlined text-sm">fullscreen</span>
              </Link>
              <div className="w-px h-5 bg-outline-variant mx-1"></div>
              <button
                onClick={() => setActivePinId('#FLD-084')}
                className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface"
                title="Recenter"
              >
                <span className="material-symbols-outlined text-sm">my_location</span>
              </button>
            </div>
          </div>

          {/* Banner Note */}
          <div className="rounded-lg bg-surface-container border border-outline-variant px-4 py-3 flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary-container mt-0.5 text-base">
              info
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface font-semibold">Notice:</strong> Risk assessments and
              hazard alerts rely on community submissions and public meteorological telemetry. Always
              obey municipal emergency directives and local transit road closures.
            </p>
          </div>
        </section>

        {/* How it Works / 3-Step Feature Overview Grid */}
        <section className="space-y-4 pt-2">
          <div className="space-y-1">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">
              Protocol Pipeline
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-on-surface">
              How HydroWatch Functions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 Card */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-outline transition-colors shadow-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-primary font-bold">
                  01
                </div>
                <h3 className="text-base font-display font-bold text-on-surface">
                  1. Citizen Ground Reports
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Locals report standing water, clogged storm sewers, or submerged underpasses
                  directly from mobile devices with geo-tagged verification photos.
                </p>
              </div>
              <div className="pt-3 border-t border-outline-variant/50 flex items-center gap-1.5 text-xs text-secondary">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>Sub-second ingestion pipeline</span>
              </div>
            </div>

            {/* Step 2 Card */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-outline transition-colors shadow-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-secondary-container font-bold">
                  02
                </div>
                <h3 className="text-base font-display font-bold text-on-surface">
                  2. AI & Sensor Validation
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Incoming crowd data is cross-referenced with ultrasonic canal depth gauges, sewer
                  outflow sensors, and municipal weather radar stations.
                </p>
              </div>
              <div className="pt-3 border-t border-outline-variant/50 flex items-center gap-1.5 text-xs text-secondary">
                <span className="material-symbols-outlined text-sm">hub</span>
                <span>Multi-source consensus checking</span>
              </div>
            </div>

            {/* Step 3 Card */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-outline transition-colors shadow-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-tertiary font-bold">
                  03
                </div>
                <h3 className="text-base font-display font-bold text-on-surface">
                  3. Safe Route Advisory
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Commuters calculate elevation-safe navigation trajectories avoiding deep
                  corridors, reducing stalled emergency response vehicles in key transit veins.
                </p>
              </div>
              <div className="pt-3 border-t border-outline-variant/50 flex items-center gap-1.5 text-xs text-tertiary">
                <span className="material-symbols-outlined text-sm">route</span>
                <span>Dynamic flood-aware routing</span>
              </div>
            </div>
          </div>
        </section>

        {/* Operational System Status Callout */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-xl">sensors</span>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm sm:text-base text-on-surface">
                Telemetry Gateway Online
              </h4>
              <p className="text-xs text-on-surface-variant">
                Monitoring 142 hydrological stations across Delta Basin Zone 4. Ingest latency
                410ms.
              </p>
            </div>
          </div>
          <Link
            href="/officials"
            className="px-4 py-2 rounded-md border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors whitespace-nowrap"
          >
            View Sensor Telemetry
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
