/**
 * Simulation Viewer Integration Tests
 *
 * Tests full user workflows across all three Simulation Viewer tabs:
 * 1. Campaign Dashboard → Encounter History navigation via drill-down
 * 2. Filter battles by outcome, sort by duration
 * 3. View battle detail, expand timeline, play VCR controls
 * 4. Detect anomaly, view in Analysis & Bugs, configure threshold
 * 5. Dismiss anomaly, verify persistence
 * 6. Switch tabs, verify state preservation
 */

import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type {
  IInvariant,
  IPageAnomaly,
  IViolation,
  IThresholds,
} from '@/components/simulation-viewer/pages/AnalysisBugs';
import type { IBattle } from '@/components/simulation-viewer/pages/EncounterHistory';
import type { ICampaignDashboardMetrics } from '@/types/simulation-viewer';

import { AnalysisBugs } from '@/components/simulation-viewer/pages/AnalysisBugs';
import { CampaignDashboard } from '@/components/simulation-viewer/pages/CampaignDashboard';
import { EncounterHistory } from '@/components/simulation-viewer/pages/EncounterHistory';
import { useFilterStore } from '@/stores/simulation-viewer/useFilterStore';
import { useTabNavigationStore } from '@/stores/simulation-viewer/useTabNavigationStore';

/* ========================================================================== */
/*  Mocks for virtualised components (react-window doesn't work in jsdom)     */
/* ========================================================================== */

jest.mock('@/components/simulation-viewer/VirtualizedTimeline', () => ({
  VirtualizedTimeline: ({
    events,
    onEventClick,
    resolveUnitName,
  }: {
    events: ReadonlyArray<{
      id: string;
      turn: number;
      phase: string;
      timestamp: number;
      type: string;
      description: string;
      involvedUnits: string[];
    }>;
    onEventClick?: (event: {
      id: string;
      turn: number;
      phase: string;
      timestamp: number;
      type: string;
      description: string;
      involvedUnits: string[];
    }) => void;
    resolveUnitName?: (unitId: string) => string;
  }) => (
    <div data-testid="virtualized-timeline">
      {events.map((event) => (
        <div
          key={event.id}
          data-testid={`timeline-event-${event.id}`}
          onClick={() => onEventClick?.(event)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEventClick?.(event);
          }}
        >
          <span data-testid={`event-turn-${event.id}`}>Turn {event.turn}</span>
          <span data-testid={`event-desc-${event.id}`}>
            {event.description}
          </span>
          <span data-testid={`event-units-${event.id}`}>
            {event.involvedUnits
              .map((u) => resolveUnitName?.(u) ?? u)
              .join(', ')}
          </span>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/simulation-viewer/VirtualizedViolationLog', () => ({
  VirtualizedViolationLog: ({
    violations,
    onViewBattle,
  }: {
    violations: ReadonlyArray<{
      id: string;
      type: string;
      severity: string;
      message: string;
      battleId: string;
      timestamp: string;
    }>;
    onViewBattle?: (battleId: string) => void;
  }) => {
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

/* ========================================================================== */
/*  Mock Data Factories                                                        */
/* ========================================================================== */

function createMockMetrics(
  overrides: Partial<ICampaignDashboardMetrics> = {},
): ICampaignDashboardMetrics {
  return {
    roster: { active: 8, wounded: 2, kia: 1, total: 11 },
    force: {
      operational: 6,
      damaged: 3,
      destroyed: 1,
      totalBV: 18000,
      damagedBV: 5000,
    },
    financialTrend: [
      {
        date: '2025-01-01',
        balance: 1200000,
        income: 200000,
        expenses: 150000,
      },
      {
        date: '2025-01-15',
        balance: 1350000,
        income: 220000,
        expenses: 170000,
      },
    ],
    progression: {
      missionsCompleted: 12,
      missionsTotal: 20,
      winRate: 0.75,
      totalXP: 3600,
      averageXPPerMission: 300,
    },
    topPerformers: [
      {
        personId: 'p1',
        name: 'Natasha Kerensky',
        rank: 'Colonel',
        kills: 15,
        xp: 2500,
        survivalRate: 1.0,
        missionsCompleted: 12,
      },
      {
        personId: 'p2',
        name: 'Kai Allard-Liao',
        rank: 'Captain',
        kills: 10,
        xp: 1800,
        survivalRate: 0.95,
        missionsCompleted: 10,
      },
    ],
    warnings: { lowFunds: false, manyWounded: true, lowBV: false },
    ...overrides,
  };
}

function createMockBattle(
  id: string,
  outcome: 'victory' | 'defeat' | 'draw',
  duration: number,
  overrides: Partial<IBattle> = {},
): IBattle {
  return {
    id,
    missionId: overrides.missionId ?? 'm1',
    missionName: overrides.missionName ?? 'Operation Bulldog',
    timestamp: overrides.timestamp ?? '2025-01-15T14:00:00Z',
    duration,
    outcome,
    forces: overrides.forces ?? {
      player: {
        units: [
          {
            id: 'pu1',
            name: 'Atlas AS7-D',
            pilot: 'Natasha Kerensky',
            status: 'operational',
          },
          {
            id: 'pu2',
            name: 'Timber Wolf',
            pilot: 'Aidan Pryde',
            status: 'damaged',
          },
        ],
        totalBV: 5000,
      },
      enemy: {
        units: [
          { id: 'eu1', name: 'Mad Cat', pilot: 'Enemy 1', status: 'destroyed' },
          {
            id: 'eu2',
            name: 'Dire Wolf',
            pilot: 'Enemy 2',
            status: 'operational',
          },
        ],
        totalBV: 4800,
      },
    },
    damageMatrix: overrides.damageMatrix ?? {
      attackers: ['pu1', 'pu2'],
      targets: ['eu1', 'eu2'],
      cells: [
        { attackerId: 'pu1', targetId: 'eu1', damage: 50 },
        { attackerId: 'pu1', targetId: 'eu2', damage: 20 },
        { attackerId: 'pu2', targetId: 'eu1', damage: 30 },
        { attackerId: 'pu2', targetId: 'eu2', damage: 10 },
      ],
    },
    keyMoments: overrides.keyMoments ?? [
      {
        id: `km-${id}-1`,
        turn: 2,
        phase: 'Weapon Attack',
        tier: 'critical',
        type: 'kill',
        description: 'Atlas destroys Mad Cat',
        involvedUnits: ['pu1', 'eu1'],
      },
      {
        id: `km-${id}-2`,
        turn: 4,
        phase: 'Status',
        tier: 'minor',
        type: 'shutdown',
        description: 'Timber Wolf overheats',
        involvedUnits: ['pu2'],
      },
    ],
    events: overrides.events ?? [
      {
        id: `ev-${id}-1`,
        turn: 1,
        phase: 'Movement',
        timestamp: 0,
        type: 'movement',
        description: 'Atlas advances',
        involvedUnits: ['pu1'],
      },
      {
        id: `ev-${id}-2`,
        turn: 1,
        phase: 'Weapon Attack',
        timestamp: 10,
        type: 'attack',
        description: 'Atlas fires PPC',
        involvedUnits: ['pu1', 'eu1'],
      },
      {
        id: `ev-${id}-3`,
        turn: 2,
        phase: 'Movement',
        timestamp: 20,
        type: 'movement',
        description: 'Timber Wolf flanks',
        involvedUnits: ['pu2'],
      },
      {
        id: `ev-${id}-4`,
        turn: 2,
        phase: 'Weapon Attack',
        timestamp: 30,
        type: 'attack',
        description: 'Atlas headshots Mad Cat',
        involvedUnits: ['pu1', 'eu1'],
      },
      {
        id: `ev-${id}-5`,
        turn: 3,
        phase: 'Weapon Attack',
        timestamp: 40,
        type: 'damage',
        description: 'Timber Wolf fires LRMs',
        involvedUnits: ['pu2', 'eu2'],
      },
    ],
    stats: overrides.stats ?? { totalKills: 2, totalDamage: 110, unitsLost: 0 },
    ...overrides,
  };
}

function createMockAnomaly(
  id: string,
  detector:
    | 'heat-suicide'
    | 'passive-unit'
    | 'no-progress'
    | 'long-game'
    | 'state-cycle',
  severity: 'critical' | 'warning' | 'info',
  dismissed: boolean = false,
): IPageAnomaly {
  return {
    id,
    detector,
    severity,
    title: `${detector} detected`,
    description: `Anomaly ${id}: ${detector} at ${severity} level`,
    battleId: 'b1',
    snapshotId: `snap-${id}`,
    timestamp: '2025-01-15T14:30:00Z',
    dismissed,
  };
}

function createMockInvariants(): IInvariant[] {
  return [
    {
      id: 'inv1',
      name: 'Unit HP non-negative',
      description: 'HP >= 0',
      status: 'pass',
      lastChecked: '2025-01-15T14:30:00Z',
      failureCount: 0,
    },
    {
      id: 'inv2',
      name: 'Heat within capacity',
      description: 'Heat <= max heat',
      status: 'fail',
      lastChecked: '2025-01-15T14:30:00Z',
      failureCount: 3,
    },
    {
      id: 'inv3',
      name: 'Ammo non-negative',
      description: 'Ammo >= 0',
      status: 'pass',
      lastChecked: '2025-01-15T14:30:00Z',
      failureCount: 0,
    },
    {
      id: 'inv4',
      name: 'Movement valid',
      description: 'MP <= max',
      status: 'pass',
      lastChecked: '2025-01-15T14:30:00Z',
      failureCount: 0,
    },
  ];
}

function createMockViolations(): IViolation[] {
  return [
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
      severity: 'info',
      message: 'No progress for 5 turns',
      battleId: 'b1',
      timestamp: '2025-01-15T14:40:00Z',
    },
  ];
}

const DEFAULT_THRESHOLDS: IThresholds = {
  heatSuicide: 80,
  passiveUnit: 60,
  noProgress: 70,
  longGame: 90,
  stateCycle: 75,
};

/* ========================================================================== */
/*  Test Data                                                                  */
/* ========================================================================== */

const victoryBattle = createMockBattle('b1', 'victory', 1200, {
  missionId: 'm1',
  missionName: 'Raid on Tukayyid',
  timestamp: '2025-01-15T14:00:00Z',
  stats: { totalKills: 3, totalDamage: 150, unitsLost: 0 },
});

const defeatBattle = createMockBattle('b2', 'defeat', 600, {
  missionId: 'm1',
  missionName: 'Raid on Tukayyid',
  timestamp: '2025-01-16T10:00:00Z',
  stats: { totalKills: 0, totalDamage: 40, unitsLost: 2 },
});

const drawBattle = createMockBattle('b3', 'draw', 3600, {
  missionId: 'm2',
  missionName: 'Defense of Luthien',
  timestamp: '2025-01-17T08:00:00Z',
  stats: { totalKills: 1, totalDamage: 80, unitsLost: 1 },
});

const allBattles: IBattle[] = [victoryBattle, defeatBattle, drawBattle];

/* ========================================================================== */
/*  Integration Tests                                                          */
/* ========================================================================== */

describe('Simulation Viewer Integration Tests', () => {
  beforeEach(() => {
    // Reset Zustand stores to initial state
    useTabNavigationStore.getState().reset();
    useFilterStore.getState().clearAllFilters();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /* ====================================================================== */
  /*  Workflow 3: View battle detail, timeline, VCR controls                */
  /* ====================================================================== */
  describe('Workflow 3: View battle detail, expand timeline, play VCR controls', () => {
    it('should select battle, view forces, and use VCR controls', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <EncounterHistory campaignId="test-campaign" battles={allBattles} />,
      );

      // Initially no battle selected
      expect(screen.getByTestId('no-battle-selected')).toBeInTheDocument();

      // Click first battle card to select it
      await user.click(screen.getByTestId('battle-card-b1'));

      // Detail view appears
      expect(
        screen.queryByTestId('no-battle-selected'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('forces-section')).toBeInTheDocument();

      // Verify player force units displayed
      const playerForce = screen.getByTestId('player-force');
      expect(playerForce).toHaveTextContent('Atlas AS7-D');
      expect(playerForce).toHaveTextContent('Timber Wolf');
      expect(playerForce).toHaveTextContent('Natasha Kerensky');

      // Verify enemy force displayed
      const enemyForce = screen.getByTestId('enemy-force');
      expect(enemyForce).toHaveTextContent('Mad Cat');
      expect(enemyForce).toHaveTextContent('Dire Wolf');

      // Verify outcome summary
      const outcomeSummary = screen.getByTestId('outcome-summary');
      expect(outcomeSummary).toHaveTextContent('Victory');

      // Verify damage matrix
      expect(screen.getByTestId('damage-matrix')).toBeInTheDocument();
      expect(screen.getByTestId('damage-cell-pu1-eu1')).toHaveTextContent('50');

      // Verify key moments rendered
      expect(screen.getByTestId('key-moments-timeline')).toBeInTheDocument();
      expect(screen.getByTestId(`key-moment-km-b1-1`)).toBeInTheDocument();

      // Verify event timeline with VCR controls
      expect(screen.getByTestId('vcr-controls')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );

      // Step forward through timeline
      await user.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );

      // Step back
      await user.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );

      // Play the timeline
      await user.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');

      // Advance timer to move to turn 2
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
          'Turn 2 / 3',
        );
      });

      // Pause
      await user.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });
  });
});
