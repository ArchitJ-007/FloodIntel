'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { TopNavBar } from '@/components/TopNavBar';
import { SeverityBadge } from '@/components/SeverityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useIncidents, Incident } from '@/context/IncidentContext';

export default function RiskMapPage() {
  const { incidents, selectedIncident, setSelectedIncidentId, stats } = useIncidents();

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
  const [timeWindow, setTimeWindow] = useState('3h');

  // Layer toggles
  const [showRadar, setShowRadar] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sharedAlertMessage, setSharedAlertMessage] = useState<string | null>(null);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Severity
      if (!severityFilter[incident.severity]) return false;

      // Status
      if (statusFilter !== 'All Statuses' && incident.status !== statusFilter) return false;

      // Zone
      if (zoneFilter !== 'All Zones' && !incident.zone.includes(zoneFilter.replace(' (', '')))
        return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = incident.id.toLowerCase().includes(query);
        const matchesTitle = incident.title.toLowerCase().includes(query);
        const matchesLoc = incident.location.toLowerCase().includes(query);
        if (!matchesId && !matchesTitle && !matchesLoc) return false;
      }

      return true;
    });
  }, [incidents, severityFilter, statusFilter, zoneFilter, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSeverityFilter({ high: true, moderate: true, low: true, cleared: true });
    setStatusFilter('All Statuses');
    setZoneFilter('All Zones');
    setTimeWindow('3h');
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
          {/* Search Input */}
          <div className="relative flex-1 max-w-2xl">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-lg">search</span>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search streets, landmarks, or zones (e.g. Sector 4, Metro Underpass)..."
              className="w-full pl-9 pr-12 py-1.5 bg-surface border border-outline-variant rounded-md text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-[38px] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2 flex items-center pr-2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
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

            {/* Weather Telemetry Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container-high border border-outline-variant text-xs text-on-surface">
              <span className="material-symbols-outlined text-secondary text-base">rainy</span>
              <span className="font-mono">
                Rainfall: <strong className="text-secondary font-bold">42mm/hr</strong>
              </span>
              <span className="text-outline-variant">•</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-error/20 text-error border border-error/30 uppercase tracking-wide">
                Risk: Elevated
              </span>
            </div>
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
                    <span className="font-mono text-xs font-semibold text-primary">
                      Report ID {selectedIncident.id}
                    </span>
                    <h3 className="font-display font-semibold text-sm text-on-surface mt-0.5">
                      {selectedIncident.title}
                    </h3>
                  </div>
                  <SeverityBadge severity={selectedIncident.severity} />
                </div>

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

          {/* Secondary Queue Snippet for quick switching */}
          <div className="p-4 pt-0 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">
                Nearby Incident Feeds ({filteredIncidents.length})
              </span>
            </div>
            <div className="space-y-2">
              {filteredIncidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id;
                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-surface-container-highest border-primary'
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
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Large Map Canvas (~70% width) */}
        <div className="flex-1 relative bg-[#070e17] h-[650px] lg:h-[calc(100vh-112px)] overflow-hidden select-none">
          {/* SVG Cartography Vector Base */}
          <div
            className="absolute inset-0 w-full h-full transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            <svg
              className="w-full h-full opacity-90"
              preserveAspectRatio="none"
              viewBox="0 0 1000 700"
            >
              <defs>
                <pattern
                  id="risk-tactical-grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#142132" strokeWidth="0.8" />
                  <circle cx="40" cy="40" r="1.2" fill="#1f334d" />
                </pattern>
                <linearGradient id="canalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0e3a5d" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#114b78" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0b2c47" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="riskRadarPulse" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Grid Background */}
              <rect width="1000" height="700" fill="url(#risk-tactical-grid)" />

              {/* Central River / Canal Polyline */}
              <path
                d="M -30,220 C 180,180 320,310 490,290 C 660,270 820,420 1030,380"
                fill="none"
                stroke="url(#canalGrad)"
                strokeWidth="42"
                strokeLinecap="round"
              />
              <path
                d="M -30,220 C 180,180 320,310 490,290 C 660,270 820,420 1030,380"
                fill="none"
                stroke="#2272a8"
                strokeWidth="3.5"
                strokeDasharray="12 6"
              />
              <path
                d="M 490,290 C 530,450 610,580 720,720"
                fill="none"
                stroke="#0e3a5d"
                strokeWidth="22"
                strokeLinecap="round"
              />

              {/* Major Expressways */}
              <line x1="0" y1="140" x2="1000" y2="140" stroke="#1f2f45" strokeWidth="7" />
              <line x1="0" y1="520" x2="1000" y2="520" stroke="#1f2f45" strokeWidth="7" />
              <line x1="360" y1="0" x2="360" y2="700" stroke="#1f2f45" strokeWidth="7" />
              <line x1="780" y1="0" x2="780" y2="700" stroke="#1f2f45" strokeWidth="7" />

              {/* Diagonals */}
              <path d="M 80,-20 L 760,720" stroke="#253a54" strokeWidth="5" />
              <path d="M 940,-20 L 460,720" stroke="#253a54" strokeWidth="5" />

              {/* Secondary Street Network */}
              <g stroke="#152233" strokeWidth="2.5">
                <line x1="0" y1="280" x2="1000" y2="280" />
                <line x1="0" y1="390" x2="1000" y2="390" />
                <line x1="0" y1="630" x2="1000" y2="630" />
                <line x1="180" y1="0" x2="180" y2="700" />
                <line x1="560" y1="0" x2="560" y2="700" />
                <line x1="910" y1="0" x2="910" y2="700" />
              </g>

              {/* Weather Radar Cloud Polygon (Toggleable) */}
              {showRadar && (
                <g className="transition-opacity duration-300">
                  <polygon
                    className="opacity-70 blur-md"
                    fill="url(#riskRadarPulse)"
                    points="320,180 580,140 720,320 540,460 310,380"
                  />
                  <polygon
                    className="opacity-60 blur-md"
                    fill="url(#riskRadarPulse)"
                    points="680,110 920,130 890,360 700,280"
                  />
                </g>
              )}

              {/* Traffic Heatmap (Toggleable) */}
              {showTraffic && (
                <g opacity="0.6">
                  <path d="M 0,140 L 1000,140" stroke="#ef4444" strokeWidth="5" strokeDasharray="8 4" />
                  <path d="M 360,0 L 360,700" stroke="#f59e0b" strokeWidth="5" strokeDasharray="8 4" />
                </g>
              )}

              {/* Sector Boundaries */}
              <circle
                cx="460"
                cy="320"
                r="220"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.2"
                strokeDasharray="6 4"
                opacity="0.3"
              />
              <circle
                cx="780"
                cy="280"
                r="180"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.2"
                strokeDasharray="6 4"
                opacity="0.3"
              />
            </svg>

            {/* Tactical HUD Sector Labels */}
            <div className="absolute top-[125px] left-[380px] text-[10px] font-mono text-outline uppercase tracking-widest bg-surface/80 px-1.5 py-0.5 rounded border border-outline-variant/40">
              Metropolitan Route 10 Expressway
            </div>
            <div className="absolute top-[505px] left-[520px] text-[10px] font-mono text-outline uppercase tracking-widest bg-surface/80 px-1.5 py-0.5 rounded border border-outline-variant/40">
              Grand Union Canal Spillway
            </div>
            <div className="absolute top-[260px] left-[120px] text-[10px] font-mono text-secondary/70 uppercase tracking-widest">
              Sector 4 East Drainage
            </div>
            <div className="absolute top-[370px] left-[780px] text-[10px] font-mono text-error/70 uppercase tracking-widest">
              Basin 12 Rapid Overflow Zone
            </div>
          </div>

          {/* Interactive Incident Pins on Map Canvas */}
          {filteredIncidents.map((incident) => {
            const isSelected = selectedIncident?.id === incident.id;
            const x = incident.coordinates.xPercent;
            const y = incident.coordinates.yPercent;

            return (
              <div
                key={incident.id}
                onClick={() => setSelectedIncidentId(incident.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {/* Ping waves if High Severity */}
                {incident.severity === 'high' && (
                  <>
                    <span className="absolute -inset-2.5 rounded-full bg-error/30 animate-ping-slow pointer-events-none"></span>
                    <span className="absolute -inset-5 rounded-full bg-error/15 animate-pulse pointer-events-none"></span>
                  </>
                )}

                {/* Pin Container */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`px-2 py-0.5 font-mono font-bold text-[10px] sm:text-[11px] rounded shadow-xl flex items-center gap-1 transition-all ${
                      incident.severity === 'high'
                        ? 'bg-error text-white border border-white/40'
                        : incident.severity === 'moderate'
                        ? 'bg-amber-500 text-black border border-amber-300'
                        : incident.severity === 'low'
                        ? 'bg-primary text-on-primary border border-white/30'
                        : 'bg-tertiary-container text-on-tertiary border border-tertiary/40'
                    } ${isSelected ? 'scale-110 ring-2 ring-white shadow-2xl' : ''}`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {incident.severity === 'high'
                        ? 'waves'
                        : incident.severity === 'moderate'
                        ? 'water_loss'
                        : incident.severity === 'low'
                        ? 'help_outline'
                        : 'check_circle'}
                    </span>
                    <span>{incident.id}</span>
                  </div>

                  {/* Pointer beacon */}
                  <div
                    className={`w-3.5 h-3.5 rotate-45 -mt-1.5 rounded-xs ${
                      incident.severity === 'high'
                        ? 'bg-error'
                        : incident.severity === 'moderate'
                        ? 'bg-amber-500'
                        : incident.severity === 'low'
                        ? 'bg-primary'
                        : 'bg-tertiary-container'
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full bg-white -mt-1 shadow-md ring-2 ${
                      incident.severity === 'high'
                        ? 'ring-error'
                        : incident.severity === 'moderate'
                        ? 'ring-amber-500'
                        : 'ring-primary'
                    }`}
                  ></div>
                </div>

                {/* Marker Tooltip on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col bg-surface-container-high border border-outline-variant p-2 rounded-md shadow-2xl min-w-[180px] pointer-events-none z-40">
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      incident.severity === 'high'
                        ? 'text-error'
                        : incident.severity === 'moderate'
                        ? 'text-amber-400'
                        : 'text-primary'
                    }`}
                  >
                    {incident.severity.toUpperCase()} • {incident.depth}
                  </span>
                  <span className="text-xs text-on-surface font-semibold line-clamp-1">
                    {incident.title}
                  </span>
                  <span className="text-[10px] text-outline mt-0.5">Click to lock inspection</span>
                </div>
              </div>
            );
          })}

          {/* Top-Right Floating Controls (Layer toggles, GPS, Zoom) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
            {/* Map Overlay Toggles */}
            <div className="bg-surface-container/95 backdrop-blur-md border border-outline-variant rounded-lg p-2 shadow-xl flex flex-col gap-1.5">
              <label className="flex items-center justify-between gap-3 text-xs text-on-surface hover:text-white cursor-pointer px-1">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-sm">cloud</span>
                  Radar Overlay
                </span>
                <input
                  type="checkbox"
                  checked={showRadar}
                  onChange={(e) => setShowRadar(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary bg-surface h-3.5 w-3.5"
                />
              </label>
              <div className="h-px bg-outline-variant/50"></div>
              <label className="flex items-center justify-between gap-3 text-xs text-on-surface hover:text-white cursor-pointer px-1">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-sm">traffic</span>
                  Traffic Heatmap
                </span>
                <input
                  type="checkbox"
                  checked={showTraffic}
                  onChange={(e) => setShowTraffic(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary bg-surface h-3.5 w-3.5"
                />
              </label>
            </div>

            {/* Zoom & Re-center widget */}
            <div className="bg-surface-container/95 backdrop-blur-md border border-outline-variant rounded-lg p-1 shadow-xl flex flex-col items-center">
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 0.2, 1.8))}
                className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded text-base transition-colors"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
              <div className="w-5 h-px bg-outline-variant/60"></div>
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 0.2, 0.8))}
                className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded text-base transition-colors"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <div className="w-5 h-px bg-outline-variant/60"></div>
              <button
                onClick={() => setZoomLevel(1)}
                className="w-8 h-8 flex items-center justify-center text-primary hover:bg-surface-container-highest rounded transition-colors"
                title="Reset zoom"
                aria-label="Reset zoom"
              >
                <span className="material-symbols-outlined text-sm">my_location</span>
              </button>
            </div>
          </div>

          {/* Bottom-Left Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-surface-container/95 backdrop-blur-md border border-outline-variant rounded-xl p-3 shadow-2xl z-30 max-w-xs hidden sm:block">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60 mb-2">
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">layers</span>
                Risk Severity Legend
              </span>
              <span className="text-[10px] text-outline font-mono">EDP-9 Live</span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-error border border-white/30 shrink-0"></span>
                <span className="text-on-surface">Red: <strong className="text-error font-semibold">High (&gt;2 ft)</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 border border-white/30 shrink-0"></span>
                <span className="text-on-surface">Amber: <strong className="text-amber-400 font-semibold">Moderate</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary border border-white/30 shrink-0"></span>
                <span className="text-on-surface">Blue: <strong className="text-primary font-semibold">Unverified</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary border border-white/30 shrink-0"></span>
                <span className="text-on-surface">Green: <strong className="text-tertiary font-semibold">Cleared</strong></span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[10px] text-outline">
              <span>Telemetry sync: 15s</span>
              <span className="text-secondary underline cursor-pointer">Zone Matrix</span>
            </div>
          </div>

          {/* Floating 'Plan a Journey' Shortcut Button on Map bottom-right */}
          <div className="absolute bottom-4 right-4 z-30">
            <Link
              href="/plan-journey"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs sm:text-sm shadow-2xl border border-primary-fixed/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="w-6 h-6 rounded-md bg-on-primary/20 flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-base">alt_route</span>
              </span>
              <span>Plan Safe Route</span>
              <span className="material-symbols-outlined text-sm ml-0.5">arrow_forward</span>
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
