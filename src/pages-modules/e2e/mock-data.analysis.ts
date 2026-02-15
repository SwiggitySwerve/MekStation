import type {
  IInvariant,
  IPageAnomaly,
  IThresholds,
  IViolation,
} from '@/components/simulation-viewer/pages/AnalysisBugs';

export const MOCK_INVARIANTS: IInvariant[] = [
  {
    id: 'inv-1',
    name: 'Heat Tracking',
    description: 'Verify heat scale is correctly tracked each turn',
    status: 'pass',
    lastChecked: '2025-06-20T12:00:00Z',
    failureCount: 0,
  },
  {
    id: 'inv-2',
    name: 'Damage Consistency',
    description: 'Ensure damage applied matches weapon damage tables',
    status: 'fail',
    lastChecked: '2025-06-20T12:00:00Z',
    failureCount: 3,
  },
  {
    id: 'inv-3',
    name: 'Movement Validation',
    description: 'Confirm units do not exceed MP limits',
    status: 'pass',
    lastChecked: '2025-06-20T12:00:00Z',
    failureCount: 0,
  },
  {
    id: 'inv-4',
    name: 'Ammo Tracking',
    description: 'Verify ammo consumption matches shots fired',
    status: 'pass',
    lastChecked: '2025-06-20T12:00:00Z',
    failureCount: 0,
  },
];

export const MOCK_ANOMALIES: IPageAnomaly[] = [
  {
    id: 'anom-1',
    detector: 'heat-suicide',
    severity: 'critical',
    title: 'Detected Heat Suicide',
    description:
      'Unit repeatedly fired alpha strikes causing shutdown and death',
    battleId: 'battle-1',
    snapshotId: 'snap-1',
    timestamp: '2025-06-15T10:05:00Z',
    dismissed: false,
  },
  {
    id: 'anom-2',
    detector: 'passive-unit',
    severity: 'warning',
    title: 'Passive Unit Detected',
    description: 'Unit did not fire for 3 consecutive turns',
    battleId: 'battle-2',
    snapshotId: 'snap-2',
    timestamp: '2025-06-16T14:03:00Z',
    dismissed: false,
  },
];

export const MOCK_VIOLATIONS: IViolation[] = [
  {
    id: 'viol-1',
    type: 'heat-suicide',
    severity: 'critical',
    message: 'Unit self-destructed via overheating',
    battleId: 'battle-1',
    timestamp: '2025-06-15T10:05:00Z',
  },
  {
    id: 'viol-2',
    type: 'passive-unit',
    severity: 'warning',
    message: 'Unit inactive for 3+ turns',
    battleId: 'battle-2',
    timestamp: '2025-06-16T14:03:00Z',
  },
  {
    id: 'viol-3',
    type: 'no-progress',
    severity: 'info',
    message: 'Battle stalled — no damage dealt for 5 turns',
    battleId: 'battle-3',
    timestamp: '2025-06-20T08:10:00Z',
  },
];

export const MOCK_THRESHOLDS: IThresholds = {
  heatSuicide: 80,
  passiveUnit: 60,
  noProgress: 70,
  longGame: 90,
  stateCycle: 75,
};
