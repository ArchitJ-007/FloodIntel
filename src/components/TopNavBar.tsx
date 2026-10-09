'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIncidents } from '@/context/IncidentContext';

export function TopNavBar() {
  const pathname = usePathname();
  const { stats, incidents } = useIncidents();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [sensorsOpen, setSensorsOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/risk-map', label: 'Risk Map' },
    { href: '/plan-journey', label: 'Plan Journey' },
    { href: '/report-hazard', label: 'Report Hazard' },
    { href: '/officials', label: 'Command Portal', externalIcon: true },
  ];

  return (
    <>
      <header className="bg-surface-container-lowest border-b border-outline-variant docked full-width top-0 sticky z-50 h-16 flex items-center">
        <div className="w-full px-4 md:px-6 flex items-center justify-between mx-auto">
          {/* Left Brand & Identity */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg md:text-xl font-display font-bold tracking-tight text-on-surface flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary group-hover:border-primary transition-colors">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  water_drop
                </span>
              </div>
              <span className="flex items-center gap-2">
                FloodIntel
                <span className="text-[11px] font-sans font-semibold uppercase bg-surface-container-highest text-primary px-1.5 py-0.5 rounded border border-outline-variant">
                  PROTOTYPE
                </span>
              </span>
            </Link>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 h-16">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`h-16 flex items-center text-[13px] font-medium transition-all duration-150 ease-in-out gap-1 px-1 border-b-2 ${
                    isActive
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.externalIcon && (
                    <span className="material-symbols-outlined text-xs text-outline">
                      open_in_new
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Trailing CTAs and Icon Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Live Telemetry Beacon */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-[11px] font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="text-tertiary">Live Telemetry</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant tabular-nums font-mono">
                {stats.activeHazards} Hazards
              </span>
            </div>

            {/* Sensors & Alerts quick icons */}
            <div className="flex items-center gap-1 border-r border-outline-variant pr-2 text-on-surface-variant relative">
              <button
                onClick={() => {
                  setSensorsOpen(!sensorsOpen);
                  setAlertsOpen(false);
                }}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  sensorsOpen
                    ? 'bg-surface-container text-primary'
                    : 'hover:bg-surface-container hover:text-on-surface'
                }`}
                title="Sensor Telemetry Monitor"
                aria-label="Sensors"
              >
                <span className="material-symbols-outlined text-lg">sensors</span>
              </button>

              <button
                onClick={() => {
                  setAlertsOpen(!alertsOpen);
                  setSensorsOpen(false);
                }}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors relative ${
                  alertsOpen
                    ? 'bg-surface-container text-primary'
                    : 'hover:bg-surface-container hover:text-on-surface'
                }`}
                title="Active Alerts"
                aria-label="Alerts"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                {stats.highSeverity > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest"></span>
                )}
              </button>
            </div>

            {/* Officials switch shortcut */}
            <Link
              href="/officials"
              className="hidden xl:inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-outline-variant text-[13px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Sign In
            </Link>

            {/* Primary Report CTA */}
            <Link
              href="/report-hazard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-container text-on-primary-container text-[13px] font-semibold hover:bg-opacity-90 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-sm font-bold">warning</span>
              <span>Report Hazard</span>
            </Link>

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-on-surface hover:bg-surface-container rounded-md"
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Dropdown: Alerts Popover */}
        {alertsOpen && (
          <div className="absolute top-16 right-4 sm:right-24 w-80 sm:w-96 bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-lg">crisis_alert</span>
                <span className="text-sm font-semibold text-on-surface">Active Emergency Alerts</span>
              </div>
              <span className="text-[11px] font-mono text-outline">EDP-9 Live</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
              {incidents
                .filter((i) => i.severity === 'high')
                .slice(0, 3)
                .map((incident) => (
                  <Link
                    key={incident.id}
                    href="/risk-map"
                    onClick={() => setAlertsOpen(false)}
                    className="block p-2.5 rounded-lg bg-surface border border-outline-variant/60 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-error font-semibold">{incident.id}</span>
                      <span className="text-outline text-[11px]">{incident.reportedTime}</span>
                    </div>
                    <div className="text-xs font-semibold text-on-surface line-clamp-1">
                      {incident.title}
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      Water depth: <span className="text-error font-medium">{incident.depth}</span>
                    </div>
                  </Link>
                ))}
            </div>
            <div className="mt-3 pt-2 border-t border-outline-variant flex justify-between items-center text-xs">
              <span className="text-outline">Showing {stats.highSeverity} critical zones</span>
              <Link
                href="/risk-map"
                onClick={() => setAlertsOpen(false)}
                className="text-primary font-medium hover:underline"
              >
                Open Map View →
              </Link>
            </div>
          </div>
        )}

        {/* Dropdown: Sensors Telemetry Popover */}
        {sensorsOpen && (
          <div className="absolute top-16 right-4 sm:right-32 w-80 sm:w-96 bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">hub</span>
                <span className="text-sm font-semibold text-on-surface">Data Sources & Telemetry</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/30 font-bold">
                API BACKED
              </span>
            </div>

            {/* Truthful Live App Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="p-2.5 rounded-lg bg-surface border border-outline-variant">
                <span className="text-[10px] uppercase text-outline block">Reports In Memory</span>
                <span className="text-sm font-mono font-bold text-secondary">{incidents.length} Records</span>
                <span className="text-[10px] text-tertiary block mt-0.5">Hydrated & Local</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-outline-variant">
                <span className="text-[10px] uppercase text-outline block">Weather Engine</span>
                <span className="text-sm font-mono font-bold text-primary">Open-Meteo</span>
                <span className="text-[10px] text-primary block mt-0.5">Live Meteorological</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-outline-variant">
                <span className="text-[10px] uppercase text-outline block">Place Search</span>
                <span className="text-sm font-mono font-bold text-on-surface">Mappls + Curated</span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">India-wide coverage</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-outline-variant">
                <span className="text-[10px] uppercase text-outline block">Route Analysis</span>
                <span className="text-sm font-mono font-bold text-tertiary">OSRM + Turf.js</span>
                <span className="text-[10px] text-tertiary block mt-0.5">Real road geometry</span>
              </div>
            </div>

            {/* Illustrative Simulation Notice */}
            <div className="p-2 rounded-lg bg-surface-container border border-outline-variant/60 text-[11px] text-on-surface-variant space-y-1">
              <div className="flex items-center gap-1 font-semibold text-outline text-[10px] uppercase">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>Hydrologic Sensor Notice</span>
              </div>
              <p className="text-[10px] leading-relaxed">
                Municipal depth gauge feeds (ST-402, RV-12) are simulated demo fixtures. Physical IoT gauges require municipal telemetry API access.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-outline-variant text-right">
              <Link
                href="/officials"
                onClick={() => setSensorsOpen(false)}
                className="text-xs text-primary font-medium hover:underline"
              >
                Open Officials Command Portal →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface-container-low border-b border-outline-variant px-4 py-3 space-y-2 sticky top-16 z-40">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-surface-container-highest text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span>{link.label}</span>
                {link.externalIcon && (
                  <span className="material-symbols-outlined text-xs text-outline">
                    open_in_new
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs text-outline px-1">
            <span className="text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              EDP-9 Connected
            </span>
            <span>{stats.activeHazards} Active Incidents</span>
          </div>
        </div>
      )}
    </>
  );
}
