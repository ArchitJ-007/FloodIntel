import {
  calculateRiskScore,
  type RiskCategory,
  type ConfidenceLevel,
  type ScoreBreakdown,
} from './riskEngine.ts';

export type SeverityType = 'high' | 'moderate' | 'low' | 'cleared';
export type StatusType = 'Reported' | 'Under Review' | 'In Progress' | 'Resolved';
export type HazardCategory = 'waterlogging' | 'flooded_road' | 'blocked_road' | 'drainage_failure';
export type DataProvenance = 'demo' | 'user' | 'partner';
export type VerificationStatus = 'demo' | 'unverified' | 'corroborated' | 'verified' | 'resolved' | 'expired';

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
  depthCm: number | null;
  reportedTime: string;
  reportedTimestamp: number;
  createdAt: number;
  updatedAt: number;
  reportedBy: string;
  trafficImpact: string;
  verifiedCount: number;
  corroborationCount: number;
  provenance: DataProvenance;
  verificationStatus: VerificationStatus;
  riskScore: number | null;
  riskCategory: RiskCategory;
  confidence: ConfidenceLevel;
  scoreBreakdown: ScoreBreakdown;
  warnings: string[];
  sensorNode?: string;
  flowVelocity?: string;
  photoUrl?: string;
  coordinates: {
    lat: number;
    lng: number;
    xPercent: number;
    yPercent: number;
  };
  notes?: string;
}

export function normalizeSeverity(severity: SeverityType | string): 'minor' | 'moderate' | 'severe' {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'severe':
      return 'severe';
    case 'moderate':
      return 'moderate';
    case 'low':
    case 'minor':
    case 'cleared':
    default:
      return 'minor';
  }
}

function createDemoIncident(seed: {
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
  depthCm: number;
  reportedTime: string;
  minutesAgo: number;
  reportedBy: string;
  trafficImpact: string;
  verifiedCount: number;
  corroborationCount: number;
  sensorNode?: string;
  flowVelocity?: string;
  photoUrl?: string;
  coordinates: { lat: number; lng: number; xPercent: number; yPercent: number };
  notes?: string;
}): Incident {
  // Use deterministic baseline timestamp (30 mins relative fixed offset)
  const now = 1791520000000;
  const reportedTimestamp = now - seed.minutesAgo * 60 * 1000;

  const riskResult = calculateRiskScore({
    severity: normalizeSeverity(seed.severity),
    depthCm: seed.depthCm,
    rainRiskIndex: null,
    reportedTimestamp,
    nowTimestamp: now,
    corroborationCount: seed.corroborationCount,
    verificationStatus: 'demo',
    provenance: 'demo',
  });

  return {
    ...seed,
    reportedTimestamp,
    createdAt: reportedTimestamp,
    updatedAt: now,
    provenance: 'demo',
    verificationStatus: 'demo',
    riskScore: riskResult.score,
    riskCategory: riskResult.category,
    confidence: riskResult.confidence,
    scoreBreakdown: riskResult.breakdown,
    warnings: riskResult.warnings,
  };
}

export function getInitialDemoIncidents(): Incident[] {
  return [
    createDemoIncident({
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
      depthCm: 76,
      reportedTime: '18m ago',
      minutesAgo: 18,
      reportedBy: 'Citizen Scout #42',
      trafficImpact: 'Impassable for sedans and two-wheelers. Rapid surface accumulation observed; drainage runoff valve RV-12 blocked with debris.',
      verifiedCount: 12,
      corroborationCount: 12,
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
    }),
    createDemoIncident({
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
      depthCm: 58,
      reportedTime: '34m ago',
      minutesAgo: 34,
      reportedBy: 'Ward Monitor ST-18',
      trafficImpact: 'Single lane passable only for high-clearance emergency trucks. Transit rerouted via North Spine.',
      verifiedCount: 8,
      corroborationCount: 8,
      sensorNode: 'Gauge Node #31 (1.85 ft)',
      flowVelocity: '2.1 m/s',
      coordinates: {
        lat: 12.9412,
        lng: 77.6321,
        xPercent: 68,
        yPercent: 32,
      },
      notes: 'Drainage grate submerged beneath floating debris.',
    }),
    createDemoIncident({
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
      depthCm: 24,
      reportedTime: '1h ago',
      minutesAgo: 60,
      reportedBy: 'Citizen Scout #19',
      trafficImpact: 'Slow movement, moderate ponding along outer perimeter roadway.',
      verifiedCount: 5,
      corroborationCount: 5,
      sensorNode: 'Gauge Node #12 (0.75 ft)',
      flowVelocity: '1.2 m/s',
      coordinates: {
        lat: 12.928,
        lng: 77.615,
        xPercent: 78,
        yPercent: 65,
      },
    }),
    createDemoIncident({
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
      depthCm: 18,
      reportedTime: '2h ago',
      minutesAgo: 120,
      reportedBy: 'Highway Patrol Car 9',
      trafficImpact: 'Pumping crew cleared culvert. Traffic moving normally with caution.',
      verifiedCount: 14,
      corroborationCount: 14,
      sensorNode: 'Gauge Node #08 (0.2 ft - Normal)',
      flowVelocity: '0.5 m/s',
      coordinates: {
        lat: 12.955,
        lng: 77.64,
        xPercent: 88,
        yPercent: 26,
      },
    }),
    createDemoIncident({
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
      depthCm: 12,
      reportedTime: '5m ago',
      minutesAgo: 5,
      reportedBy: 'Anonymous Citizen',
      trafficImpact: 'Curbside water pooling. Sidewalk inaccessible.',
      verifiedCount: 2,
      corroborationCount: 2,
      sensorNode: 'Gauge Node #44 (0.4 ft)',
      flowVelocity: '0.3 m/s',
      coordinates: {
        lat: 12.939,
        lng: 77.625,
        xPercent: 55,
        yPercent: 58,
      },
    }),
    createDemoIncident({
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
      depthCm: 3,
      reportedTime: '3h ago',
      minutesAgo: 180,
      reportedBy: 'City Water Works Team B',
      trafficImpact: 'Normal passage restored. Debris cleared.',
      verifiedCount: 22,
      corroborationCount: 22,
      sensorNode: 'Station ST-402 (Normal)',
      flowVelocity: '1.0 m/s',
      coordinates: {
        lat: 12.945,
        lng: 77.63,
        xPercent: 52,
        yPercent: 74,
      },
    }),
  ];
}
