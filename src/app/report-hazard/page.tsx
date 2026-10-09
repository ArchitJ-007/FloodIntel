'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { useIncidents, HazardCategory, SeverityType } from '@/context/IncidentContext';
import {
  validateHazardReport,
  detectDuplicateReport,
  DuplicateMatchInfo,
} from '@/lib/reportingValidation';
import { LocationSearchBox } from '@/components/LocationSearchBox';

function ReportHazardContent() {
  const { addHazard, incidents } = useIncidents();
  const searchParams = useSearchParams();

  const paramLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const paramLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
  const paramLocation = searchParams.get('location') || null;

  // Form states (F-33: Clean initial states with no fake prefilled values)
  const [location, setLocation] = useState(paramLocation || '');
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(
    paramLat !== null && !isNaN(paramLat) && paramLng !== null && !isNaN(paramLng)
      ? { lat: paramLat, lng: paramLng }
      : null
  );

  const [gpsCoordinates, setGpsCoordinates] = useState(
    paramLat !== null && paramLng !== null
      ? `GPS: ${paramLat.toFixed(4)}° N, ${paramLng.toFixed(4)}° E • India`
      : 'Coordinates not yet acquired. Select a verified location above or use device GPS.'
  );

  useEffect(() => {
    if (paramLat !== null && paramLng !== null && !isNaN(paramLat) && !isNaN(paramLng)) {
      setReportCoords({ lat: paramLat, lng: paramLng });
      setGpsCoordinates(`GPS: ${paramLat.toFixed(4)}° N, ${paramLng.toFixed(4)}° E • India`);
    }
    if (paramLocation) {
      setLocation(paramLocation);
    }
  }, [paramLat, paramLng, paramLocation]);

  const [hazardType, setHazardType] = useState<HazardCategory>('waterlogging');
  const [severity, setSeverity] = useState<SeverityType>('moderate');
  const [waterDepth, setWaterDepth] = useState<'curb' | 'knee' | 'deep'>('knee');
  const [description, setDescription] = useState('');
  const [reporterMode, setReporterMode] = useState<'anonymous' | 'notify'>('anonymous');
  const [contact, setContact] = useState('');

  // Local photo attachment state (F-12)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  // Mini map pin position state
  const [pinPosition, setPinPosition] = useState({ x: 50, y: 50 });

  // AI Incident Classification state
  const [aiClassification, setAiClassification] = useState<any | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  const handleClassify = async () => {
    if (!description.trim()) return;
    setIsClassifying(true);
    setClassificationError(null);

    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          userCategory: hazardType,
          userSeverity: severity,
        }),
      });

      if (!res.ok) throw new Error('Classification request failed');
      const data = await res.json();
      setAiClassification(data);
    } catch {
      setClassificationError('AI classification temporarily unavailable.');
    } finally {
      setIsClassifying(false);
    }
  };

  const applyAiSuggestions = () => {
    if (!aiClassification) return;

    // Apply category
    if (aiClassification.suggestedCategory === 'drain_overflow') {
      setHazardType('drainage_failure');
    } else if (aiClassification.suggestedCategory === 'underpass_flooding') {
      setHazardType('flooded_road');
    } else if (aiClassification.suggestedCategory === 'road_closed') {
      setHazardType('blocked_road');
    } else {
      setHazardType('waterlogging');
    }

    // Apply severity
    if (aiClassification.suggestedSeverity === 'severe') {
      setSeverity('high');
    } else if (aiClassification.suggestedSeverity === 'moderate') {
      setSeverity('moderate');
    } else {
      setSeverity('low');
    }

    // Apply depth
    if (aiClassification.extractedDepthCm !== null) {
      if (aiClassification.extractedDepthCm >= 50) setWaterDepth('deep');
      else if (aiClassification.extractedDepthCm >= 20) setWaterDepth('knee');
      else setWaterDepth('curb');
    }
  };

  // Submission & Validation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [possibleDuplicate, setPossibleDuplicate] = useState<DuplicateMatchInfo | null>(null);

  const submitReport = async (overrideDuplicate = false) => {
    setErrors({});
    setGeneralError(null);
    setIsSubmitting(true);

    if (!reportCoords) {
      setErrors({ coordinates: 'Location coordinates are required. Please search and select a verified address from suggestions or enable device GPS.' });
      setIsSubmitting(false);
      return;
    }

    // Derive coordinates relative to selected Indian location
    const lat = Number((reportCoords.lat + (50 - pinPosition.y) * 0.0004).toFixed(5));
    const lng = Number((reportCoords.lng + (pinPosition.x - 50) * 0.0004).toFixed(5));

    // 1. Client-Side Validation
    const clientValidation = validateHazardReport({
      location,
      hazardType,
      severity,
      waterDepth,
      description,
      reporterMode,
      contact,
      coordinates: { lat, lng },
    });

    if (!clientValidation.isValid) {
      setErrors(clientValidation.errors);
      setIsSubmitting(false);
      return;
    }

    // 2. Duplicate Detection Check
    if (!overrideDuplicate) {
      const dupCheck = detectDuplicateReport(
        {
          coordinates: { lat, lng },
          hazardType,
          description,
          location,
        },
        incidents
      );

      if (dupCheck.isDuplicateCandidate && dupCheck.match) {
        setPossibleDuplicate(dupCheck.match);
        setIsSubmitting(false);
        return;
      }
    }

    // 3. Server-Side Validation Endpoint Check
    try {
      const res = await fetch('/api/reports/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: clientValidation.sanitized!.location,
          hazardType,
          severity,
          waterDepth,
          description: clientValidation.sanitized!.description,
          reporterMode,
          contact,
          coordinates: { lat, lng },
          activeIncidents: incidents,
        }),
      });

      const serverResult = await res.json();
      if (!res.ok) {
        if (serverResult.fieldErrors) {
          setErrors(serverResult.fieldErrors);
        } else {
          setGeneralError(serverResult.error || 'Server validation failed.');
        }
        setIsSubmitting(false);
        return;
      }

      if (
        !overrideDuplicate &&
        serverResult.duplicateCheck?.isDuplicateCandidate &&
        serverResult.duplicateCheck.match
      ) {
        setPossibleDuplicate(serverResult.duplicateCheck.match);
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      console.warn('Server validation check unavailable, proceeding with verified client validation:', e);
    }

    // 4. Register Incident in IncidentContext
    const incident = addHazard({
      location: clientValidation.sanitized!.location,
      hazardType,
      severity,
      waterDepth,
      description: clientValidation.sanitized!.description,
      reporterMode,
      contact: reporterMode === 'notify' ? contact : undefined,
      coordinates: { lat, lng },
    });

    setCreatedIncidentId(incident.id);
    setPossibleDuplicate(null);
    setIsSubmitting(false);
    setShowSuccessToast(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReport(false);
  };

  const handleUseGps = () => {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latVal = Number(pos.coords.latitude.toFixed(4));
          const lngVal = Number(pos.coords.longitude.toFixed(4));
          setReportCoords({ lat: latVal, lng: lngVal });
          setGpsCoordinates(`GPS: ${latVal}° N, ${lngVal}° E • Acquired via Device GPS`);
          setLocation(`Device GPS Acquired Location (${latVal}, ${lngVal})`);
        },
        () => {
          setGpsCoordinates('GPS acquisition unavailable. Please use the location search bar above.');
        }
      );
    } else {
      setGpsCoordinates('GPS acquisition unavailable on this device.');
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

          {/* Success Banner if submitted (PRD F-07: Truthful persistence wording) */}
          {showSuccessToast && createdIncidentId && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-tertiary-container/50 flex items-start justify-between gap-4 shadow-2xl animate-in fade-in slide-in-from-top-2" role="status" aria-live="polite">
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
                      Report Saved on this Device
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-highest text-primary">
                      LOCAL DEVICE PERSISTENCE
                    </span>
                  </div>
                  <p className="text-xs text-on-surface">
                    Report <span className="font-mono font-bold text-primary">{createdIncidentId}</span> has
                    been saved on this browser device. It is unverified and is not shared with other users or remote municipal dispatchers.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <Link
                      href={`/risk-map?lat=${reportCoords?.lat ?? 12.9352}&lng=${reportCoords?.lng ?? 77.6245}&label=${encodeURIComponent(location || 'Reported Incident')}`}
                      className="text-primary hover:underline font-semibold"
                    >
                      View on Risk Map →
                    </Link>
                    <span className="text-outline">•</span>
                    <Link href="/officials" className="text-secondary hover:underline font-semibold">
                      Inspect in Officials Console →
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
                  Street Address / Landmark (Nationwide India Search)
                </label>
                <LocationSearchBox
                  id="location-query"
                  placeholder="Search street name, landmark, or Indian city (e.g. Mumbai, Delhi, Silk Board)..."
                  initialValue={location}
                  icon="location_on"
                  iconColor="text-primary"
                  onSelect={(place) => {
                    setLocation(place.formattedAddress || place.name);
                    setGpsCoordinates(
                      `GPS: ${place.lat.toFixed(4)}° N, ${place.lng.toFixed(4)}° E • ${place.state || 'India'}`
                    );
                    setReportCoords({ lat: place.lat, lng: place.lng });
                    setErrors((prev) => ({ ...prev, location: '', coordinates: '' }));
                    setPossibleDuplicate(null);
                  }}
                  onClearOrInvalidate={() => {
                    setReportCoords(null);
                    setGpsCoordinates('Coordinates unresolved. Please select a verified suggestion from the search list.');
                    setPossibleDuplicate(null);
                  }}
                  inputClassName="bg-[#122131] border-[#222F44]"
                />
                {errors.location && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{errors.location}</span>
                  </p>
                )}
                {errors.coordinates && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{errors.coordinates}</span>
                  </p>
                )}
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
                <div className="flex items-center justify-between">
                  <label htmlFor="incident-notes" className="block text-xs font-semibold text-on-surface">
                    Detailed Observation
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDescription('Water is accumulating rapidly near the railway underpass. Sedans are getting stuck. Drainage appears completely clogged.');
                      setPossibleDuplicate(null);
                    }}
                    className="text-[11px] text-primary hover:underline font-mono"
                  >
                    + Fill Sample Scenario (Demo)
                  </button>
                </div>
                <textarea
                  id="incident-notes"
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (possibleDuplicate) setPossibleDuplicate(null);
                  }}
                  className="w-full bg-[#122131] border border-[#222F44] rounded-lg p-3 text-xs sm:text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary custom-scroll"
                  placeholder="Describe trapped vehicles, overflowing drains, or blockage extent..."
                />
                <div className="flex justify-between items-center text-[11px] text-outline">
                  <span>Be specific about direction of travel and blocked choke points.</span>
                  <span className="font-mono">{description.length} / 500 characters</span>
                </div>
                {errors.description && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{errors.description}</span>
                  </p>
                )}

                {/* AI Assistant Classification Trigger & Suggestion Card */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleClassify}
                      disabled={isClassifying || !description.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-secondary/40 text-secondary hover:bg-secondary/10 text-xs font-semibold transition-all disabled:opacity-40"
                    >
                      <span
                        className={`material-symbols-outlined text-sm ${isClassifying ? 'animate-spin' : ''}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isClassifying ? 'sync' : 'auto_awesome'}
                      </span>
                      <span>{isClassifying ? 'Analyzing with Gemini...' : 'Analyze Description with AI'}</span>
                    </button>
                    <span className="text-[10px] text-outline font-mono">
                      Editable Suggestion • Non-binding
                    </span>
                  </div>

                  {classificationError && (
                    <div className="mt-2 p-2 rounded bg-error/15 border border-error/30 text-[11px] text-error flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{classificationError}</span>
                    </div>
                  )}

                  {aiClassification && (
                    <div className="mt-3 p-3.5 rounded-xl bg-surface-container border border-secondary-container/50 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                        <div className="flex items-center gap-2">
                          <span
                            className="material-symbols-outlined text-secondary text-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            smart_toy
                          </span>
                          <span className="text-xs font-bold text-secondary">
                            AI-Suggested Parameters
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant">
                            {Math.round(aiClassification.confidence * 100)}% Confidence
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                            aiClassification.generatedBy === 'gemini'
                              ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                              : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                          }`}
                        >
                          {aiClassification.generatedBy === 'gemini' ? 'Gemini AI' : 'Deterministic Template'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2 rounded bg-surface-container-low border border-outline-variant/40">
                          <span className="text-[10px] uppercase font-mono text-outline block">
                            Suggested Type
                          </span>
                          <strong className="text-on-surface capitalize">
                            {aiClassification.suggestedCategory.replace(/_/g, ' ')}
                          </strong>
                        </div>
                        <div className="p-2 rounded bg-surface-container-low border border-outline-variant/40">
                          <span className="text-[10px] uppercase font-mono text-outline block">
                            Suggested Severity
                          </span>
                          <strong
                            className={
                              aiClassification.suggestedSeverity === 'severe'
                                ? 'text-error'
                                : aiClassification.suggestedSeverity === 'moderate'
                                ? 'text-amber-400'
                                : 'text-primary'
                            }
                          >
                            {aiClassification.suggestedSeverity.toUpperCase()}
                          </strong>
                        </div>
                        <div className="p-2 rounded bg-surface-container-low border border-outline-variant/40">
                          <span className="text-[10px] uppercase font-mono text-outline block">
                            Extracted Depth
                          </span>
                          <strong className="text-on-surface">
                            {aiClassification.extractedDepthCm !== null
                              ? `≈ ${aiClassification.extractedDepthCm} cm`
                              : 'Not specified in text'}
                          </strong>
                        </div>
                      </div>

                      {/* Warnings / Contradictions */}
                      {aiClassification.warnings && aiClassification.warnings.length > 0 && (
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-0.5">
                          {aiClassification.warnings.map((w: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-1">
                              <span className="material-symbols-outlined text-xs shrink-0 mt-0.5">
                                warning
                              </span>
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Apply Button & Disclaimer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-outline">
                          Does not auto-verify reports; you retain full control before submission.
                        </span>
                        <button
                          type="button"
                          onClick={applyAiSuggestions}
                          className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          <span>Apply AI Suggestions to Form</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Functional Local Photo Evidence Upload (PRD F-12) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface">
                  Photo / Visual Evidence (Local Session Only)
                </label>
                
                {photoPreviewUrl ? (
                  <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={photoPreviewUrl}
                      alt="Selected waterlogging evidence"
                      className="w-24 h-24 object-cover rounded-lg border border-outline-variant shrink-0"
                    />
                    <div className="flex-1 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface truncate max-w-[200px]">
                          {photoFile?.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-highest text-primary">
                          {photoFile ? `${(photoFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Stored locally in this browser session. Remote storage service is not configured.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                          setPhotoFile(null);
                          setPhotoPreviewUrl(null);
                        }}
                        className="text-error hover:underline text-[11px] font-semibold flex items-center gap-1 pt-1"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        Remove attached photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#334155] hover:border-primary/60 rounded-xl p-5 bg-[#0d1c2d]/60 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        setPhotoError(null);
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          setPhotoError('Invalid file format. Please upload JPEG, PNG, or WebP image.');
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          setPhotoError(`File exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
                          return;
                        }
                        setPhotoFile(file);
                        setPhotoPreviewUrl(URL.createObjectURL(file));
                      }}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl">photo_camera</span>
                    </div>
                    <p className="text-xs text-on-surface font-medium">
                      Select photo of waterlogging <span className="text-on-surface-variant font-normal">(Max 10MB)</span>
                    </p>
                    <p className="text-[11px] text-outline mt-0.5">
                      Click to browse or drag file (JPEG, PNG, WebP)
                    </p>
                  </label>
                )}

                {photoError && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{photoError}</span>
                  </p>
                )}
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

            {/* General Server/Validation Error Banner (F-24) */}
            {generalError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3 rounded-lg bg-error/15 border border-error/40 text-xs text-error flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{generalError}</span>
              </div>
            )}

            {/* Possible Duplicate Warning Card (F-24) */}
            {possibleDuplicate && (
              <div
                role="alert"
                aria-live="polite"
                className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-xs space-y-3 animate-in fade-in"
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-400 text-xl shrink-0 mt-0.5">
                    warning
                  </span>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-amber-400 uppercase tracking-wide">
                        Possible Duplicate Report Identified
                      </h4>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                        {possibleDuplicate.id}
                      </span>
                    </div>
                    <p className="text-on-surface leading-relaxed">
                      A similar active report (<strong>{possibleDuplicate.title}</strong>) was recorded at {possibleDuplicate.location} approximately {possibleDuplicate.minutesAgo} minutes ago within {possibleDuplicate.distanceM} meters ({possibleDuplicate.reason}).
                    </p>
                    <p className="text-on-surface-variant text-[11px]">
                      To maintain dispatch clarity, please review if this describes the same waterlogging or represents a distinct obstruction.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                  <Link
                    href="/risk-map"
                    className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant hover:border-primary text-primary font-semibold text-xs transition-colors"
                  >
                    Review Existing on Map
                  </Link>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => submitReport(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Distinct Hazard Observation Anyway'}
                  </button>
                </div>
              </div>
            )}

            {/* ================= SUBMISSION FOOTER ================= */}
            <div className="pt-4 border-t border-[#222F44] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-tertiary text-xs font-medium">
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span>Citizen report is verified client-side before dispatch ingestion.</span>
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
                  <span className={`material-symbols-outlined text-base ${isSubmitting ? 'animate-spin' : ''}`}>
                    {isSubmitting ? 'sync' : 'send'}
                  </span>
                  <span>{isSubmitting ? 'Validating & Ingesting...' : 'Submit Report'}</span>
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

export default function ReportHazardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-on-surface-variant font-mono text-xs">
          Loading Report Form...
        </div>
      }
    >
      <ReportHazardContent />
    </Suspense>
  );
}
