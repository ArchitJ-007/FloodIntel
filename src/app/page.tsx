'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { useIncidents, type Incident } from '@/context/IncidentContext';
import { LocationSearchBox } from '@/components/LocationSearchBox';
import MapplsInteractiveMap, {
  isValidLatLng,
  type MapplsLatLng,
  type MapplsMapMarker,
  type MapplsMarkerTone,
} from '@/components/MapplsInteractiveMap';
import type { PlaceResult } from '@/lib/places';

// Demo-view center: Koramangala basin, matching the seeded demo incident cluster.
const DEMO_MAP_CENTER: MapplsLatLng = { lat: 12.9352, lng: 77.6245 };
const DEMO_MAP_ZOOM = 13;
const FOCUS_ZOOM = 15;

function incidentMarkerTone(incident: Incident): MapplsMarkerTone {
  if (incident.verificationStatus === 'unverified') return 'unverified';
  if (incident.severity === 'high') return 'high';
  if (incident.severity === 'moderate') return 'moderate';
  return 'low';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function LandingPage() {
  const { stats, incidents } = useIncidents();
  const [activePinId, setActivePinId] = useState<string>('#FLD-084');
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // Controlled Mappls map view — recentering only happens for explicit view changes
  // (search, quick jump, recenter button), never as a side effect of panning/zooming.
  const [mapView, setMapView] = useState<{ center: MapplsLatLng; zoom: number; recenterKey: number }>({
    center: DEMO_MAP_CENTER,
    zoom: DEMO_MAP_ZOOM,
    recenterKey: 0,
  });
  // Point picked directly on the real map (genuine SDK-reported coordinates).
  const [pickedPoint, setPickedPoint] = useState<MapplsLatLng | null>(null);

  const selectedIncident =
    incidents.find((i) => i.id === activePinId) || incidents[0];

  // Hazard markers are plotted strictly from genuine incident record coordinates.
  const incidentMarkers: MapplsMapMarker[] = incidents
    .filter((incident) => isValidLatLng(incident.coordinates))
    .map((incident) => ({
      id: incident.id,
      lat: incident.coordinates.lat,
      lng: incident.coordinates.lng,
      tone: incidentMarkerTone(incident),
      label: `${incident.id} · ${incident.title}`,
      popupHtml: `<div style="font-size:11px;line-height:1.45;max-width:190px"><strong>${escapeHtml(
        incident.id
      )}</strong>${incident.provenance === 'demo' ? ' <em>[DEMO]</em>' : ''}<br/>${escapeHtml(
        incident.title
      )}<br/><span style="opacity:.7">${incident.location
        .split('(')[0]
        .slice(0, 60)
        .replace(/</g, '')}</span></div>`,
      onSelect: () => setActivePinId(incident.id),
    }));

  const focusMapOn = (center: MapplsLatLng, zoom: number) => {
    setMapView((prev) => ({ center, zoom, recenterKey: prev.recenterKey + 1 }));
  };

  const handleMapPointSelect = (coords: MapplsLatLng) => {
    // Coordinates are reported by the Mappls SDK click/tap event — never derived from CSS.
    setPickedPoint(coords);
  };

  const handleRecenterMap = () => {
    if (pickedPoint) {
      focusMapOn(pickedPoint, FOCUS_ZOOM);
      return;
    }
    if (selectedPlace) {
      focusMapOn({ lat: selectedPlace.lat, lng: selectedPlace.lng }, FOCUS_ZOOM);
      return;
    }
    if (isValidLatLng(selectedIncident?.coordinates)) {
      focusMapOn(
        { lat: selectedIncident.coordinates.lat, lng: selectedIncident.coordinates.lng },
        FOCUS_ZOOM
      );
      return;
    }
    setMapView((prev) => ({ ...prev, center: DEMO_MAP_CENTER, zoom: DEMO_MAP_ZOOM, recenterKey: prev.recenterKey + 1 }));
  };

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

            {/* Live Location Search Control */}
            <div className="pt-2 max-w-2xl space-y-3">
              <div className="bg-surface-container border border-outline-variant rounded-xl p-3.5 shadow-lg">
                <label className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">travel_explore</span>
                  <span>Search Any City, District or Road in India</span>
                </label>
                <LocationSearchBox
                  id="landing-place-search"
                  placeholder="Enter city or locality (e.g. Mumbai, Delhi, Pune, Chennai, Silk Board)..."
                  onSelect={(place) => {
                    setSelectedPlace(place);
                    setPickedPoint(null);
                    if (isValidLatLng({ lat: place.lat, lng: place.lng })) {
                      focusMapOn({ lat: place.lat, lng: place.lng }, FOCUS_ZOOM);
                    }
                  }}
                  inputClassName="bg-surface-container-low"
                />

                {/* Popular Quick-Select Cities */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-outline-variant/40 text-xs">
                  <span className="text-[10px] uppercase font-mono text-outline shrink-0">
                    Quick Jump:
                  </span>
                  {[
                    { name: 'Mumbai', lat: 19.076, lng: 72.8777, state: 'Maharashtra' },
                    { name: 'Delhi', lat: 28.6139, lng: 77.209, state: 'Delhi' },
                    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
                    { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
                    { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
                    { name: 'Hyderabad', lat: 17.385, lng: 78.4867, state: 'Telangana' },
                  ].map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => {
                        const preset: PlaceResult = {
                          id: `preset-${city.name.toLowerCase()}`,
                          name: city.name,
                          formattedAddress: `${city.name}, ${city.state}, India`,
                          lat: city.lat,
                          lng: city.lng,
                          countryCode: 'IN',
                          state: city.state,
                          source: 'curated',
                        };
                        setSelectedPlace(preset);
                        setPickedPoint(null);
                        focusMapOn({ lat: city.lat, lng: city.lng }, 11);
                      }}
                      className="px-2 py-0.5 rounded-full bg-surface-container-high hover:bg-primary/20 hover:text-primary border border-outline-variant text-[11px] font-medium text-on-surface-variant transition-colors"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Location Target Actions */}
              {selectedPlace && (
                <div className="p-3.5 rounded-xl bg-surface-container-high border border-primary/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">
                        pin_drop
                      </span>
                      <strong className="text-sm font-display text-on-surface">
                        {selectedPlace.name}
                      </strong>
                      {selectedPlace.state && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container border border-outline-variant text-on-surface-variant">
                          {selectedPlace.state}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant font-mono">
                      GPS: {selectedPlace.lat.toFixed(4)}° N, {selectedPlace.lng.toFixed(4)}° E
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link
                      href={`/risk-map?lat=${selectedPlace.lat}&lng=${selectedPlace.lng}&label=${encodeURIComponent(
                        selectedPlace.name
                      )}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all shadow-md"
                    >
                      <span className="material-symbols-outlined text-sm">map</span>
                      <span>View Risk Map</span>
                    </Link>
                    <Link
                      href={`/plan-journey?fromLat=${selectedPlace.lat}&fromLng=${selectedPlace.lng}&fromName=${encodeURIComponent(
                        selectedPlace.name
                      )}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">alt_route</span>
                      <span>Plan Route</span>
                    </Link>
                    <Link
                      href={`/report-hazard?lat=${selectedPlace.lat}&lng=${selectedPlace.lng}&location=${encodeURIComponent(
                        selectedPlace.formattedAddress
                      )}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-xs font-semibold text-error hover:bg-surface-container-highest transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">crisis_alert</span>
                      <span>Report</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

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
                    {stats.underReview} awaiting review
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
                  <span className="text-xs text-error font-medium">
                    {stats.unverified} citizen reports
                  </span>
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
                  <span className="text-xs text-tertiary font-medium">
                    {stats.totalToday} total in session
                  </span>
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-display font-bold text-on-surface">
                  Monsoon Hazard Canvas
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">
                  LIVE MAPPLS MAP
                </span>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Real Mappls vector map. Every pin is plotted from its incident record&apos;s genuine
                latitude/longitude — seeded demo records are labelled DEMO.
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

          {/* Map Frame Canvas — real Mappls interactive vector map */}
          <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-outline-variant bg-[#070e17] shadow-xl">
            <MapplsInteractiveMap
              center={mapView.center}
              zoom={mapView.zoom}
              recenterKey={mapView.recenterKey}
              markers={incidentMarkers}
              selectedMarker={pickedPoint}
              onMapClick={handleMapPointSelect}
              heightClassName="h-[460px]"
              ariaLabel="Mappls interactive map of reported hazard locations"
            />

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
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display font-semibold text-sm text-on-surface">
                    {selectedIncident.title}
                  </div>
                  {selectedIncident.provenance === 'demo' && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/40">
                      DEMO
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-outline">
                  {selectedIncident.coordinates.lat.toFixed(5)}° N,{' '}
                  {selectedIncident.coordinates.lng.toFixed(5)}° E
                </p>
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
                  href={`/risk-map?lat=${selectedIncident.coordinates.lat}&lng=${selectedIncident.coordinates.lng}&label=${encodeURIComponent(
                    selectedIncident.location
                  )}`}
                  className="text-primary text-xs font-semibold hover:underline flex items-center gap-0.5"
                >
                  Drilldown <span className="material-symbols-outlined text-xs">chevron_right</span>
                </Link>
              </div>
            </div>

            {/* Map-click selection chip — actions carry the genuine picked coordinates */}
            {pickedPoint && (
              <div className="absolute top-4 right-4 z-30 w-64 rounded-xl border border-primary/40 bg-surface-container-low/95 p-3 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Map point selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickedPoint(null)}
                    className="text-outline hover:text-on-surface p-0.5"
                    aria-label="Clear selected map point"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <p className="mt-1 text-[11px] font-mono text-on-surface-variant">
                  {pickedPoint.lat.toFixed(5)}° N, {pickedPoint.lng.toFixed(5)}° E
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Link
                    href={`/report-hazard?lat=${pickedPoint.lat}&lng=${pickedPoint.lng}&location=${encodeURIComponent(
                      `Map point ${pickedPoint.lat.toFixed(5)}, ${pickedPoint.lng.toFixed(5)}`
                    )}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">crisis_alert</span>
                    Report here
                  </Link>
                  <Link
                    href={`/risk-map?lat=${pickedPoint.lat}&lng=${pickedPoint.lng}&label=${encodeURIComponent(
                      'Selected map point'
                    )}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">map</span>
                    Risk Map
                  </Link>
                </div>
              </div>
            )}

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
                type="button"
                onClick={handleRecenterMap}
                className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface"
                title="Recenter on selected hazard or point"
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
                  2. Open-Meteo & Risk Scoring
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Incoming crowd data is scored against Open-Meteo precipitation telemetry, roadway vulnerability factors, and community corroborations.
                </p>
              </div>
              <div className="pt-3 border-t border-outline-variant/50 flex items-center gap-1.5 text-xs text-secondary">
                <span className="material-symbols-outlined text-sm">hub</span>
                <span>Deterministic risk scoring</span>
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
              <div className="flex items-center gap-2">
                <h4 className="font-display font-bold text-sm sm:text-base text-on-surface">
                  Data Pipeline Active
                </h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/30 font-mono font-bold">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Connected to Open-Meteo meteorological telemetry, Mappls search, and OSRM routing. {stats.activeHazards} active hazard reports indexed in session.
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
