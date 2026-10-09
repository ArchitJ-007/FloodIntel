'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SeverityType = 'high' | 'moderate' | 'low' | 'cleared';
export type StatusType = 'Reported' | 'Under Review' | 'In Progress' | 'Resolved';
export type HazardCategory = 'waterlogging' | 'flooded_road' | 'blocked_road' | 'drainage_failure';

export interface Incident {
  id: string;
  title: string;
  location: string;
  zone: string;
  hazardType: HazardCategory;
  hazardTypeLabel: string;
  severity: SeverityType;
  status: StatusType;
  depth: string;
  depthValueFt: number;
  reportedTime: string;
  reportedTimestamp: number;
  reportedBy: string;
  trafficImpact: string;
  verifiedCount: number;
  sensorNode?: string;
  flowVelocity?: string;
  photoUrl?: string;
  coordinates: {
    lat: number;
    lng: number;
    xPercent: number; // for SVG/Canvas map positioning
    yPercent: number;
  };
  notes?: string;
}

interface IncidentContextType {
  incidents: Incident[];
  selectedIncident: Incident | null;
  setSelectedIncidentId: (id: string) => void;
  addHazard: (newHazard: {
    location: string;
    hazardType: HazardCategory;
    severity: SeverityType;
    waterDepth: string;
    description: string;
    reporterMode: string;
    contact?: string;
  }) => Incident;
  updateStatus: (id: string, newStatus: StatusType) => void;
  stats: {
    activeHazards: number;
    highSeverity: number;
    resolved: number;
    totalToday: number;
  };
}

const initialIncidents: Incident[] = [
  {
    id: '#FLD-084',
    title: 'Central Metro Underpass, West Avenue',
    location: '4th Cross Rd & 80ft Road Junction, Koramangala',
    zone: 'Sector 4 Basin',
    hazardType: 'flooded_road',
    hazardTypeLabel: 'Flooded Road / Underpass',
    severity: 'high',
    status: 'Under Review',
    depth: '2.5 ft (76 cm)',
    depthValueFt: 2.5,
    reportedTime: '18m ago',
    reportedTimestamp: Date.now() - 18 * 60 * 1000,
    reportedBy: 'Citizen Scout #42',
    trafficImpact: 'Impassable for sedans and two-wheelers. Rapid surface accumulation observed; drainage runoff valve RV-12 blocked with debris.',
    verifiedCount: 12,
    sensorNode: 'Gauge Node #42 (2.45 ft - Critical)',
    flowVelocity: '3.8 m/s (Surging North)',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4xvob4_W1KZZSIGXvE6ahccdax5dGCvzadmJw-mV9y3ZwunYl90mRCbpZInLEpTecAgJOry-YC0Vb09pehQ-hRhZCO5rTfYV-3-NhJ7I-SEGyF3sEU1SuJfhRQU3hr3cjUqIpto8ZvyGE4Oy5vjm7EFVfJmeEO0D7jZVDGDm3VTxMjOJzgpHlH3C8YO9zHDZ4pf01T1D9TzBmTkdWXE9iqS4_BGrlvJaR3oCYufEDCOJ-4dINGR6A',
    coordinates: {
      lat: 12.9348,
      lng: 77.6205,
      xPercent: 38,
      yPercent: 48,
    },
    notes: 'Water depth approx 2.5 ft. Impassable for sedans. Overflow coming from west storm canal collector.',
  },
  {
    id: '#FLD-071',
    title: 'Pier Street Underpass Flood',
    location: '12th Main Road, Sector 3',
    zone: 'Sector 3 (East Valley Canal)',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Severe Waterlogging',
    severity: 'high',
    status: 'In Progress',
    depth: '1.9 ft (58 cm)',
    depthValueFt: 1.9,
    reportedTime: '34m ago',
    reportedTimestamp: Date.now() - 34 * 60 * 1000,
    reportedBy: 'Ward Monitor ST-18',
    trafficImpact: 'Single lane passable only for high-clearance emergency trucks. Transit rerouted via North Spine.',
    verifiedCount: 8,
    sensorNode: 'Gauge Node #31 (1.85 ft)',
    flowVelocity: '2.1 m/s',
    coordinates: {
      lat: 12.9412,
      lng: 77.6321,
      xPercent: 68,
      yPercent: 32,
    },
    notes: 'Drainage grate submerged beneath floating debris.',
  },
  {
    id: '#FLD-063',
    title: 'Harbor Crossing Storm Drain Overspill',
    location: 'Eastern Canal Embankment',
    zone: 'Sector 1 (Harbor Drainage)',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Drainage Overspill',
    severity: 'moderate',
    status: 'Under Review',
    depth: '0.8 ft (24 cm)',
    depthValueFt: 0.8,
    reportedTime: '1h ago',
    reportedTimestamp: Date.now() - 60 * 60 * 1000,
    reportedBy: 'Citizen Scout #19',
    trafficImpact: 'Slow movement, moderate ponding along outer perimeter roadway.',
    verifiedCount: 5,
    sensorNode: 'Gauge Node #12 (0.75 ft)',
    flowVelocity: '1.2 m/s',
    coordinates: {
      lat: 12.928,
      lng: 77.615,
      xPercent: 78,
      yPercent: 65,
    },
  },
  {
    id: '#FLD-052',
    title: 'Ring Road Flyover Exit Water Accumulation',
    location: 'North Ring Road Junction 4',
    zone: 'Sector 2 (North Ridge Spillway)',
    hazardType: 'blocked_road',
    hazardTypeLabel: 'Blocked Road / Chokepoint',
    severity: 'moderate',
    status: 'Resolved',
    depth: '0.6 ft (18 cm)',
    depthValueFt: 0.6,
    reportedTime: '2h ago',
    reportedTimestamp: Date.now() - 120 * 60 * 1000,
    reportedBy: 'Highway Patrol Car 9',
    trafficImpact: 'Pumping crew cleared culvert. Traffic moving normally with caution.',
    verifiedCount: 14,
    sensorNode: 'Gauge Node #08 (0.2 ft - Normal)',
    flowVelocity: '0.5 m/s',
    coordinates: {
      lat: 12.955,
      lng: 77.64,
      xPercent: 88,
      yPercent: 26,
    },
  },
  {
    id: '#FLD-091',
    title: 'Highland Park Drainage Overflow',
    location: 'North Market Street & 2nd Ave',
    zone: 'Sector 4 & 5 (Metropolitan Basin)',
    hazardType: 'drainage_failure',
    hazardTypeLabel: 'Drainage Failure',
    severity: 'low',
    status: 'Reported',
    depth: '0.4 ft (12 cm)',
    depthValueFt: 0.4,
    reportedTime: '5m ago',
    reportedTimestamp: Date.now() - 5 * 60 * 1000,
    reportedBy: 'Anonymous Citizen',
    trafficImpact: 'Curbside water pooling. Sidewalk inaccessible.',
    verifiedCount: 2,
    sensorNode: 'Gauge Node #44 (0.4 ft)',
    flowVelocity: '0.3 m/s',
    coordinates: {
      lat: 12.939,
      lng: 77.625,
      xPercent: 55,
      yPercent: 58,
    },
  },
  {
    id: '#FLD-039',
    title: 'Grand Union Canal Spillway Receded',
    location: 'Old Airport Road Spillway Checkpoint',
    zone: 'Sector 3 (East Valley Canal)',
    hazardType: 'waterlogging',
    hazardTypeLabel: 'Cleared Corridor',
    severity: 'cleared',
    status: 'Resolved',
    depth: '0.1 ft (3 cm)',
    depthValueFt: 0.1,
    reportedTime: '3h ago',
    reportedTimestamp: Date.now() - 180 * 60 * 1000,
    reportedBy: 'City Water Works Team B',
    trafficImpact: 'Normal passage restored. Debris cleared.',
    verifiedCount: 22,
    sensorNode: 'Station ST-402 (Normal)',
    flowVelocity: '1.0 m/s',
    coordinates: {
      lat: 12.945,
      lng: 77.63,
      xPercent: 52,
      yPercent: 74,
    },
  },
];

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('#FLD-084');

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  const addHazard = ({
    location,
    hazardType,
    severity,
    waterDepth,
    description,
    reporterMode,
    contact,
  }: {
    location: string;
    hazardType: HazardCategory;
    severity: SeverityType;
    waterDepth: string;
    description: string;
    reporterMode: string;
    contact?: string;
  }) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `#FLD-2025-${randomNum}`;

    const labelMap: Record<HazardCategory, string> = {
      waterlogging: 'Waterlogging',
      flooded_road: 'Flooded Road',
      blocked_road: 'Blocked Road',
      drainage_failure: 'Drainage Failure',
    };

    let depthFt = 1.0;
    if (waterDepth === 'curb') depthFt = 0.5;
    if (waterDepth === 'knee') depthFt = 1.8;
    if (waterDepth === 'deep') depthFt = 2.8;

    const newIncident: Incident = {
      id: newId,
      title: location.split(',')[0] || 'Reported Water Hazard',
      location: location,
      zone: 'Sector 4 Basin (Metropolitan Basin)',
      hazardType,
      hazardTypeLabel: labelMap[hazardType] || 'Hazard',
      severity,
      status: 'Reported',
      depth: `${depthFt} ft (${Math.round(depthFt * 30.48)} cm)`,
      depthValueFt: depthFt,
      reportedTime: 'Just now',
      reportedTimestamp: Date.now(),
      reportedBy: reporterMode === 'anonymous' ? 'Anonymous Citizen' : (contact || 'Citizen Scout'),
      trafficImpact: description || 'Significant water accumulation reported on roadway.',
      verifiedCount: 1,
      notes: description,
      coordinates: {
        lat: 12.935 + (Math.random() - 0.5) * 0.02,
        lng: 77.62 + (Math.random() - 0.5) * 0.02,
        xPercent: 35 + Math.floor(Math.random() * 45),
        yPercent: 35 + Math.floor(Math.random() * 45),
      },
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setSelectedIncidentId(newIncident.id);
    return newIncident;
  };

  const updateStatus = (id: string, newStatus: StatusType) => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const activeHazards = incidents.filter((i) => i.status !== 'Resolved').length;
  const highSeverity = incidents.filter(
    (i) => i.severity === 'high' && i.status !== 'Resolved'
  ).length;
  const resolved = incidents.filter((i) => i.status === 'Resolved').length;
  const totalToday = 80 + incidents.length;

  return (
    <IncidentContext.Provider
      value={{
        incidents,
        selectedIncident,
        setSelectedIncidentId,
        addHazard,
        updateStatus,
        stats: {
          activeHazards: activeHazards || 42,
          highSeverity: highSeverity || 7,
          resolved: resolved + 124,
          totalToday,
        },
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
}

export function useIncidents() {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
}
