import { render, screen, fireEvent, within, act } from '@testing-library/react';
import React from 'react';

import type {
  IAnalysisBugsProps,
  IInvariant,
  IPageAnomaly,
  IViolation,
  IThresholds,
} from '@/components/simulation-viewer/pages/AnalysisBugs';

import {
  AnalysisBugs,
  formatTimestamp,
} from '@/components/simulation-viewer/pages/AnalysisBugs';

/* ---- Mock VirtualizedViolationLog ---- */
/* react-window does not render rows in jsdom, so we mock the component
   to render violations as simple divs with the test IDs the tests expect. */
jest.mock('@/components/simulation-viewer/VirtualizedViolationLog', () => ({
  VirtualizedViolationLog: ({
    violations,
    onViewBattle,
  }: {
    violations: readonly {
      id: string;
      type: string;
      severity: string;
      message: string;
      battleId: string;
      timestamp: string;
    }[];
    onViewBattle?: (battleId: string) => void;
  }) => {
    const fmt = (iso: string): string => {
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return iso;
      }
    };

    if (violations.length === 0) {
      return (
        <div data-testid="virtualized-violation-log">
          <p data-testid="violation-empty">
            No violations match the current filters.
          </p>
        </div>
      );
    }
    return (
      <div data-testid="virtualized-violation-log">
        {violations.map((v) => (
          <div
            key={v.id}
            data-testid="violation-row"
            data-severity={v.severity}
          >
            <span data-testid="violation-timestamp">{fmt(v.timestamp)}</span>
            <span data-testid="violation-type">{v.type}</span>
            <span data-testid="violation-severity-badge">{v.severity}</span>
            <span data-testid="violation-message">{v.message}</span>
            <span data-testid="violation-battle">{v.battleId}</span>
            {onViewBattle && (
              <button
                data-testid="violation-view-battle"
                onClick={() => onViewBattle(v.battleId)}
              >
                View Battle
              </button>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

const mockInvariants: IInvariant[] = [
  {
    id: 'inv1',
    name: 'Unit HP never negative',
    description: 'Ensures unit HP is always >= 0',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv2',
    name: 'Armor never exceeds max',
    description: 'Ensures armor points <= max armor',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv3',
    name: 'Heat never exceeds capacity',
    description: 'Ensures heat <= heat capacity',
    status: 'fail',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 3,
  },
  {
    id: 'inv4',
    name: 'Ammo never negative',
    description: 'Ensures ammo count >= 0',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv5',
    name: 'Movement never exceeds max',
    description: 'Ensures movement points <= max MP',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv6',
    name: 'Weapon range valid',
    description: 'Ensures weapon ranges are within spec',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv7',
    name: 'Pilot skill in valid range',
    description: 'Ensures pilot skills 0-8',
    status: 'fail',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 1,
  },
  {
    id: 'inv8',
    name: 'BV calculation matches formula',
    description: 'Validates BV2.0 formula output',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv9',
    name: 'Turn order consistent',
    description: 'Phase initiative order preserved',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv10',
    name: 'Phase sequence valid',
    description: 'Phase transitions follow protocol',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv11',
    name: 'Unit status transitions valid',
    description: 'No invalid state transitions',
    status: 'pass',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 0,
  },
  {
    id: 'inv12',
    name: 'Damage totals match individual hits',
    description: 'Sum of hits equals total damage',
    status: 'fail',
    lastChecked: '2025-01-15T14:30:00Z',
    failureCount: 5,
  },
];

const mockAnomalies: IPageAnomaly[] = [
  {
    id: 'a1',
    detector: 'heat-suicide',
    severity: 'critical',
    title: 'Heat Suicide Detected',
    description: 'Unit overheated to shutdown threshold',
    battleId: 'b1',
    snapshotId: 's1',
    timestamp: '2025-01-15T14:30:00Z',
    dismissed: false,
  },
  {
    id: 'a2',
    detector: 'passive-unit',
    severity: 'warning',
    title: 'Passive Unit Detected',
    description: 'Unit did not attack for 5 consecutive turns',
    battleId: 'b2',
    snapshotId: 's2',
    timestamp: '2025-01-15T14:35:00Z',
    dismissed: false,
  },
  {
    id: 'a3',
    detector: 'no-progress',
    severity: 'warning',
    title: 'No Progress',
    description: 'Battle state unchanged for 5 turns',
    battleId: 'b1',
    snapshotId: 's3',
    timestamp: '2025-01-15T14:40:00Z',
    dismissed: true,
  },
  {
    id: 'a4',
    detector: 'long-game',
    severity: 'info',
    title: 'Long Game',
    description: 'Battle exceeded 50 turns',
    battleId: 'b3',
    snapshotId: 's4',
    timestamp: '2025-01-15T14:45:00Z',
    dismissed: false,
  },
  {
    id: 'a5',
    detector: 'state-cycle',
    severity: 'critical',
    title: 'State Cycle Detected',
    description: 'Repeating state pattern detected',
    battleId: 'b1',
    snapshotId: 's5',
    timestamp: '2025-01-15T14:50:00Z',
    dismissed: false,
  },
];

const mockViolations: IViolation[] = [
  {
    id: 'v1',
    type: 'heat-suicide',
    severity: 'critical',
    message: 'Unit overheated to shutdown',
    battleId: 'b1',
    timestamp: '2025-01-15T14:30:00Z',
  },
  {
    id: 'v2',
    type: 'passive-unit',
    severity: 'warning',
    message: 'Unit passive for 5 turns',
    battleId: 'b2',
    timestamp: '2025-01-15T14:35:00Z',
  },
  {
    id: 'v3',
    type: 'no-progress',
    severity: 'warning',
    message: 'No progress for 5 turns',
    battleId: 'b1',
    timestamp: '2025-01-15T14:40:00Z',
  },
  {
    id: 'v4',
    type: 'long-game',
    severity: 'info',
    message: 'Battle exceeded 50 turns',
    battleId: 'b3',
    timestamp: '2025-01-15T14:45:00Z',
  },
  {
    id: 'v5',
    type: 'state-cycle',
    severity: 'critical',
    message: 'State cycle detected',
    battleId: 'b1',
    timestamp: '2025-01-15T14:50:00Z',
  },
];

const mockThresholds: IThresholds = {
  heatSuicide: 80,
  passiveUnit: 60,
  noProgress: 70,
  longGame: 90,
  stateCycle: 75,
};

const defaultProps: IAnalysisBugsProps = {
  campaignId: 'campaign-001',
  invariants: mockInvariants,
  anomalies: mockAnomalies,
  violations: mockViolations,
  thresholds: mockThresholds,
  onThresholdChange: jest.fn(),
  onDismissAnomaly: jest.fn(),
  onViewSnapshot: jest.fn(),
  onViewBattle: jest.fn(),
  onConfigureThreshold: jest.fn(),
  onViewInvariant: jest.fn(),
};

function renderPage(overrides: Partial<IAnalysisBugsProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<AnalysisBugs {...props} />);
}

function generateViolations(count: number): IViolation[] {
  const severities: Array<'critical' | 'warning' | 'info'> = [
    'critical',
    'warning',
    'info',
  ];
  const types = [
    'heat-suicide',
    'passive-unit',
    'no-progress',
    'long-game',
    'state-cycle',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `v-gen-${i}`,
    type: types[i % types.length],
    severity: severities[i % severities.length],
    message: `Violation ${i}`,
    battleId: `b${(i % 3) + 1}`,
    timestamp: new Date(2025, 0, 15, 14, i).toISOString(),
  }));
}

describe('AnalysisBugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ================================================================== */
  /*  3. Anomaly Card Tests                                               */
  /* ================================================================== */
  describe('Anomaly Cards', () => {
    it('Dismiss action calls onDismissAnomaly', () => {
      jest.useFakeTimers();
      const onDismissAnomaly = jest.fn();
      renderPage({ onDismissAnomaly });
      const dismissButtons = screen.getAllByTestId('action-dismiss');
      fireEvent.click(dismissButtons[0]);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onDismissAnomaly).toHaveBeenCalledWith('a1');
      jest.useRealTimers();
    });
  });
});
