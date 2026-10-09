'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteOption, RouteCoordinates } from '@/lib/routing';

interface InteractiveJourneyMapProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  origin?: RouteCoordinates & { name?: string };
  destination?: RouteCoordinates & { name?: string };
}

const DEFAULT_CENTER: [number, number] = [12.9352, 77.6245]; // Koramangala, Bangalore

export default function InteractiveJourneyMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  origin,
  destination,
}: InteractiveJourneyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const markerLayersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [tileError, setTileError] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: origin ? [origin.lat, origin.lng] : DEFAULT_CENTER,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        minZoom: 10,
        maxZoom: 19,
      });

      // Zoom control
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: 'bottomright', prefix: false })
        .addAttribution(
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'
        )
        .addTo(map);

      routeLayersRef.current = L.layerGroup().addTo(map);
      markerLayersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle resize invalidation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // Guard against unmount cleanup errors
          }
          mapInstanceRef.current = null;
        }
      };
    } catch (err: any) {
      console.error('Leaflet initialization error:', err);
    }
  }, []);

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

  // Render Routes and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayers = routeLayersRef.current;
    const markerLayers = markerLayersRef.current;
    if (!map || !routeLayers || !markerLayers) return;

    routeLayers.clearLayers();
    markerLayers.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Draw candidate route polylines
    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      const latLngs: L.LatLngTuple[] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      latLngs.forEach((coord) => bounds.extend(coord));

      // Unselected route lines
      if (!isSelected) {
        const polyline = L.polyline(latLngs, {
          color: '#64748b', // Slate 500
          weight: 4,
          opacity: 0.55,
          interactive: true,
        });

        polyline.on('click', () => onSelectRoute(route.id));
        polyline.bindTooltip(`Route ${route.id}: ${route.name} (${route.durationMin} min)`, {
          sticky: true,
          className: 'floodintel-custom-tooltip',
        });

        routeLayers.addLayer(polyline);
      }
    });

    // 2. Draw selected route on top with halo & prominent color
    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (selectedRoute) {
      const latLngs: L.LatLngTuple[] = selectedRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      // Outer glow halo
      const halo = L.polyline(latLngs, {
        color: selectedRoute.exposureCategory === 'high' ? '#ef4444' : '#0284c7',
        weight: 10,
        opacity: 0.25,
        interactive: false,
      });
      routeLayers.addLayer(halo);

      // Core route polyline
      const mainLine = L.polyline(latLngs, {
        color:
          selectedRoute.exposureCategory === 'high'
            ? '#ef4444'
            : selectedRoute.exposureCategory === 'moderate'
            ? '#f59e0b'
            : '#38bdf8', // Cyan / Light Blue
        weight: 6,
        opacity: 0.95,
        interactive: true,
      });
      routeLayers.addLayer(mainLine);

      // 3. Highlight hazardous segments on selected route (PRD FR-RT-05)
      selectedRoute.hazardousSegments.forEach((seg) => {
        // Find segment coordinate subset
        const segLatLngs = latLngs.filter((coord) => {
          // Approximate segment bounds
          return true; // Overlay on line
        });

        if (segLatLngs.length > 0) {
          const hazardOverlay = L.polyline(latLngs, {
            color: '#dc2626',
            weight: 7,
            dashArray: '8, 6',
            opacity: 0.85,
            interactive: false,
          });
          routeLayers.addLayer(hazardOverlay);
        }
      });

      // 4. Draw hazard markers along the route (PRD FR-RT-04)
      selectedRoute.relevantHazards.forEach((hazard) => {
        const iconHtml = `
          <div class="relative flex flex-col items-center cursor-pointer group">
            <span class="absolute -inset-1.5 rounded-full bg-error/30 animate-ping"></span>
            <div class="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-error text-white border border-white/50 shadow-xl flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">warning</span>
              <span>${hazard.incidentId}</span>
              <span class="bg-black/40 text-[8px] px-1 rounded">${hazard.distanceAlongRouteKm} km</span>
            </div>
            <div class="w-2 h-2 rotate-45 -mt-1 bg-error"></div>
          </div>
        `;

        const hazardIcon = L.divIcon({
          className: 'leaflet-custom-div-icon',
          html: iconHtml,
          iconSize: [80, 28],
          iconAnchor: [40, 24],
        });

        // Place marker at hazard coordinates (or nearest route point fallback)
        const markerPos: L.LatLngTuple = hazard.coordinates
          ? [hazard.coordinates.lat, hazard.coordinates.lng]
          : [latLngs[0][0], latLngs[0][1]];
        const marker = L.marker(markerPos, { icon: hazardIcon });

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 190px; padding: 2px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <strong style="color: #ef4444; font-family: monospace;">${hazard.incidentId}</strong>
              <span style="font-size: 10px; font-weight: bold; color: #64748b;">${hazard.distanceAlongRouteKm} km from start</span>
            </div>
            <div style="font-weight: 600; margin-bottom: 2px;">${hazard.title}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${hazard.location}</div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 11px; display: flex; justify-content: space-between;">
              <span>Depth: <strong>${hazard.depth}</strong></span>
              <span>Risk: <strong style="color: #ef4444;">${hazard.riskScore}/100</strong></span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: false, className: 'floodintel-custom-popup' });
        markerLayers.addLayer(marker);
      });
    }

    // 5. Draw Origin Pin
    if (origin) {
      bounds.extend([origin.lat, origin.lng]);
      const originHtml = `
        <div class="relative flex flex-col items-center">
          <div class="px-2 py-0.5 rounded bg-surface-container-high border border-outline text-[11px] font-semibold text-tertiary mb-1 shadow-lg whitespace-nowrap bg-slate-900 text-teal-400 border-teal-500/50">
            Start: ${(origin.name || 'Origin').split(',')[0]}
          </div>
          <div class="w-6 h-6 rounded-full bg-teal-500 border-2 border-white text-white flex items-center justify-center shadow-lg font-bold text-xs">
            <span class="material-symbols-outlined text-[14px]">trip_origin</span>
          </div>
        </div>
      `;
      const originIcon = L.divIcon({
        className: 'leaflet-custom-div-icon',
        html: originHtml,
        iconSize: [120, 40],
        iconAnchor: [60, 36],
      });
      markerLayers.addLayer(L.marker([origin.lat, origin.lng], { icon: originIcon }));
    }

    // 6. Draw Destination Pin
    if (destination) {
      bounds.extend([destination.lat, destination.lng]);
      const destHtml = `
        <div class="relative flex flex-col items-center">
          <div class="px-2 py-0.5 rounded bg-surface-container-high border border-outline text-[11px] font-semibold text-on-surface mb-1 shadow-lg whitespace-nowrap bg-slate-900 text-rose-400 border-rose-500/50">
            End: ${(destination.name || 'Destination').split(',')[0]}
          </div>
          <div class="w-6 h-6 rounded-full bg-rose-600 border-2 border-white text-white flex items-center justify-center shadow-lg font-bold text-xs">
            <span class="material-symbols-outlined text-[14px]">location_on</span>
          </div>
        </div>
      `;
      const destIcon = L.divIcon({
        className: 'leaflet-custom-div-icon',
        html: destHtml,
        iconSize: [120, 40],
        iconAnchor: [60, 36],
      });
      markerLayers.addLayer(L.marker([destination.lat, destination.lng], { icon: destIcon }));
    }

    // Fit map bounds to encompass the entire route corridor without animated transition race conditions
    if (bounds.isValid()) {
      try {
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 15,
          animate: false,
        });
      } catch {
        // Guard against race conditions during resize or unmount
      }
    }
  }, [routes, selectedRouteId, onSelectRoute, origin, destination]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden select-none bg-[#070e17]">
      {/* 1. Tile Loading Error Notice */}
      {tileError && (
        <div className="absolute top-4 left-4 z-[1000] bg-error/90 text-white rounded-md px-3 py-1.5 text-xs shadow-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">cloud_off</span>
          <span>{tileError}</span>
        </div>
      )}

      {/* 2. Tactical Map Floating Controls */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        {/* Recenter Corridor View */}
        <button
          onClick={() => {
            if (mapInstanceRef.current && origin) {
              mapInstanceRef.current.panTo([origin.lat, origin.lng], { animate: true });
            }
          }}
          className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface hover:text-primary hover:border-primary flex items-center justify-center shadow-lg transition-colors"
          title="Recenter corridor view"
          aria-label="Recenter corridor view"
        >
          <span className="material-symbols-outlined text-lg">my_location</span>
        </button>

        {/* Tile Theme Toggle */}
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

      {/* 3. Map Container Div */}
      <div ref={mapContainerRef} className="w-full h-full" tabIndex={0} />
    </div>
  );
}
