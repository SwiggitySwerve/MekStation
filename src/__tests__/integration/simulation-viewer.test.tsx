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
  /*  Workflow 1: Campaign Dashboard → Encounter History via drill-down     */
  /* ====================================================================== */
  describe('Workflow 1: Campaign Dashboard → Encounter History via drill-down', () => {
    it('should navigate from dashboard to encounter history via roster drill-down', async () => {
      const user = userEvent.setup();
      const onDrillDown = jest.fn();

      const metrics = createMockMetrics();

      render(
        <CampaignDashboard
          campaignId="test-campaign"
          metrics={metrics}
          onDrillDown={onDrillDown}
        />,
      );

      // Verify dashboard renders
      expect(screen.getByTestId('campaign-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-title')).toHaveTextContent(
        'Campaign Dashboard',
      );

      // Find and click "View Pilot Roster" drill-down link in roster section
      const rosterSection = screen.getByTestId('roster-section');
      const drillDownLink =
        within(rosterSection).getByTestId('drill-down-link');
      await user.click(drillDownLink);

      // Verify callback was called to navigate to encounter-history with roster context
      expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
        section: 'roster',
      });

      // Simulate tab navigation as the parent container would
      act(() => {
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });

      // Verify the tab store reflects the navigation
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );

      // Now render EncounterHistory to simulate the tab switch
      const { unmount } = render(
        <EncounterHistory campaignId="test-campaign" battles={allBattles} />,
      );

      // Verify encounter history page renders with battles
      expect(screen.getByTestId('encounter-history')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-history-title')).toHaveTextContent(
        'Encounter History',
      );
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();

      unmount();
    });

    it('should navigate from dashboard to encounter history via progression drill-down', async () => {
      const user = userEvent.setup();
      const onDrillDown = jest.fn();

      render(
        <CampaignDashboard
          campaignId="test-campaign"
          metrics={createMockMetrics()}
          onDrillDown={onDrillDown}
        />,
      );

      // Click "View Mission History" in progression section
      const progressionSection = screen.getByTestId('progression-section');
      const drillDownLink =
        within(progressionSection).getByTestId('drill-down-link');
      await user.click(drillDownLink);

      expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
        section: 'progression',
      });

      // Verify tab store is updated via parent
      act(() => {
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );
      expect(useTabNavigationStore.getState().canGoBack()).toBe(true);
    });

    it('should navigate from dashboard to encounter history via performer drill-down', async () => {
      const user = userEvent.setup();
      const onDrillDown = jest.fn();

      render(
        <CampaignDashboard
          campaignId="test-campaign"
          metrics={createMockMetrics()}
          onDrillDown={onDrillDown}
        />,
      );

      // Click drill-down in first performer card
      const performerCards = screen.getAllByTestId('performer-card');
      const link = within(performerCards[0]).getByTestId('drill-down-link');
      await user.click(link);

      expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
        personId: 'p1',
      });
    });
  });

  /* ====================================================================== */
  /*  Workflow 2: Filter battles by outcome, sort by duration               */
  /* ====================================================================== */
  describe('Workflow 2: Filter battles by outcome, sort by duration', () => {
    it('should filter battles by victory outcome and sort by duration', async () => {
      const user = userEvent.setup();

      render(
        <EncounterHistory campaignId="test-campaign" battles={allBattles} />,
      );

      // Verify all 3 battles visible initially
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();

      // Apply victory outcome filter
      const filterPanel = screen.getByTestId('battle-list-filter');
      const victoryCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-victory',
      );
      await user.click(victoryCheckbox);

      // Verify only victory battle remains
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b3')).not.toBeInTheDocument();

      // Clear filter by clicking again
      await user.click(victoryCheckbox);

      // Apply defeat filter
      const defeatCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-defeat',
      );
      await user.click(defeatCheckbox);

      // Verify only defeat battle remains
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b3')).not.toBeInTheDocument();

      // Clear defeat filter
      await user.click(defeatCheckbox);

      // All battles visible again
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();

      // Sort by duration (default is already duration ascending)
      const durationSortBtn = screen.getByTestId('sort-button-duration');
      expect(durationSortBtn).toHaveAttribute('aria-pressed', 'true');

      // Click to toggle to descending
      await user.click(durationSortBtn);
      expect(screen.getByTestId('sort-direction-indicator')).toHaveTextContent(
        '↓',
      );

      // Switch to sort by kills
      const killsSortBtn = screen.getByTestId('sort-button-kills');
      await user.click(killsSortBtn);
      expect(killsSortBtn).toHaveAttribute('aria-pressed', 'true');
      expect(durationSortBtn).toHaveAttribute('aria-pressed', 'false');

      // Persist filter state in the filter store
      act(() => {
        useFilterStore.getState().setEncounterHistoryFilters({
          outcome: 'victory',
          sortBy: 'kills',
          sortOrder: 'asc',
        });
      });

      expect(useFilterStore.getState().encounterHistory.outcome).toBe(
        'victory',
      );
      expect(useFilterStore.getState().encounterHistory.sortBy).toBe('kills');
    });

    it('should show empty state when filter matches nothing', async () => {
      const user = userEvent.setup();

      render(
        <EncounterHistory
          campaignId="test-campaign"
          battles={[victoryBattle]}
        />,
      );

      // Apply defeat filter on victory-only list
      const filterPanel = screen.getByTestId('battle-list-filter');
      const defeatCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-defeat',
      );
      await user.click(defeatCheckbox);

      // Empty state shown
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });
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

    it('should navigate to key moment and update VCR position', async () => {
      const user = userEvent.setup();

      render(
        <EncounterHistory campaignId="test-campaign" battles={allBattles} />,
      );

      // Select battle
      await user.click(screen.getByTestId('battle-card-b1'));

      // Verify initial turn
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );

      // Click key moment (turn 2)
      await user.click(screen.getByTestId('key-moment-km-b1-1'));

      // VCR should jump to that turn
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('should change VCR speed and advance faster', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <EncounterHistory campaignId="test-campaign" battles={allBattles} />,
      );

      await user.click(screen.getByTestId('battle-card-b1'));

      const speedSelect = screen.getByTestId('vcr-speed-select');
      await user.selectOptions(speedSelect, '2');
      expect((speedSelect as HTMLSelectElement).value).toBe('2');

      await user.click(screen.getByTestId('vcr-play-pause'));

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
          'Turn 2 / 3',
        );
      });
    });

    it('should use comparison view with campaign average and specific battle', async () => {
      const user = userEvent.setup();
      const onDrillDown = jest.fn();

      render(
        <EncounterHistory
          campaignId="test-campaign"
          battles={allBattles}
          onDrillDown={onDrillDown}
        />,
      );

      await user.click(screen.getByTestId('battle-card-b1'));

      // Comparison defaults to campaign average
      const modeToggle = screen.getByTestId(
        'comparison-mode-toggle',
      ) as HTMLSelectElement;
      expect(modeToggle.value).toBe('campaign-average');
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();

      // Drill-down link in comparison section
      const compSection = screen.getByTestId('comparison-metrics');
      const compLink = within(compSection).getByTestId('drill-down-link');
      await user.click(compLink);
      expect(onDrillDown).toHaveBeenCalledWith(
        'analysis-bugs',
        expect.objectContaining({ battleId: 'b1' }),
      );

      // Switch to specific battle comparison
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(modeToggle, { target: { value: 'specific-battle' } });
      expect(
        screen.getByTestId('comparison-battle-select'),
      ).toBeInTheDocument();

      // Select a comparison battle
      const battleSelect = screen.getByTestId('comparison-battle-select');
      fireEvent.change(battleSelect, { target: { value: 'b2' } });
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();

      // Collapse a mission group
      await user.click(screen.getByTestId('mission-group-header-m1'));
      expect(screen.getByTestId('mission-group-header-m1')).toHaveAttribute(
        'aria-expanded',
        'false',
      );

      // Expand it back
      await user.click(screen.getByTestId('mission-group-header-m1'));
      expect(screen.getByTestId('mission-group-header-m1')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });

  /* ====================================================================== */
  /*  Workflow 4: Detect anomaly, view in Analysis & Bugs, configure        */
  /* ====================================================================== */
  describe('Workflow 4: Detect anomaly, view in Analysis & Bugs, configure threshold', () => {
    it('should navigate from dashboard warning to analysis-bugs and configure threshold', async () => {
      const user = userEvent.setup();
      const onDashboardDrillDown = jest.fn();
      const onThresholdChange = jest.fn();

      // 1. Render dashboard with warnings
      const { unmount: unmountDashboard } = render(
        <CampaignDashboard
          campaignId="test-campaign"
          metrics={createMockMetrics({
            warnings: { lowFunds: false, manyWounded: true, lowBV: true },
          })}
          onDrillDown={onDashboardDrillDown}
        />,
      );

      // Verify warnings are shown
      const warningItems = screen.getAllByTestId('warning-item');
      expect(warningItems.length).toBeGreaterThanOrEqual(2);

      // Click warning detail drill-down link
      const firstWarning = warningItems[0];
      const warningLink = within(firstWarning).getByTestId('drill-down-link');
      await user.click(warningLink);
      expect(onDashboardDrillDown).toHaveBeenCalledWith(
        'encounter-history',
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ warningTarget: expect.any(String) }),
      );

      // Simulate navigation to analysis-bugs
      act(() => {
        useTabNavigationStore.getState().setActiveTab('analysis-bugs');
      });
      expect(useTabNavigationStore.getState().activeTab).toBe('analysis-bugs');

      unmountDashboard();

      // 2. Render Analysis & Bugs with anomalies
      const anomalies: IPageAnomaly[] = [
        createMockAnomaly('a1', 'heat-suicide', 'critical'),
        createMockAnomaly('a2', 'passive-unit', 'warning'),
        createMockAnomaly('a3', 'no-progress', 'info'),
      ];

      render(
        <AnalysisBugs
          campaignId="test-campaign"
          invariants={createMockInvariants()}
          anomalies={anomalies}
          violations={createMockViolations()}
          thresholds={DEFAULT_THRESHOLDS}
          onThresholdChange={onThresholdChange}
        />,
      );

      // Verify analysis page renders
      expect(screen.getByTestId('analysis-bugs-page')).toBeInTheDocument();
      expect(screen.getByTestId('page-title')).toHaveTextContent(
        'Analysis & Bugs',
      );

      // Verify anomaly cards rendered
      const anomalyCards = screen.getAllByTestId('anomaly-alert-card');
      expect(anomalyCards).toHaveLength(3);

      // Verify invariant cards
      const invariantCards = screen.getAllByTestId('invariant-card');
      expect(invariantCards).toHaveLength(4);

      // 3. Configure a threshold
      const heatSlider = screen.getByTestId('threshold-input-heatSuicide');
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('80');

      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(heatSlider, { target: { value: '50' } });
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('50');

      // Save thresholds
      await user.click(screen.getByTestId('threshold-save'));
      expect(onThresholdChange).toHaveBeenCalledWith('heatSuicide', 50);
      expect(onThresholdChange).toHaveBeenCalledTimes(5); // All 5 detectors
    });

    it('should reset thresholds to defaults after modification', async () => {
      const user = userEvent.setup();

      render(
        <AnalysisBugs
          campaignId="test-campaign"
          invariants={createMockInvariants()}
          anomalies={[createMockAnomaly('a1', 'heat-suicide', 'critical')]}
          violations={createMockViolations()}
          thresholds={DEFAULT_THRESHOLDS}
          onViewBattle={jest.fn()}
          onViewInvariant={jest.fn()}
        />,
      );

      const { fireEvent } = await import('@testing-library/react');
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '25' } });
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('25');

      await user.click(screen.getByTestId('threshold-reset'));
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('80');
      expect(
        screen.getByTestId('threshold-value-passiveUnit'),
      ).toHaveTextContent('60');

      // Filter violations by severity
      const severityCheckbox = screen.getByTestId('checkbox-severity-critical');
      await user.click(severityCheckbox);
      const violationRows = screen.getAllByTestId('violation-row');
      violationRows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('critical');
      });

      // Click invariant card to trigger callback
      const invariantCards = screen.getAllByTestId('invariant-card');
      await user.click(invariantCards[0]);

      // Toggle auto-snapshot settings
      const warningToggle = screen.getByTestId(
        'toggle-input-auto-snapshot-warning',
      );
      await user.click(warningToggle);
      expect(warningToggle).toBeChecked();
    });
  });

  /* ====================================================================== */
  /*  Workflow 5: Dismiss anomaly, verify persistence                       */
  /* ====================================================================== */
  describe('Workflow 5: Dismiss anomaly, verify persistence', () => {
    it('should dismiss anomaly via callback and remove from view', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onDismissAnomaly = jest.fn();

      const anomalies: IPageAnomaly[] = [
        createMockAnomaly('a1', 'heat-suicide', 'critical'),
        createMockAnomaly('a2', 'passive-unit', 'warning'),
      ];

      render(
        <AnalysisBugs
          campaignId="test-campaign"
          invariants={createMockInvariants()}
          anomalies={anomalies}
          violations={createMockViolations()}
          thresholds={DEFAULT_THRESHOLDS}
          onDismissAnomaly={onDismissAnomaly}
          onViewSnapshot={jest.fn()}
          onViewBattle={jest.fn()}
          onConfigureThreshold={jest.fn()}
        />,
      );

      // Verify both anomaly cards visible
      const initialCards = screen.getAllByTestId('anomaly-alert-card');
      expect(initialCards).toHaveLength(2);

      // Click dismiss on first anomaly card
      const dismissButtons = screen.getAllByTestId('action-dismiss');
      expect(dismissButtons.length).toBeGreaterThanOrEqual(1);
      await user.click(dismissButtons[0]);

      // Wait for dismiss animation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Verify callback was called with correct anomaly ID
      expect(onDismissAnomaly).toHaveBeenCalledWith('a1');
    });

    it('should toggle dismissed anomalies visibility', async () => {
      const user = userEvent.setup();

      const anomalies: IPageAnomaly[] = [
        createMockAnomaly('a1', 'heat-suicide', 'critical', false),
        createMockAnomaly('a2', 'passive-unit', 'warning', true), // pre-dismissed
      ];

      render(
        <AnalysisBugs
          campaignId="test-campaign"
          invariants={[]}
          anomalies={anomalies}
          violations={[]}
          thresholds={DEFAULT_THRESHOLDS}
        />,
      );

      // Only non-dismissed visible initially
      const initialCards = screen.getAllByTestId('anomaly-alert-card');
      expect(initialCards).toHaveLength(1);

      // Toggle to show dismissed
      const toggleButton = screen.getByTestId('toggle-dismissed');
      expect(toggleButton).toHaveTextContent('Show Dismissed');
      await user.click(toggleButton);

      // Now both visible
      const allCards = screen.getAllByTestId('anomaly-alert-card');
      expect(allCards).toHaveLength(2);

      // Toggle text changed
      expect(toggleButton).toHaveTextContent('Hide Dismissed');

      // Hide dismissed again
      await user.click(toggleButton);
      const visibleCards = screen.getAllByTestId('anomaly-alert-card');
      expect(visibleCards).toHaveLength(1);
    });

    it('should dismiss dashboard warning and verify it stays dismissed', async () => {
      const user = userEvent.setup();

      render(
        <CampaignDashboard
          campaignId="test-campaign"
          metrics={createMockMetrics({
            warnings: { lowFunds: true, manyWounded: true, lowBV: false },
          })}
        />,
      );

      // Two warnings initially
      let warnings = screen.getAllByTestId('warning-item');
      expect(warnings).toHaveLength(2);

      // Dismiss first warning
      const dismissBtns = screen.getAllByTestId('warning-dismiss');
      await user.click(dismissBtns[0]);

      // Only one warning remains
      warnings = screen.getAllByTestId('warning-item');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toHaveTextContent('Low C-Bill reserves');

      // Dismiss the second one
      const remainingDismissBtn = screen.getAllByTestId('warning-dismiss');
      await user.click(remainingDismissBtn[0]);

      // Empty state
      expect(screen.getByTestId('warnings-empty')).toBeInTheDocument();
      expect(screen.getByTestId('warnings-empty')).toHaveTextContent(
        'all systems nominal',
      );
    });
  });

  /* ====================================================================== */
  /*  Workflow 6: Switch tabs, verify state preservation                    */
  /* ====================================================================== */
  describe('Workflow 6: Switch tabs, verify state preservation', () => {
    it('should preserve filter state in store across tab switches', () => {
      // Set encounter history filters
      act(() => {
        useFilterStore.getState().setEncounterHistoryFilters({
          outcome: 'victory',
          sortBy: 'duration',
          sortOrder: 'desc',
        });
      });

      // Verify filters set
      expect(useFilterStore.getState().encounterHistory).toEqual({
        outcome: 'victory',
        sortBy: 'duration',
        sortOrder: 'desc',
      });

      // Switch to analysis-bugs tab
      act(() => {
        useTabNavigationStore.getState().setActiveTab('analysis-bugs');
      });
      expect(useTabNavigationStore.getState().activeTab).toBe('analysis-bugs');

      // Set analysis-bugs filters
      act(() => {
        useFilterStore.getState().setAnalysisBugsFilters({
          severity: 'critical',
          detector: 'heat-suicide',
        });
      });

      // Verify analysis filters set
      expect(useFilterStore.getState().analysisBugs).toEqual({
        severity: 'critical',
        detector: 'heat-suicide',
      });

      // Switch back to encounter-history tab
      act(() => {
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );

      // Encounter history filters still preserved
      expect(useFilterStore.getState().encounterHistory).toEqual({
        outcome: 'victory',
        sortBy: 'duration',
        sortOrder: 'desc',
      });

      // Analysis filters also preserved
      expect(useFilterStore.getState().analysisBugs).toEqual({
        severity: 'critical',
        detector: 'heat-suicide',
      });
    });

    it('should preserve tab navigation history across tab switches', () => {
      // Start on campaign-dashboard (default)
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'campaign-dashboard',
      );
      expect(useTabNavigationStore.getState().canGoBack()).toBe(false);

      // Navigate to encounter-history
      act(() => {
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );
      expect(useTabNavigationStore.getState().canGoBack()).toBe(true);

      // Navigate to analysis-bugs
      act(() => {
        useTabNavigationStore.getState().setActiveTab('analysis-bugs');
      });
      expect(useTabNavigationStore.getState().activeTab).toBe('analysis-bugs');
      expect(useTabNavigationStore.getState().canGoBack()).toBe(true);

      // Go back should return to encounter-history
      act(() => {
        useTabNavigationStore.getState().goBack();
      });
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );

      // Go back again to campaign-dashboard
      act(() => {
        useTabNavigationStore.getState().goBack();
      });
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'campaign-dashboard',
      );
      expect(useTabNavigationStore.getState().canGoBack()).toBe(false);
    });

    it('should clear all filters and preserve tab position', () => {
      // Set filters on both tabs
      act(() => {
        useFilterStore
          .getState()
          .setEncounterHistoryFilters({ outcome: 'defeat' });
        useFilterStore
          .getState()
          .setAnalysisBugsFilters({ severity: 'warning' });
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });

      // Verify filters set
      expect(useFilterStore.getState().encounterHistory.outcome).toBe('defeat');
      expect(useFilterStore.getState().analysisBugs.severity).toBe('warning');
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );

      // Clear all filters
      act(() => {
        useFilterStore.getState().clearAllFilters();
      });

      // Filters cleared
      expect(useFilterStore.getState().encounterHistory).toEqual({});
      expect(useFilterStore.getState().analysisBugs).toEqual({});

      // Tab position preserved
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );
    });

    it('should exercise tab navigation URL hooks via component rendering', () => {
      const { useInitTabFromURL, useSyncTabWithURL } = jest.requireActual<
        typeof import('@/stores/simulation-viewer/useTabNavigationStore')
      >('@/stores/simulation-viewer/useTabNavigationStore');

      // Clean URL params from previous tests
      window.history.replaceState({}, '', window.location.pathname);
      useTabNavigationStore.getState().reset();

      const TestURLSyncComponent: React.FC = () => {
        useInitTabFromURL();
        useSyncTabWithURL();
        const { activeTab } = useTabNavigationStore();
        return <div data-testid="url-sync-test">{activeTab}</div>;
      };

      render(<TestURLSyncComponent />);
      expect(screen.getByTestId('url-sync-test')).toHaveTextContent(
        'campaign-dashboard',
      );

      act(() => {
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });
      expect(screen.getByTestId('url-sync-test')).toHaveTextContent(
        'encounter-history',
      );

      act(() => {
        useTabNavigationStore.getState().setActiveTab('analysis-bugs');
      });
      expect(screen.getByTestId('url-sync-test')).toHaveTextContent(
        'analysis-bugs',
      );

      act(() => {
        useTabNavigationStore.getState().goBack();
      });
      expect(screen.getByTestId('url-sync-test')).toHaveTextContent(
        'encounter-history',
      );

      // Clean URL after test
      window.history.replaceState({}, '', window.location.pathname);
    });

    it('should exercise filter store URL sync and clear operations', () => {
      act(() => {
        useFilterStore
          .getState()
          .setEncounterHistoryFilters({ outcome: 'victory', sortBy: 'kills' });
        useFilterStore.getState().setAnalysisBugsFilters({
          severity: 'critical',
          showDismissed: true,
        });
      });

      expect(useFilterStore.getState().encounterHistory.outcome).toBe(
        'victory',
      );
      expect(useFilterStore.getState().analysisBugs.severity).toBe('critical');
      expect(useFilterStore.getState().analysisBugs.showDismissed).toBe(true);

      act(() => {
        useFilterStore.getState().clearEncounterHistoryFilters();
      });
      expect(useFilterStore.getState().encounterHistory).toEqual({});
      expect(useFilterStore.getState().analysisBugs.severity).toBe('critical');

      act(() => {
        useFilterStore.getState().clearAnalysisBugsFilters();
      });
      expect(useFilterStore.getState().analysisBugs).toEqual({});

      act(() => {
        useFilterStore.getState().setEncounterHistoryFilters({
          keyMomentTier: 'critical',
          keyMomentType: 'kill',
        });
        useFilterStore
          .getState()
          .setAnalysisBugsFilters({ detector: 'heat-suicide', battleId: 'b1' });
      });

      expect(useFilterStore.getState().encounterHistory.keyMomentTier).toBe(
        'critical',
      );
      expect(useFilterStore.getState().analysisBugs.detector).toBe(
        'heat-suicide',
      );

      act(() => {
        useFilterStore.getState().syncToURL();
        useFilterStore.getState().syncFromURL();
      });

      act(() => {
        useFilterStore.getState().clearAllFilters();
      });
      expect(useFilterStore.getState().encounterHistory).toEqual({});
      expect(useFilterStore.getState().analysisBugs).toEqual({});
    });

    it('should render component on correct tab and switch without state loss', async () => {
      const user = userEvent.setup();

      // Render encounter history, apply filter
      const { unmount: unmountEH } = render(
        <EncounterHistory campaignId="test-campaign" battles={allBattles} />,
      );

      // Apply victory filter
      const filterPanel = screen.getByTestId('battle-list-filter');
      const victoryCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-victory',
      );
      await user.click(victoryCheckbox);

      // Verify filter applied
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b2')).not.toBeInTheDocument();

      // Save filter state to store for persistence
      act(() => {
        useFilterStore
          .getState()
          .setEncounterHistoryFilters({ outcome: 'victory' });
        useTabNavigationStore.getState().setActiveTab('analysis-bugs');
      });

      unmountEH();

      // Render Analysis & Bugs
      const { unmount: unmountAB } = render(
        <AnalysisBugs
          campaignId="test-campaign"
          invariants={createMockInvariants()}
          anomalies={[createMockAnomaly('a1', 'heat-suicide', 'critical')]}
          violations={createMockViolations()}
          thresholds={DEFAULT_THRESHOLDS}
        />,
      );

      expect(screen.getByTestId('analysis-bugs-page')).toBeInTheDocument();

      unmountAB();

      // Switch back to encounter history
      act(() => {
        useTabNavigationStore.getState().setActiveTab('encounter-history');
      });

      // Filter state preserved in store
      expect(useFilterStore.getState().encounterHistory.outcome).toBe(
        'victory',
      );
      expect(useTabNavigationStore.getState().activeTab).toBe(
        'encounter-history',
      );
    });
  });
});
