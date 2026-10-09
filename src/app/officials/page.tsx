'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SeverityBadge } from '@/components/SeverityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useIncidents, StatusType, SeverityType } from '@/context/IncidentContext';

export default function OfficialsDashboardPage() {
  const { incidents, selectedIncident, setSelectedIncidentId, updateStatus, stats } = useIncidents();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'hazards' | 'resolved' | 'audit'>('overview');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return incidents.filter((incident) => {
      // Active tab filter
      if (activeTab === 'resolved' && incident.status !== 'Resolved') return false;
      if (activeTab === 'hazards' && incident.status === 'Resolved') return false;

      // Status tab
      if (statusFilter !== 'All' && incident.status !== statusFilter) return false;

      // Severity dropdown
      if (severityFilter !== 'all' && incident.severity !== severityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = incident.id.toLowerCase().includes(query);
        const matchesLoc = incident.location.toLowerCase().includes(query);
        const matchesTitle = incident.title.toLowerCase().includes(query);
        if (!matchesId && !matchesLoc && !matchesTitle) return false;
      }

      return true;
    });
  }, [incidents, activeTab, statusFilter, severityFilter, searchQuery]);

  return (
    <div className="bg-[#051424] text-on-surface antialiased min-h-screen flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      {/* Top Officials Navigation Bar */}
      <header className="bg-surface-container-lowest border-b border-outline-variant docked full-width top-0 sticky z-50 h-16">
        <div className="w-full px-4 md:px-6 flex items-center justify-between mx-auto h-full">
          {/* Logo & Operational Status */}
          <div className="flex items-center gap-3 md:gap-5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary group-hover:border-primary transition-colors">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
              </div>
              <span className="font-display font-bold text-base md:text-lg text-on-surface tracking-tight">
                FloodIntel <span className="text-secondary text-xs font-mono font-normal">COMMAND</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-error/15 border border-error/30 text-error text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-error animate-ping"></span>
              <span>Triage Mode: Active Storm Alert</span>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-sm text-secondary">badge</span>
              <span>Operator: J. Doe (Sector 4 Emergency Ops)</span>
            </div>
          </div>

          {/* Action Trailing Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface text-xs font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span className="hidden sm:inline">Public View</span>
            </Link>

            <Link
              href="/risk-map"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant hover:border-primary text-primary text-xs font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              <span>Risk Map</span>
            </Link>

            <div className="flex items-center gap-1 text-on-surface-variant border-l border-outline-variant pl-2 ml-1">
              <button
                onClick={() => showNotice('Telemetry sync triggered across 142 sensor nodes.')}
                className="p-1.5 rounded-lg hover:bg-surface-container hover:text-primary transition-colors"
                title="Sync All Sensors"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-surface-container hover:text-primary transition-colors"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
              </button>
              <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline flex items-center justify-center text-primary text-xs font-bold font-mono ml-1">
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Action toast notice */}
      {actionNotice && (
        <div className="fixed top-20 right-6 bg-surface-container-high border border-primary text-on-surface px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-base text-tertiary">check_circle</span>
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Dashboard Workspace Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Left Operational Side Rail */}
        <aside className="hidden lg:flex w-60 bg-surface-container-low border-r border-outline-variant flex-col justify-between shrink-0 h-[calc(100vh-64px)] overflow-y-auto custom-scroll">
          <div className="p-4 flex flex-col gap-4">
            {/* Header badge */}
            <div className="border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">shield</span>
                <div>
                  <div className="font-display font-bold text-sm text-on-surface leading-tight">
                    Command Ops
                  </div>
                  <div className="text-[11px] text-on-surface-variant">Sector 4 Basin</div>
                </div>
              </div>
            </div>

            {/* Primary Navigation */}
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Triage Queue', icon: 'dashboard' },
                { id: 'hazards', label: 'Reported Hazards', icon: 'warning' },
                { id: 'resolved', label: 'Resolved Incidents', icon: 'check_circle' },
                { id: 'audit', label: 'Audit Logs', icon: 'history' },
              ].map((navItem) => (
                <button
                  key={navItem.id}
                  onClick={() => setActiveTab(navItem.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === navItem.id
                      ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{navItem.icon}</span>
                  <span>{navItem.label}</span>
                </button>
              ))}
              <Link
                href="/risk-map"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-base">map</span>
                <span>Interactive Map View</span>
              </Link>
            </nav>

            {/* Operational Shortcuts / Counters */}
            <div className="pt-3 border-t border-outline-variant">
              <div className="text-[10px] font-semibold text-on-surface-variant mb-2 px-1 tracking-wider uppercase">
                Filter Shortcuts
              </div>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setStatusFilter('Under Review');
                    setActiveTab('overview');
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                    <span>Under Review</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-[#F59E0B]/20 text-[#F59E0B]">
                    14
                  </span>
                </button>
                <button
                  onClick={() => {
                    setSeverityFilter('high');
                    setActiveTab('overview');
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-error"></span>
                    <span>High Severity</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-error/20 text-error">
                    {stats.highSeverity}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('In Progress');
                    setActiveTab('overview');
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span>Pending Action</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-surface-container-highest text-secondary">
                    {stats.activeHazards}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
            <button
              onClick={() => {
                if (selectedIncident) {
                  updateStatus(selectedIncident.id, 'In Progress');
                  showNotice(`Pumping unit dispatched to ${selectedIncident.id}!`);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-container hover:bg-opacity-90 text-on-primary-container font-semibold rounded-lg text-xs transition-colors shadow-sm mb-2"
            >
              <span className="material-symbols-outlined text-base">local_shipping</span>
              <span>Dispatch Unit</span>
            </button>
            <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
              <Link href="/plan-journey" className="hover:text-primary transition-colors">
                Routing Docs
              </Link>
              <Link href="/report-hazard" className="hover:text-primary transition-colors">
                Citizen Portal
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content Area: Incident Management & Triage */}
        <main className="flex-1 flex overflow-hidden">
          {/* Scrollable Middle Section: Summary Metrics & Table */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scroll">
            {/* Top Header & Guidance Banner */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-bold text-on-surface tracking-tight">
                    Incident Management & Triage
                  </h1>
                  <p className="text-xs text-on-surface-variant">
                    Live telemetry and validated civilian hazard queue for Sector 4 drainage corridor
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => showNotice('Telemetry re-synchronized with 142 weather stations.')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface hover:border-outline text-xs font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>Sync Telemetry</span>
                  </button>
                  <button
                    onClick={() => {
                      const csvContent =
                        'data:text/csv;charset=utf-8,' +
                        'ID,Location,Severity,Status,Depth\n' +
                        incidents
                          .map((i) => `"${i.id}","${i.location}","${i.severity}","${i.status}","${i.depth}"`)
                          .join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', 'floodintel_incidents_report.csv');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showNotice('Exported incidents report to CSV!');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface hover:border-outline text-xs font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">file_download</span>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Guidance Banner */}
              <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3 flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0">
                    info
                  </span>
                  <p className="text-xs text-on-surface">
                    <span className="font-semibold text-primary">Status Pipeline:</span> Reported →
                    Under Review → In Progress → Resolved. All seeded records represent demo test data with [DEMO DATA] provenance labels.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant shrink-0 hidden sm:inline">
                  EDP-9 Active
                </span>
              </div>
            </div>

            {/* Summary Metric Cards (Grid of 4) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
              {/* Card 1: Total Reports Today */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-on-surface-variant mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Total Reports Today
                  </span>
                  <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                </div>
                <div className="text-3xl font-display font-bold text-on-surface leading-none mb-1 tabular-nums font-mono">
                  {stats.totalToday}
                </div>
                <div className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-tertiary">trending_up</span>
                  <span className="text-tertiary">+14%</span> vs yesterday baseline
                </div>
              </div>

              {/* Card 2: Pending Verification */}
              <div className="bg-surface-container-low border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>
                <div className="flex items-center justify-between text-on-surface-variant mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    Pending Verification
                  </span>
                  <span className="material-symbols-outlined text-amber-400 text-xl">
                    pending_actions
                  </span>
                </div>
                <div className="text-3xl font-display font-bold text-amber-400 leading-none mb-1 tabular-nums font-mono">
                  {incidents.filter((i) => i.status === 'Reported' || i.status === 'Under Review').length}
                </div>
                <div className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Requires dispatch review</span>
                </div>
              </div>

              {/* Card 3: High-Severity Hazards */}
              <div className="bg-surface-container-low border border-error/40 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-error"></div>
                <div className="flex items-center justify-between text-on-surface-variant mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-error">
                    High-Severity Hazards
                  </span>
                  <span className="material-symbols-outlined text-error text-xl">warning</span>
                </div>
                <div className="text-3xl font-display font-bold text-error leading-none mb-1 tabular-nums font-mono">
                  {stats.highSeverity}
                </div>
                <div className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                  <span>Pumping units active</span>
                </div>
              </div>

              {/* Card 4: Resolved & Cleared */}
              <div className="bg-surface-container-low border border-tertiary/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary"></div>
                <div className="flex items-center justify-between text-on-surface-variant mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                    Resolved & Cleared
                  </span>
                  <span className="material-symbols-outlined text-tertiary text-xl">task_alt</span>
                </div>
                <div className="text-3xl font-display font-bold text-tertiary leading-none mb-1 tabular-nums font-mono">
                  {stats.resolved}
                </div>
                <div className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  <span>98.2% road clearance rate</span>
                </div>
              </div>
            </section>

            {/* Filter and Search Bar */}
            <section className="bg-surface-container-low border border-outline-variant rounded-xl p-3 md:p-4 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-2.5 items-center">
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID or Location..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-surface-container border border-outline-variant text-on-surface placeholder-on-surface-variant/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none h-[36px]"
                  />
                </div>

                {/* Severity Filter Dropdown */}
                <div className="w-full sm:w-44">
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full py-1.5 px-3 text-xs rounded-md bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none h-[36px]"
                  >
                    <option value="all">Severity: All</option>
                    <option value="high">Severity: High</option>
                    <option value="moderate">Severity: Moderate</option>
                    <option value="low">Severity: Low</option>
                  </select>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant shrink-0 overflow-x-auto">
                {['All', 'Reported', 'Under Review', 'In Progress', 'Resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-surface-container-highest text-primary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </section>

            {/* Comprehensive Incident Triage Table */}
            <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-outline-variant text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3 px-4">Report ID</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Hazard Type</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Risk Score</th>
                      <th className="py-3 px-4">Reported Time</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 text-xs">
                    {filteredList.map((incident) => {
                      const isSelected = selectedIncident?.id === incident.id;
                      return (
                        <tr
                          key={incident.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-surface-container-highest/70'
                              : 'hover:bg-surface-container/60'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-semibold text-primary">
                            <div>{incident.id}</div>
                            {incident.provenance === 'demo' && (
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-surface-container text-secondary border border-outline-variant inline-block mt-0.5">
                                Demo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-on-surface">
                            <div className="line-clamp-1">{incident.title}</div>
                            <div className="text-[11px] text-outline line-clamp-1">{incident.location}</div>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface-variant">
                            {incident.hazardTypeLabel}
                          </td>
                          <td className="py-3.5 px-4">
                            <SeverityBadge severity={incident.severity} />
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span
                              className={
                                incident.riskCategory === 'high'
                                  ? 'text-error'
                                  : incident.riskCategory === 'moderate'
                                  ? 'text-amber-400'
                                  : 'text-primary'
                              }
                            >
                              {incident.riskScore !== null ? `${incident.riskScore}/100` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-outline block font-sans font-normal uppercase">
                              {incident.confidence} conf
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface-variant font-mono">
                            {incident.reportedTime}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={incident.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedIncidentId(incident.id);
                                setDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-surface-bright text-primary hover:bg-primary-container hover:text-on-primary-container text-xs font-semibold transition-colors"
                            >
                              Inspect
                            </button>
                            {incident.status === 'Reported' && (
                              <button
                                onClick={() => {
                                  updateStatus(incident.id, 'Under Review');
                                  showNotice(`${incident.id} marked as Under Review.`);
                                }}
                                className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface text-xs transition-colors"
                              >
                                Verify
                              </button>
                            )}
                            {incident.status !== 'Resolved' && (
                              <button
                                onClick={() => {
                                  updateStatus(incident.id, 'Resolved');
                                  showNotice(`${incident.id} marked as Resolved.`);
                                }}
                                className="px-2 py-1 rounded bg-tertiary-container/30 hover:bg-tertiary-container text-tertiary text-xs font-semibold transition-colors"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-4 py-3 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between text-on-surface-variant text-xs">
                <div>
                  Showing <span className="font-semibold text-on-surface">{filteredList.length}</span> of{' '}
                  <span className="font-semibold text-on-surface">{incidents.length}</span> incident reports
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span>EDP-9 Dispatch Active</span>
                </div>
              </div>
            </section>
          </div>

          {/* Slide-over Incident Detail Panel (Right drawer) */}
          {drawerOpen && selectedIncident && (
            <aside className="w-80 md:w-96 bg-surface-container-low border-l border-outline-variant flex flex-col justify-between shrink-0 h-[calc(100vh-64px)] overflow-y-auto custom-scroll shadow-2xl animate-in slide-in-from-right-4">
              <div className="p-4 md:p-5 space-y-4">
                {/* Panel Header */}
                <div className="flex items-start justify-between border-b border-outline-variant pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm md:text-base text-on-surface">
                        Incident Review: {selectedIncident.id}
                      </span>
                      <SeverityBadge severity={selectedIncident.severity} />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                      {selectedIncident.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
                    title="Close details"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {/* Deterministic Risk Score Assessment Card */}
                <div className="bg-surface-container rounded-lg p-3 border border-outline-variant space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Deterministic Risk Engine
                    </span>
                    <span className="text-[10px] font-mono text-outline">
                      Confidence:{' '}
                      <strong className="text-on-surface uppercase">
                        {selectedIncident.confidence}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-2xl font-bold font-mono ${
                          selectedIncident.riskCategory === 'high'
                            ? 'text-error'
                            : selectedIncident.riskCategory === 'moderate'
                            ? 'text-amber-400'
                            : 'text-primary'
                        }`}
                      >
                        {selectedIncident.riskScore !== null ? `${selectedIncident.riskScore}` : 'N/A'}
                      </span>
                      <span className="text-xs text-outline font-mono">/ 100</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-outline-variant font-mono uppercase bg-surface-container-high text-on-surface">
                      {selectedIncident.riskCategory} Risk ({selectedIncident.provenance})
                    </span>
                  </div>
                  {selectedIncident.scoreBreakdown && (
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-on-surface-variant pt-1 border-t border-outline-variant/40">
                      <div>Severity (S): {selectedIncident.scoreBreakdown.severity.contribution} pts</div>
                      <div>Recency (T): {selectedIncident.scoreBreakdown.recency.contribution} pts</div>
                      <div>Corroboration (C): {selectedIncident.scoreBreakdown.corroboration.contribution} pts</div>
                      <div>
                        Rain (R):{' '}
                        {selectedIncident.scoreBreakdown.rain.available
                          ? `${selectedIncident.scoreBreakdown.rain.contribution} pts`
                          : 'Renorm'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Citizen Description Card */}
                <div className="bg-surface-container rounded-lg p-3 border border-outline-variant">
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-primary">
                      record_voice_over
                    </span>
                    <span>Citizen Description</span>
                  </div>
                  <p className="text-xs text-on-surface italic leading-relaxed">
                    &quot;{selectedIncident.notes || selectedIncident.trafficImpact}&quot;
                  </p>
                  <div className="mt-2 text-[11px] text-on-surface-variant flex items-center justify-between border-t border-outline-variant/40 pt-1.5">
                    <span>Source: {selectedIncident.reportedBy}</span>
                    <span className="text-secondary font-mono">GPS: ±3m</span>
                  </div>
                </div>

                {/* Photo Evidence Preview Thumbnail */}
                <div>
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">photo_camera</span>
                      <span>Citizen Photo Evidence</span>
                    </span>
                    <span className="text-primary text-[11px] hover:underline cursor-pointer">
                      Verified
                    </span>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-outline-variant bg-surface-container h-32 group">
                    <img
                      src={
                        selectedIncident.photoUrl ||
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuB4xvob4_W1KZZSIGXvE6ahccdax5dGCvzadmJw-mV9y3ZwunYl90mRCbpZInLEpTecAgJOry-YC0Vb09pehQ-hRhZCO5rTfYV-3-NhJ7I-SEGyF3sEU1SuJfhRQU3hr3cjUqIpto8ZvyGE4Oy5vjm7EFVfJmeEO0D7jZVDGDm3VTxMjOJzgpHlH3C8YO9zHDZ4pf01T1D9TzBmTkdWXE9iqS4_BGrlvJaR3oCYufEDCOJ-4dINGR6A'
                      }
                      alt="Flooded underpass photo evidence"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-transparent to-transparent flex items-end p-2">
                      <div className="flex items-center justify-between w-full text-[11px] text-on-surface">
                        <span className="flex items-center gap-1 text-tertiary">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Metadata Verified
                        </span>
                        <span className="font-mono">{selectedIncident.reportedTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sensor Telemetry Verification Cross-Check */}
                <div className="bg-surface-container/60 rounded-lg p-3 border border-outline-variant">
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-secondary">sensors</span>
                    <span>Automated Telemetry Cross-Check</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-surface-container border border-outline-variant">
                      <div className="text-[10px] text-on-surface-variant">Gauge Node #42</div>
                      <div className="font-display font-bold text-error text-sm">
                        {selectedIncident.depth}
                      </div>
                      <div className="text-[10px] text-error">Critical Water Level</div>
                    </div>
                    <div className="p-2 rounded bg-surface-container border border-outline-variant">
                      <div className="text-[10px] text-on-surface-variant">Flow Velocity</div>
                      <div className="font-display font-bold text-secondary text-sm">
                        {selectedIncident.flowVelocity || '3.8 m/s'}
                      </div>
                      <div className="text-[10px] text-secondary">Surging North</div>
                    </div>
                  </div>
                </div>

                {/* Status History Timeline */}
                <div>
                  <div className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                    Status History Timeline
                  </div>
                  <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">
                    <div className="relative">
                      <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-secondary ring-2 ring-surface-container-low"></span>
                      <div className="text-[10px] font-mono font-semibold text-secondary">
                        {selectedIncident.reportedTime}
                      </div>
                      <div className="text-xs font-medium text-on-surface">
                        Reported by {selectedIncident.reportedBy}
                      </div>
                      <div className="text-[10px] text-on-surface-variant">
                        Incident geocoded via public hazard form.
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface-container-low"></span>
                      <div className="text-[10px] font-mono font-semibold text-primary">
                        +5m Telemetry Ingest
                      </div>
                      <div className="text-xs font-medium text-on-surface">
                        Triaged by Sensor Telemetry
                      </div>
                      <div className="text-[10px] text-on-surface-variant">
                        Node depth verified {selectedIncident.depth}.
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-surface-container-low"></span>
                      <div className="text-[10px] font-mono font-semibold text-amber-400">
                        Current Status
                      </div>
                      <div className="text-xs font-medium text-on-surface">
                        Status: {selectedIncident.status}
                      </div>
                      <div className="text-[10px] text-on-surface-variant">
                        Assigned to Operator Doe (Sector 4).
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Bar */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-lowest space-y-2">
                <button
                  onClick={() => {
                    updateStatus(selectedIncident.id, 'In Progress');
                    showNotice(`${selectedIncident.id} confirmed & triaged!`);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-opacity-90 text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Confirm & Verify Incident</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      updateStatus(selectedIncident.id, 'In Progress');
                      showNotice(`Pumping unit dispatched to ${selectedIncident.id}!`);
                    }}
                    className="py-2 px-2.5 rounded-lg border border-primary/40 bg-surface-container hover:bg-surface-container-highest text-primary font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    <span>Dispatch Crew</span>
                  </button>
                  <button
                    onClick={() => {
                      updateStatus(selectedIncident.id, 'Resolved');
                      showNotice(`${selectedIncident.id} marked as Resolved!`);
                    }}
                    className="py-2 px-2.5 rounded-lg border border-tertiary/40 bg-surface-container hover:bg-tertiary-container/30 text-tertiary font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">done_all</span>
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>
            </aside>
          )}
        </main>
      </div>

      {/* Shared Footer */}
      <footer className="w-full py-2.5 px-4 md:px-6 bg-surface-container-lowest border-t border-outline-variant z-40">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-2 text-on-surface-variant text-xs">
          <div>
            © 2025 FloodIntel Municipal Environmental Monitoring System. Real-time telemetry provided
            under Emergency Dispatch Protocol EDP-9.
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <Link href="/risk-map" className="hover:text-primary transition-colors">
              Public Map
            </Link>
            <Link href="/plan-journey" className="hover:text-primary transition-colors">
              Safe Routes
            </Link>
            <Link href="/report-hazard" className="hover:text-primary transition-colors">
              Submit Report
            </Link>
            <span className="text-tertiary font-mono">EDP-9 Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
