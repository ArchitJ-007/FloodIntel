'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * FloodIntel — Reusable Mappls (MapmyIndia) interactive vector map.
 *
 * Wraps the official Mappls Web Maps JavaScript SDK v3.0
 * (https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=<Static Key>).
 *
 * This component renders a REAL Mappls map — it never falls back to a decorative
 * or synthetic graphic. When the SDK cannot load, or the key is not authorized,
 * it surfaces an explicit error state instead of pretending the map loaded.
 *
 * The browser SDK key is read from NEXT_PUBLIC_MAPPLS_MAP_SDK_KEY and is necessarily
 * visible to the browser; restrict it by website origin/referrer in the Mappls Console.
 */

export interface MapplsLatLng {
  lat: number;
  lng: number;
}

export type MapplsMarkerTone =
  | 'high'
  | 'moderate'
  | 'low'
  | 'unverified'
  | 'selected'
  | 'demo';

export interface MapplsMapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Visual tone used to build the marker icon. */
  tone?: MapplsMarkerTone;
  /** Human readable label used for the marker title/popup. */
  label?: string;
  /** Optional HTML rendered in the marker popup when the marker is clicked. */
  popupHtml?: string;
  /** Invoked when this specific marker is clicked. */
  onSelect?: () => void;
}

export interface MapplsInteractiveMapProps {
  /** Initial / controlled map center. */
  center: MapplsLatLng;
  /** Initial zoom level (Mappls supports 5–18). */
  zoom?: number;
  /** Hazard/incident markers derived from genuine incident coordinates. */
  markers?: MapplsMapMarker[];
  /** Dedicated marker for the currently selected location (e.g. report point). */
  selectedMarker?: MapplsLatLng | null;
  /** Changing this value recenters the map onto `center` (controlled recenter). */
  recenterKey?: string | number;
  /** Fired with genuine geographic coordinates reported by the Mappls SDK on map click/tap. */
  onMapClick?: (coords: MapplsLatLng) => void;
  /** Fired once the Mappls map has finished loading. */
  onMapReady?: () => void;
  /** Tailwind height classes for the map surface (must be explicit). */
  heightClassName?: string;
  className?: string;
  ariaLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* SDK loading (singleton — never injects the script twice)                    */
/* -------------------------------------------------------------------------- */

const SDK_SCRIPT_ORIGIN = 'https://sdk.mappls.com/map/sdk/web?v=3.0';
const SDK_SCRIPT_ATTR = 'data-floodintel-mappls-sdk';
const SDK_LOAD_TIMEOUT_MS = 20000;

interface LoadFailure {
  reason: 'missing_key' | 'script_error' | 'timeout' | 'no_global';
  message: string;
}

let sdkPromise: Promise<void> | null = null;

export function getMapplsSdkKey(): string | null {
  const key = process.env.NEXT_PUBLIC_MAPPLS_MAP_SDK_KEY;
  if (!key || !key.trim() || key.trim() === 'your_mappls_web_maps_sdk_key_here') {
    return null;
  }
  return key.trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function getSdkGlobal(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).mappls ?? null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function waitForSdkGlobal(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (getSdkGlobal()) {
        window.clearInterval(timer);
        resolve();
      } else if (Date.now() - startedAt > timeoutMs) {
        window.clearInterval(timer);
        reject({ reason: 'timeout', message: 'Timed out waiting for the Mappls SDK to initialize.' } as LoadFailure);
      }
    }, 80);
  });
}

/**
 * Loads the Mappls Web Maps SDK exactly once per browser session.
 * Safe to call from multiple components/pages.
 */
export function loadMapplsSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject({ reason: 'script_error', message: 'Mappls SDK can only load in the browser.' } as LoadFailure);
  }
  if (getSdkGlobal()) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  const key = getMapplsSdkKey();
  if (!key) {
    return Promise.reject({
      reason: 'missing_key',
      message:
        'Interactive map is not configured. Set NEXT_PUBLIC_MAPPLS_MAP_SDK_KEY with a Mappls Static Key that has the "Maps SDK for Web" allocation.',
    } as LoadFailure);
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${SDK_SCRIPT_ATTR}]`);

    if (existing) {
      // Another map instance already injected the script — just await the global.
      waitForSdkGlobal(SDK_LOAD_TIMEOUT_MS).then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = `${SDK_SCRIPT_ORIGIN}&access_token=${encodeURIComponent(key)}`;
    script.async = true;
    script.setAttribute(SDK_SCRIPT_ATTR, 'true');

    script.onload = () => {
      if (getSdkGlobal()) {
        resolve();
      } else {
        reject({ reason: 'no_global', message: 'Mappls SDK script loaded but did not initialize.' } as LoadFailure);
      }
    };
    script.onerror = () => {
      reject({
        reason: 'script_error',
        message: 'Failed to load the Mappls Web Maps SDK script. Check network access to sdk.mappls.com.',
      } as LoadFailure);
    };

    document.head.appendChild(script);
  }).catch((err: LoadFailure) => {
    // Allow a later retry attempt to re-inject the script.
    sdkPromise = null;
    throw err;
  });

  return sdkPromise;
}

/* -------------------------------------------------------------------------- */
/* Coordinate + marker icon helpers                                            */
/* -------------------------------------------------------------------------- */

export function isValidLatLng(value: unknown): value is MapplsLatLng {
  if (!value || typeof value !== 'object') return false;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

const TONE_STYLES: Record<MapplsMarkerTone, { fill: string; stroke: string; size: number }> = {
  high: { fill: '#ef4444', stroke: '#7f1d1d', size: 32 },
  moderate: { fill: '#fbbf24', stroke: '#78350f', size: 28 },
  low: { fill: '#22d3ee', stroke: '#164e63', size: 26 },
  unverified: { fill: '#60a5fa', stroke: '#1e3a8a', size: 26 },
  demo: { fill: '#60a5fa', stroke: '#1e3a8a', size: 26 },
  selected: { fill: '#ef4444', stroke: '#ffffff', size: 40 },
};

function markerIconDataUrl(tone: MapplsMarkerTone): string {
  const { fill, stroke, size } = TONE_STYLES[tone];
  const half = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<circle cx="${half}" cy="${half}" r="${half - 3}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
<circle cx="${half}" cy="${half}" r="${Math.max(3, half / 3.2)}" fill="#ffffff" opacity="0.92"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MapplsMapInstance {
  addListener: (event: string, cb: (e?: any) => void) => void;
  setCenter: (center: MapplsLatLng) => void;
  setZoom?: (zoom: number) => void;
  getZoom?: () => number;
  loaded?: () => boolean;
  resize?: () => void;
  remove: () => void;
}

interface MapplsMarkerInstance {
  addListener: (event: string, cb: (e?: any) => void) => void;
  setPosition?: (position: MapplsLatLng) => void;
  setMap?: (map: unknown) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let mapContainerCounter = 0;

export default function MapplsInteractiveMap({
  center,
  zoom = 13,
  markers = [],
  selectedMarker = null,
  recenterKey,
  onMapClick,
  onMapReady,
  heightClassName = 'h-[420px]',
  className = '',
  ariaLabel = 'Interactive Mappls hazard map',
}: MapplsInteractiveMapProps) {
  // React-managed host. The Mappls SDK is given a dedicated child node that it may
  // create/remove freely (map.remove() detaches its container), so React's own DOM is
  // never destroyed — this keeps re-initialization safe (e.g. React StrictMode re-mounts).
  const hostRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const containerIdRef = useRef<string>('');
  const mapRef = useRef<MapplsMapInstance | null>(null);
  const markersRef = useRef<MapplsMarkerInstance[]>([]);
  const clickHandlerRef = useRef<MapplsInteractiveMapProps['onMapClick']>(onMapClick);
  const readyHandlerRef = useRef<MapplsInteractiveMapProps['onMapReady']>(onMapReady);
  const markerSelectRef = useRef<Map<string, () => void>>(new Map());

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  if (!containerIdRef.current) {
    mapContainerCounter += 1;
    containerIdRef.current = `floodintel-mappls-map-${mapContainerCounter}`;
  }

  // Keep the latest callbacks without re-initializing the SDK.
  clickHandlerRef.current = onMapClick;
  readyHandlerRef.current = onMapReady;
  markerSelectRef.current = new Map(
    markers.filter((m) => typeof m.onSelect === 'function').map((m) => [m.id, m.onSelect as () => void])
  );

  /**
   * Mappls renders its own map controls as DOM nodes. When the map is embedded inside a
   * <form> (Report Hazard), a control button without an explicit type would submit the
   * form. Force type="button" on SDK-rendered controls so map controls never submit.
   */
  const hardenSdkControls = () => {
    const container = targetRef.current;
    if (!container) return;
    container.querySelectorAll('button:not([type])').forEach((button) => {
      button.setAttribute('type', 'button');
    });
  };

  const clearMarkers = () => {
    for (const marker of markersRef.current) {
      try {
        marker.setMap?.(null);
      } catch {
        /* marker already detached */
      }
    }
    markersRef.current = [];
  };

  /* ---------------- Initialize the Mappls map (once per mount) -------------- */
  useEffect(() => {
    let disposed = false;
    setStatus('loading');
    setErrorMessage(null);

    loadMapplsSdk()
      .then(() => {
        const host = hostRef.current;
        if (disposed || !host) return;
        const mappls = getSdkGlobal();
        if (!mappls || typeof mappls.Map !== 'function') {
          throw { reason: 'no_global', message: 'Mappls SDK global is unavailable.' } as LoadFailure;
        }

        // Dedicated, SDK-owned target node (explicit size, inside the React host).
        const target = document.createElement('div');
        target.id = containerIdRef.current;
        target.style.position = 'absolute';
        target.style.top = '0';
        target.style.left = '0';
        target.style.width = '100%';
        target.style.height = '100%';
        host.appendChild(target);
        targetRef.current = target;

        const initialCenter = isValidLatLng(center) ? center : { lat: 12.9352, lng: 77.6245 };
        const map = new mappls.Map(target.id, {
          center: { lat: initialCenter.lat, lng: initialCenter.lng },
          zoom,
          backgroundColor: '#0B1120',
          zoomControl: true,
          scaleControl: false,
          fullscreenControl: false,
          rotateControl: false,
        }) as MapplsMapInstance;

        mapRef.current = map;

        map.addListener('load', () => {
          if (disposed) return;
          setStatus('ready');
          hardenSdkControls();
          readyHandlerRef.current?.();
        });

        map.addListener('error', (event: { error?: { message?: string }; message?: string } | undefined) => {
          if (disposed) return;
          const message =
            event?.error?.message || event?.message || 'The Mappls map reported a rendering error.';
          setStatus((prev) => (prev === 'ready' ? prev : 'error'));
          setErrorMessage((prev) => prev ?? message);
        });

        // Click / tap → genuine geographic coordinates reported by the SDK.
        map.addListener('click', (event: { lngLat?: { lat?: unknown; lng?: unknown } } | undefined) => {
          if (disposed) return;
          const lat = Number(event?.lngLat?.lat);
          const lng = Number(event?.lngLat?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            clickHandlerRef.current?.({ lat, lng });
          }
        });

        // Safety net: some environments never emit `load` once tiles are cached.
        const readyPoll = window.setInterval(() => {
          if (disposed) {
            window.clearInterval(readyPoll);
            return;
          }
          try {
            if (map.loaded?.()) {
              window.clearInterval(readyPoll);
              setStatus((prev) => (prev === 'loading' ? 'ready' : prev));
            }
          } catch {
            window.clearInterval(readyPoll);
          }
        }, 500);
        window.setTimeout(() => window.clearInterval(readyPoll), 12000);
      })
      .catch((err: LoadFailure) => {
        if (disposed) return;
        setStatus('error');
        setErrorMessage(err?.message || 'Unable to initialize the interactive Mappls map.');
      });

    return () => {
      disposed = true;
      clearMarkers();
      const map = mapRef.current;
      mapRef.current = null;
      if (map) {
        try {
          map.remove();
        } catch {
          /* map already torn down */
        }
      }
      // The SDK removes its container on map.remove(); make sure no orphan node lingers.
      const target = targetRef.current;
      targetRef.current = null;
      if (target && target.isConnected) {
        target.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryNonce]);

  /* ---------------- Controlled recentering -------------------------------- */
  useEffect(() => {
    if (status !== 'ready') return;
    const map = mapRef.current;
    if (!map || !isValidLatLng(center)) return;
    try {
      map.setCenter({ lat: center.lat, lng: center.lng });
      map.setZoom?.(zoom);
    } catch {
      /* non-fatal: map may be mid-teardown */
    }
    // Intentionally keyed off recenterKey/center only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, center?.lat, center?.lng, zoom, status]);

  /* ---------------- Markers ----------------------------------------------- */
  useEffect(() => {
    if (status !== 'ready') return;
    const map = mapRef.current;
    const mappls = getSdkGlobal();
    if (!map || !mappls || typeof mappls.Marker !== 'function') return;

    clearMarkers();

    const createMarker = (position: MapplsLatLng, tone: MapplsMarkerTone, label?: string, popupHtml?: string) => {
      const marker = new mappls.Marker({
        map,
        position: { lat: position.lat, lng: position.lng },
        icon: markerIconDataUrl(tone),
        width: TONE_STYLES[tone].size,
        height: TONE_STYLES[tone].size,
        ...(label ? { title: label } : {}),
        ...(popupHtml ? { popupHtml } : {}),
      }) as MapplsMarkerInstance;
      markersRef.current.push(marker);
      return marker;
    };

    for (const incident of markers) {
      if (!isValidLatLng(incident)) continue;
      const marker = createMarker(
        { lat: incident.lat, lng: incident.lng },
        incident.tone || 'unverified',
        incident.label,
        incident.popupHtml
      );
      marker.addListener('click', () => {
        markerSelectRef.current.get(incident.id)?.();
      });
    }

    if (selectedMarker && isValidLatLng(selectedMarker)) {
      createMarker(selectedMarker, 'selected');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, JSON.stringify(markers), JSON.stringify(selectedMarker)]);

  return (
    <div className={`relative w-full ${heightClassName} ${className}`}>
      {/* Real Mappls map surface — the SDK mounts inside this host */}
      <div
        ref={hostRef}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full overflow-hidden"
      />

      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0B1120]/85 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
          <span className="text-xs font-mono">Loading interactive Mappls map…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0B1120]/92 px-6 text-center">
          <span className="material-symbols-outlined text-2xl text-error">map</span>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-error">Interactive map unavailable</p>
            <p className="text-[11px] leading-relaxed text-on-surface-variant max-w-md">
              {errorMessage ||
                'The Mappls Web Maps SDK could not be initialized. The synthetic illustration has been removed — no fake map is shown.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Retry map</span>
          </button>
        </div>
      )}

      {/* Provider attribution / branding (the SDK also renders its own attribution control) */}
      <div className="pointer-events-none absolute bottom-1.5 left-2 z-10 rounded bg-[#0B1120]/70 px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant/80">
        Map data © Mappls
      </div>
    </div>
  );
}
