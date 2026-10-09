'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { useIncidents, HazardCategory, SeverityType } from '@/context/IncidentContext';

export default function ReportHazardPage() {
  const { addHazard } = useIncidents();

  // Form states
  const [location, setLocation] = useState('4th Cross Rd & 80ft Road Junction, Koramangala');
  const [gpsCoordinates, setGpsCoordinates] = useState('GPS: 12.9348° N, 77.6205° E • Sector 4 Basin');
  const [hazardType, setHazardType] = useState<HazardCategory>('waterlogging');
  const [severity, setSeverity] = useState<SeverityType>('high');
  const [waterDepth, setWaterDepth] = useState<'curb' | 'knee' | 'deep'>('knee');
  const [description, setDescription] = useState(
    'Water is accumulating rapidly near the railway underpass. Sedans are getting stuck. Drainage appears completely clogged.'
  );
  const [reporterMode, setReporterMode] = useState<'anonymous' | 'notify'>('notify');
  const [contact, setContact] = useState('ops.citizen.ward4@floodintel.org');

  // Mini map pin position state
  const [pinPosition, setPinPosition] = useState({ x: 50, y: 50 });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const incident = addHazard({
        location,
        hazardType,
        severity,
        waterDepth,
        description,
        reporterMode,
        contact: reporterMode === 'notify' ? contact : undefined,
      });

      setCreatedIncidentId(incident.id);
      setIsSubmitting(false);
      setShowSuccessToast(true);
    }, 700);
  };

  const handleUseGps = () => {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          setGpsCoordinates(`GPS: ${lat}° N, ${lng}° E • Sector 4 Basin`);
          setLocation(`Current Geo-Tagged Location (${lat}, ${lng})`);
        },
        () => {
          setGpsCoordinates('GPS: 12.9352° N, 77.6241° E (Device Location Acquired)');
        }
      );
    } else {
      setGpsCoordinates('GPS: 12.9352° N, 77.6241° E (Device Location Acquired)');
    }
  };

  return (
    <div className="bg-[#0B1120] text-on-surface antialiased min-h-screen flex flex-col font-sans">
      <TopNavBar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          {/* 1. Page Header Cluster */}
          <div className="space-y-3 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-[11px] font-semibold text-primary">
              <span className="material-symbols-outlined text-[15px]">shield</span>
              <span>PUBLIC SAFETY CITIZEN PORTAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-on-surface tracking-tight">
              Submit Hazard Incident Report
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
              Help your community stay safe during rainfall and storm events. Submissions are reviewed by
              monitoring teams and synchronized with municipal sensors.
            </p>

            {/* Alert Notice Banner */}
            <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant flex items-start gap-3">
              <span
                className="material-symbols-outlined text-secondary mt-0.5 text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
              <div className="text-xs text-on-surface-variant leading-relaxed">
                <strong className="text-secondary font-semibold">Note:</strong> Submitted reports are tagged
                as <span className="text-on-surface font-semibold">Unverified</span> and require
                cross-correlation before confirmation on the official dispatch channel.
              </div>
            </div>
          </div>

          {/* Success Banner if submitted */}
          {showSuccessToast && createdIncidentId && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-tertiary-container/50 flex items-start justify-between gap-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-tertiary/15 border border-tertiary/30 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-tertiary">
                      Live Incident Created Successfully!
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-highest text-primary">
                      DISPATCH QUEUED
                    </span>
                  </div>
                  <p className="text-xs text-on-surface">
                    Report <span className="font-mono font-bold text-primary">{createdIncidentId}</span> has
                    been registered and added to Sector 4 Triage Queue.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <Link href="/risk-map" className="text-primary hover:underline font-semibold">
                      View on Risk Map →
                    </Link>
                    <span className="text-outline">•</span>
                    <Link href="/officials" className="text-secondary hover:underline font-semibold">
                      Inspect in Officials Dashboard →
                    </Link>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="text-outline hover:text-on-surface p-1"
                aria-label="Dismiss banner"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {/* 2. Form Card (#151E2E surface, #222F44 border) */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#151E2E] border border-[#222F44] rounded-xl p-5 md:p-8 space-y-7 shadow-2xl"
            id="report-form"
          >
            {/* ================= SECTION 1: LOCATION DETAILS ================= */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#222F44]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-surface-container-highest text-primary flex items-center justify-center text-xs font-bold font-mono">
                    1
                  </span>
                  <h2 className="text-sm sm:text-base font-display font-semibold text-on-surface">
                    Location Details
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">
                  Required Step
                </span>
              </div>

              {/* Location Search Field */}
              <div className="space-y-1.5">
                <label htmlFor="location-query" className="block text-xs font-semibold text-on-surface">
                  Street Address / Landmark
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg">
                    search
                  </span>
                  <input
                    id="location-query"
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter street name, cross street, or landmark..."
                    className="w-full bg-[#122131] border border-[#222F44] rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Mini Interactive Map Pin Selector Container */}
              <div className="relative rounded-lg overflow-hidden border border-[#222F44] bg-[#051424]">
                <div
                  className="relative h-64 w-full cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setPinPosition({ x, y });
                  }}
                >
                  {/* SVG Map Tile Simulation */}
                  <svg
                    className="w-full h-full opacity-80"
                    preserveAspectRatio="none"
                    viewBox="0 0 800 300"
                  >
                    <defs>
                      <pattern id="mini-map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#122131" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="800" height="300" fill="#07121f" />
                    <rect width="800" height="300" fill="url(#mini-map-grid)" />
                    {/* Canal */}
                    <path
                      d="M 0 160 C 200 130, 400 220, 800 180"
                      fill="none"
                      stroke="#0f3c5f"
                      strokeWidth="28"
                    />
                    {/* Road Network */}
                    <line x1="0" y1="80" x2="800" y2="80" stroke="#1f2f45" strokeWidth="4" />
                    <line x1="0" y1="220" x2="800" y2="220" stroke="#1f2f45" strokeWidth="4" />
                    <line x1="280" y1="0" x2="280" y2="300" stroke="#1f2f45" strokeWidth="4" />
                    <line x1="520" y1="0" x2="520" y2="300" stroke="#1f2f45" strokeWidth="4" />
                    <path d="M 120 0 L 680 300" stroke="#253a54" strokeWidth="3" />
                  </svg>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151E2E] via-transparent to-transparent opacity-80 pointer-events-none"></div>

                  {/* Interactive Pin Marker */}
                  <div
                    className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-all duration-200"
                    style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
                  >
                    <div className="animate-bounce">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-8 h-8 rounded-full bg-error/30 animate-ping"></span>
                        <span
                          className="material-symbols-outlined text-[32px] text-error drop-shadow-md"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          location_pin
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#1E293B] border border-[#334155] px-2 py-0.5 rounded text-[10px] font-semibold text-on-surface shadow-lg mt-0.5 whitespace-nowrap">
                      Pinned Coordinate
                    </div>
                  </div>

                  {/* Map Floating Controls */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPinPosition({ x: 50, y: 50 })}
                      className="w-7 h-7 rounded bg-[#1E293B] border border-[#334155] text-on-surface hover:text-primary flex items-center justify-center shadow"
                      title="Center Pin"
                    >
                      <span className="material-symbols-outlined text-sm">my_location</span>
                    </button>
                  </div>

                  {/* Click precision hint */}
                  <div className="absolute bottom-3 left-3 bg-[#151E2E]/90 backdrop-blur-sm border border-[#222F44] px-2.5 py-1 rounded-md text-[11px] text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-secondary">
                      touch_app
                    </span>
                    <span>Click anywhere on canvas to reposition coordinate pin</span>
                  </div>
                </div>

                {/* Coordinate Info & GPS trigger Footer */}
                <div className="p-3 bg-[#0d1c2d] border-t border-[#222F44] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-primary text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      pin_drop
                    </span>
                    <div>
                      <div className="text-xs text-on-surface font-semibold">{location}</div>
                      <div className="text-[11px] text-outline font-mono">{gpsCoordinates}</div>
                    </div>
                  </div>

                  {/* GPS Button */}
                  <button
                    type="button"
                    onClick={handleUseGps}
                    className="inline-flex items-center justify-center gap-1.5 bg-transparent border border-[#222F44] text-on-surface hover:bg-[#1E293B] hover:border-[#334155] px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-secondary">near_me</span>
                    <span>Use Current GPS Location</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ================= SECTION 2: HAZARD CLASSIFICATION ================= */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#222F44]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-surface-container-highest text-primary flex items-center justify-center text-xs font-bold font-mono">
                    2
                  </span>
                  <h2 className="text-sm sm:text-base font-display font-semibold text-on-surface">
                    Hazard Classification
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">
                  Parameters
                </span>
              </div>

              {/* Hazard Type Selector Chips */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-on-surface">
                  Hazard Incident Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { type: 'waterlogging', label: 'Waterlogging', icon: 'water_damage' },
                    { type: 'flooded_road', label: 'Flooded Road', icon: 'traffic' },
                    { type: 'blocked_road', label: 'Blocked Road', icon: 'block' },
                    { type: 'drainage_failure', label: 'Drainage Failure', icon: 'plumbing' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setHazardType(item.type as HazardCategory)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center ${
                        hazardType === item.type
                          ? 'bg-surface-container-highest border-primary text-primary shadow-sm'
                          : 'bg-[#122131] border-[#222F44] text-on-surface-variant hover:border-[#334155] hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl mb-1">{item.icon}</span>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Selection Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-on-surface">
                    Severity Level
                  </label>
                  <span className="text-[11px] text-outline">Traffic & Infrastructure Impact</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Low */}
                  <div
                    onClick={() => setSeverity('low')}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      severity === 'low'
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-[#222F44] bg-[#122131] hover:border-slate-500'
                    }`}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                      {severity === 'low' && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">info</span>
                        <span className="text-xs font-semibold text-primary">Low</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Minor pooling, passable for all traffic.
                      </p>
                    </div>
                  </div>

                  {/* Moderate */}
                  <div
                    onClick={() => setSeverity('moderate')}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      severity === 'moderate'
                        ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400'
                        : 'border-[#222F44] bg-[#122131] hover:border-amber-500/50'
                    }`}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full border border-amber-400 flex items-center justify-center">
                      {severity === 'moderate' && (
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-400">
                          warning
                        </span>
                        <span className="text-xs font-semibold text-amber-400">Moderate</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Significant water, slow traffic, risky for 2-wheelers.
                      </p>
                    </div>
                  </div>

                  {/* High */}
                  <div
                    onClick={() => setSeverity('high')}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      severity === 'high'
                        ? 'border-red-500 bg-error/15 ring-1 ring-red-500'
                        : 'border-[#222F44] bg-[#122131] hover:border-red-500/50'
                    }`}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full border border-red-400 flex items-center justify-center">
                      {severity === 'high' && (
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="material-symbols-outlined text-sm text-red-400"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          report
                        </span>
                        <span className="text-xs font-semibold text-red-400">High</span>
                      </div>
                      <p className="text-[11px] text-red-200">
                        Deep water &gt;1.5 ft, completely impassable, vehicle trapped.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimated Water Depth */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-on-surface">
                  Estimated Water Depth
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'curb', label: 'Curb Level (<6 in)' },
                    { id: 'knee', label: 'Knee Level (1-2 ft)' },
                    { id: 'deep', label: 'Deep Water (>2 ft)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setWaterDepth(item.id as 'curb' | 'knee' | 'deep')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        waterDepth === item.id
                          ? 'border-primary bg-surface-container-highest text-primary font-semibold shadow-sm'
                          : 'border-[#222F44] bg-[#122131] hover:border-[#334155] text-on-surface-variant font-medium'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ================= SECTION 3: INCIDENT DESCRIPTION & PROOF ================= */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#222F44]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-surface-container-highest text-primary flex items-center justify-center text-xs font-bold font-mono">
                    3
                  </span>
                  <h2 className="text-sm sm:text-base font-display font-semibold text-on-surface">
                    Incident Description & Proof
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">
                  Verification Evidence
                </span>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <label htmlFor="incident-notes" className="block text-xs font-semibold text-on-surface">
                  Detailed Observation
                </label>
                <textarea
                  id="incident-notes"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#122131] border border-[#222F44] rounded-lg p-3 text-xs sm:text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary custom-scroll"
                  placeholder="Describe trapped vehicles, overflowing drains, or blockage extent..."
                />
                <div className="flex justify-between items-center text-[11px] text-outline">
                  <span>Be specific about direction of travel and blocked choke points.</span>
                  <span className="font-mono">{description.length} / 500 characters</span>
                </div>
              </div>

              {/* Drag and Drop Evidence Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-on-surface">
                  Optional Photo / Evidence Upload
                </label>
                <label className="border-2 border-dashed border-[#334155] hover:border-primary/60 rounded-xl p-5 bg-[#0d1c2d]/60 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                  <input type="file" accept="image/*" className="hidden" />
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </div>
                  <p className="text-xs text-on-surface font-medium">
                    Upload photo of waterlogging <span className="text-on-surface-variant font-normal">(Max 10MB)</span>
                  </p>
                  <p className="text-[11px] text-outline mt-0.5">
                    Drag and drop or browse files (JPEG, PNG, HEIC)
                  </p>
                </label>
              </div>

              {/* Reporter Contact */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Reporter Identification & Updates
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setReporterMode('anonymous')}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      reporterMode === 'anonymous'
                        ? 'border-primary bg-surface-container-highest'
                        : 'border-[#222F44] bg-[#122131] hover:border-[#334155]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reporter_mode"
                      checked={reporterMode === 'anonymous'}
                      onChange={() => setReporterMode('anonymous')}
                      className="text-primary focus:ring-0"
                    />
                    <span className="text-xs text-on-surface font-medium">Remain Anonymous</span>
                  </div>

                  <div
                    onClick={() => setReporterMode('notify')}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      reporterMode === 'notify'
                        ? 'border-primary bg-surface-container-highest'
                        : 'border-[#222F44] bg-[#122131] hover:border-[#334155]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reporter_mode"
                      checked={reporterMode === 'notify'}
                      onChange={() => setReporterMode('notify')}
                      className="text-primary focus:ring-0"
                    />
                    <div className="text-xs text-on-surface">
                      <span className="font-medium">Notify me on status update</span>
                      <span className="block text-[11px] text-outline">(email/phone)</span>
                    </div>
                  </div>
                </div>

                {reporterMode === 'notify' && (
                  <div className="pt-1.5 animate-in fade-in">
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Enter email or mobile for dispatch confirmation..."
                      className="w-full bg-[#122131] border border-[#222F44] rounded-lg px-3 py-2 text-xs sm:text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* ================= SUBMISSION FOOTER ================= */}
            <div className="pt-4 border-t border-[#222F44] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-tertiary text-xs font-medium">
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span>All required fields completed. Ready for dispatch ingestion.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/"
                  className="w-1/2 sm:w-auto px-5 py-2.5 rounded-lg border border-[#222F44] hover:bg-[#1E293B] hover:border-[#334155] text-on-surface text-xs font-semibold text-center transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 sm:w-auto px-7 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-opacity-95 font-display text-xs sm:text-sm font-bold tracking-wide shadow-lg shadow-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>{isSubmitting ? 'Ingesting Report...' : 'Submit Report'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
