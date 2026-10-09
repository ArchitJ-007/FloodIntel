'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident } from '@/context/IncidentContext';

interface InteractiveFloodMapProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [12.9352, 77.6245]; // Koramangala, Bangalore (Demo city)
const DEFAULT_ZOOM = 13;

export default function InteractiveFloodMap({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}: InteractiveFloodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [tileError, setTileError] = useState<string | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false, // Custom position
        attributionControl: false, // Custom position
        minZoom: 4,
        maxZoom: 19,
      });

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add attribution bottom-right
      L.control
        .attribution({
          position: 'bottomright',
          prefix: false,
        })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>')
        .addTo(map);

      // Create layer group for markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;

      // Initial resize invalidation to prevent grey tile seams in flex containers
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      // Handle window resizing
      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err: any) {
      console.error('Leaflet initialization error:', err);
    }
  }, []);

  // Fly to new center when center coordinate prop updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && center && center.length === 2) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center[0], center[1], zoom]);

  // Update Tile Layer when mapTheme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    setTileError(null);

    const cartoKey =
      process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_4f0k_1_3dd561391d386020585e0750';
    const keyParam = cartoKey ? `?key=${cartoKey}` : '';

    const tileUrl =
      mapTheme === 'dark'
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png${keyParam}`
        : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${keyParam}`;

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    });

    newTileLayer.on('tileerror', () => {
      setTileError('Street tiles temporarily unavailable from provider; retrying...');
    });

    newTileLayer.on('tileload', () => {
      setTileError(null);
    });

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [mapTheme]);

  // Create custom DOM Marker using L.divIcon
  const createIncidentIcon = useCallback(
    (incident: Incident, isSelected: boolean) => {
      const isHigh = incident.riskCategory === 'high';
      const isMod = incident.riskCategory === 'moderate';
      const isLow = incident.riskCategory === 'low';

      const bgClass = isHigh
        ? 'bg-error text-white border-error shadow-error/40'
        : isMod
        ? 'bg-amber-500 text-black border-amber-300 shadow-amber-500/40'
        : isLow
        ? 'bg-primary text-black border-primary shadow-primary/40'
        : 'bg-slate-600 text-white border-slate-400 shadow-slate-600/40';

      const pulseWave = isHigh
        ? '<span class="absolute -inset-2.5 rounded-full bg-error/35 animate-ping pointer-events-none"></span>'
        : '';

      const isDemo = incident.provenance === 'demo';
      const scoreBadge = incident.riskScore !== null ? `${incident.riskScore}` : 'N/A';

      const iconSymbol = isHigh
        ? 'waves'
        : isMod
        ? 'water_loss'
        : incident.severity === 'cleared'
        ? 'check_circle'
        : 'info';

      const scaleClass = isSelected
        ? 'scale-125 ring-4 ring-white shadow-2xl z-50'
        : 'hover:scale-110';

      const html = `
        <div class="relative flex flex-col items-center group cursor-pointer transition-all ${scaleClass}">
          ${pulseWave}
          <div class="relative px-2 py-0.5 rounded font-mono font-bold text-[10px] sm:text-[11px] border shadow-lg flex items-center gap-1.5 ${bgClass}">
            <span class="material-symbols-outlined text-[13px]">${iconSymbol}</span>
            <span>${scoreBadge}</span>
            ${isDemo ? '<span class="bg-black/40 text-[8px] px-1 rounded uppercase tracking-wider">DEMO</span>' : ''}
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1 ${isHigh ? 'bg-error' : isMod ? 'bg-amber-500' : isLow ? 'bg-primary' : 'bg-slate-600'}"></div>
        </div>
      `;

      return L.divIcon({
        className: 'leaflet-custom-div-icon',
        html,
        iconSize: [64, 32],
        iconAnchor: [32, 28],
        popupAnchor: [0, -28],
      });
    },
    []
  );

  // Update Markers when incidents or selectedIncidentId change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    incidents.forEach((incident) => {
      const { lat, lng } = incident.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

      const isSelected = incident.id === selectedIncidentId;
      const icon = createIncidentIcon(incident, isSelected);

      const marker = L.marker([lat, lng], { icon });

      // Click handler
      marker.on('click', () => {
        onSelectIncident(incident.id);
      });

      // Accessible Popup
      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 180px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #0284c7; font-family: monospace;">${incident.id}</strong>
            ${incident.provenance === 'demo' ? '<span style="background: #e2e8f0; color: #475569; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold;">DEMO DATA</span>' : ''}
          </div>
          <div style="font-weight: 600; margin-bottom: 3px; line-height: 1.2;">${incident.title}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${incident.location}</div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 11px;">
            <span>Depth: <strong>${incident.depth}</strong></span>
            <span>Risk: <strong>${incident.riskScore !== null ? `${incident.riskScore}/100` : 'Unknown'}</strong></span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'floodintel-custom-popup',
      });

      markersLayer.addLayer(marker);
    });
  }, [incidents, selectedIncidentId, onSelectIncident, createIncidentIcon]);

  // Pan map to selected incident when selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIncidentId) return;

    const selected = incidents.find((i) => i.id === selectedIncidentId);
    if (selected && typeof selected.coordinates.lat === 'number' && typeof selected.coordinates.lng === 'number') {
      map.panTo([selected.coordinates.lat, selected.coordinates.lng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [selectedIncidentId, incidents]);

  // Reset View handler
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  };

  const hasDemoIncidents = incidents.some((i) => i.provenance === 'demo');

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden select-none bg-[#070e17]">
      {/* 1. Persistent Demo Data Banner (PRD Section 3.0 & FR-MAP-14) */}
      {hasDemoIncidents && (
        <div className="absolute top-3 left-4 right-14 sm:right-auto sm:max-w-xl z-[1000] bg-surface-container-high/95 backdrop-blur-md border border-primary/40 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2 text-xs">
          <span className="material-symbols-outlined text-secondary text-base shrink-0">
            science
          </span>
          <div className="flex-1 text-[11px] text-on-surface leading-tight">
            <strong className="text-secondary font-mono uppercase mr-1">[DEMO DATA]</strong>
            Displaying simulated hydrologic test incidents. Synthetic telemetry is never presented as confirmed ground truth.
          </div>
        </div>
      )}

      {/* 2. Tile Loading Error Notice */}
      {tileError && (
        <div className="absolute top-14 left-4 z-[1000] bg-error/90 text-white rounded-md px-3 py-1.5 text-xs shadow-lg flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-sm">cloud_off</span>
          <span>{tileError}</span>
        </div>
      )}

      {/* 3. Empty State Notice when 0 incidents match filters (without removing map) */}
      {incidents.length === 0 && (
        <div className="absolute inset-0 z-[1000] bg-surface-container-lowest/60 backdrop-blur-[2px] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-surface-container border border-outline-variant p-5 rounded-xl shadow-2xl max-w-sm text-center space-y-2 pointer-events-auto">
            <span className="material-symbols-outlined text-3xl text-secondary">
              water_drop
            </span>
            <h3 className="font-display font-semibold text-sm text-on-surface">
              No Waterlogging Reports In View
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              No active incidents match the current filters. That does not guarantee roads are clear.
            </p>
          </div>
        </div>
      )}

      {/* 4. Tactical Map Floating Controls */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        {/* Reset / Center View Button */}
        <button
          onClick={handleResetView}
          className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface hover:text-primary hover:border-primary flex items-center justify-center shadow-lg transition-colors"
          title="Recenter city view"
          aria-label="Recenter map view"
        >
          <span className="material-symbols-outlined text-lg">my_location</span>
        </button>

        {/* Tile Theme Toggle (CARTO Dark Matter vs CARTO Voyager) */}
        <button
          onClick={() => setMapTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface hover:text-primary hover:border-primary flex items-center justify-center shadow-lg transition-colors"
          title={`Switch to ${mapTheme === 'dark' ? 'Light (CARTO Voyager)' : 'Dark (CARTO Dark Matter)'} Tiles`}
          aria-label="Toggle map tile theme"
        >
          <span className="material-symbols-outlined text-lg">
            {mapTheme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* 5. Collapsible Map Legend (PRD FR-MAP-13) */}
      <div className="absolute bottom-6 left-4 z-[1000]">
        {isLegendOpen ? (
          <div className="bg-surface-container-high/95 backdrop-blur-md border border-outline-variant rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[210px]">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
              <span className="font-semibold text-on-surface text-[11px] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">legend_toggle</span>
                Risk Legend
              </span>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="text-outline hover:text-on-surface p-0.5"
                title="Collapse legend"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-error inline-block"></span>
                  <span>High Risk (67–100)</span>
                </span>
                <span className="material-symbols-outlined text-xs text-error">waves</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                  <span>Moderate (34–66)</span>
                </span>
                <span className="material-symbols-outlined text-xs text-amber-400">water_loss</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                  <span>Low Risk (0–33)</span>
                </span>
                <span className="material-symbols-outlined text-xs text-primary">info</span>
              </div>
              <div className="flex items-center justify-between text-outline border-t border-outline-variant/40 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-slate-500 inline-block"></span>
                  <span>[DEMO] Tag</span>
                </span>
                <span className="text-[10px] font-mono">Synthetic</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsLegendOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-high/90 border border-outline-variant text-on-surface text-xs font-semibold hover:border-primary flex items-center gap-1.5 shadow-lg"
          >
            <span className="material-symbols-outlined text-sm text-primary">legend_toggle</span>
            <span>Legend</span>
          </button>
        )}
      </div>

      {/* 6. Leaflet Map Container Div */}
      <div ref={mapContainerRef} className="w-full h-full" tabIndex={0} />
    </div>
  );
}
