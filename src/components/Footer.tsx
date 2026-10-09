'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant w-full py-8 mt-auto">
      <div className="w-full max-w-7xl px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Logo & Copyright Info */}
        <div className="space-y-1 text-center md:text-left">
          <div className="text-base font-display font-bold text-on-surface flex items-center justify-center md:justify-start gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">shield</span>
            <span>FloodIntel</span>
            <span className="text-[10px] font-sans uppercase bg-surface-container-highest text-primary px-1.5 py-0.5 rounded border border-outline-variant ml-1">
              EDP-9
            </span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-xl">
            © 2025 FloodIntel Municipal Environmental Monitoring System. Real-time telemetry provided under Emergency Dispatch Protocol EDP-9.
          </p>
        </div>

        {/* Quick Links Hierarchy */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-on-surface-variant">
          <Link href="/risk-map" className="hover:text-primary transition-colors duration-150">
            Public Safety Notices
          </Link>
          <Link href="/plan-journey" className="hover:text-primary transition-colors duration-150">
            Hydrologic Data Policy
          </Link>
          <Link href="/officials" className="hover:text-primary transition-colors duration-150">
            API Telemetry
          </Link>
          <Link href="/report-hazard" className="hover:text-primary transition-colors duration-150">
            Terms of Response
          </Link>
          <a
            href="mailto:dispatch@floodintel.org"
            className="hover:text-primary transition-colors duration-150"
          >
            Contact Dispatch
          </a>
        </div>
      </div>
    </footer>
  );
}
