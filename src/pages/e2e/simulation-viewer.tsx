/**
 * E2E Test Harness for Simulation Viewer
 *
 * Renders the full Simulation Viewer with mock data for Playwright E2E testing.
 * Only available in development/test environments.
 *
 * @internal For E2E testing only
 */

import { useState, useCallback, useMemo } from 'react';
import { TabNavigation } from '@/components/simulation-viewer/TabNavigation';
import { CampaignDashboard } from '@/components/simulation-viewer/pages/CampaignDashboard';
import { EncounterHistory } from '@/components/simulation-viewer/pages/EncounterHistory';
import { AnalysisBugs } from '@/components/simulation-viewer/pages/AnalysisBugs';
import type { ICampaignDashboardMetrics } from '@/types/simulation-viewer';
import type { IBattle } from '@/components/simulation-viewer/pages/EncounterHistory';
import type {
  IInvariant,
  IPageAnomaly,
  IViolation,
  IThresholds,
} from '@/components/simulation-viewer/pages/AnalysisBugs';

// Block in production
const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_TEST === 'true';

/* ========================================================================== */
/*  Mock Data                                                                  */
/* ========================================================================== */

const MOCK_METRICS: ICampaignDashboardMetrics = {
  roster: { active: 12, wounded: 3, kia: 1, total: 16 },
  force: {
    operational: 10,
    damaged: 4,
    destroyed: 2,
    totalBV: 25000,
    damagedBV: 7000,
  },
  financialTrend: [
    { date: '2025-01-01', balance: 1200000, income: 200000, expenses: 150000 },
    { date: '2025-01-08', balance: 1350000, income: 250000, expenses: 100000 },
    { date: '2025-01-15', balance: 1500000, income: 250000, expenses: 180000 },
    { date: '2025-02-01', balance: 1400000, income: 200000, expenses: 300000 },
    { date: '2025-02-15', balance: 1600000, income: 350000, expenses: 150000 },
  ],
  progression: {
    missionsCompleted: 24,
    missionsTotal: 32,
    winRate: 0.75,
    totalXP: 4800,
    averageXPPerMission: 200,
  },
  topPerformers: [
    {
      personId: 'p1',
      name: 'Natasha Kerensky',
      rank: 'Colonel',
      kills: 15,
      xp: 2500,
      survivalRate: 1.0,
      missionsCompleted: 20,
    },
    {
      personId: 'p2',
      name: 'Kai Allard-Liao',
      rank: 'Captain',
      kills: 12,
      xp: 2000,
      survivalRate: 0.95,
      missionsCompleted: 18,
    },
    {
      personId: 'p3',
      name: 'Aidan Pryde',
      rank: 'Star Commander',
      kills: 10,
      xp: 1800,
      survivalRate: 0.9,
      missionsCompleted: 16,
    },
  ],
  warnings: { lowFunds: true, manyWounded: true, lowBV: false },
};

const MOCK_BATTLES: IBattle[] = [
  {
    id: 'battle-1',
    missionId: 'mission-1',
    missionName: 'Operation Bulldog',
    timestamp: '2025-06-15T10:00:00Z',
    duration: 420,
    outcome: 'victory',
    forces: {
      player: {
        units: [
          { id: 'u1', name: 'Atlas AS7-D', pilot: 'Natasha Kerensky', status: 'operational' },
          { id: 'u2', name: 'Marauder MAD-3R', pilot: 'Kai Allard-Liao', status: 'damaged' },
        ],
        totalBV: 5200,
      },
      enemy: {
        units: [
          { id: 'e1', name: 'Timber Wolf Prime', pilot: 'Star Captain Vlad', status: 'destroyed' },
          { id: 'e2', name: 'Dire Wolf Prime', pilot: 'Star Colonel Ward', status: 'damaged' },
        ],
        totalBV: 6100,
      },
    },
    damageMatrix: {
      attackers: ['u1', 'u2'],
      targets: ['e1', 'e2'],
      cells: [
        { attackerId: 'u1', targetId: 'e1', damage: 85 },
        { attackerId: 'u1', targetId: 'e2', damage: 40 },
        { attackerId: 'u2', targetId: 'e1', damage: 55 },
        { attackerId: 'u2', targetId: 'e2', damage: 20 },
      ],
    },
    keyMoments: [
      {
        id: 'km1',
        turn: 3,
        phase: 'Weapon Attack',
        tier: 'critical',
        type: 'headshot',
        description: 'Atlas headshot on Timber Wolf',
        involvedUnits: ['u1', 'e1'],
      },
      {
        id: 'km2',
        turn: 5,
        phase: 'Physical Attack',
        tier: 'major',
        type: 'fall',
        description: 'Dire Wolf falls after leg damage',
        involvedUnits: ['e2'],
      },
    ],
    events: [
      { id: 'ev1', turn: 1, phase: 'Movement', timestamp: 1, type: 'movement', description: 'Atlas advances to hex 0505', involvedUnits: ['u1'] },
      { id: 'ev2', turn: 1, phase: 'Weapon Attack', timestamp: 2, type: 'attack', description: 'Atlas fires AC/20 at Timber Wolf', involvedUnits: ['u1', 'e1'] },
      { id: 'ev3', turn: 2, phase: 'Movement', timestamp: 3, type: 'movement', description: 'Marauder flanks to hex 0607', involvedUnits: ['u2'] },
      { id: 'ev4', turn: 2, phase: 'Weapon Attack', timestamp: 4, type: 'attack', description: 'Marauder fires PPCs at Dire Wolf', involvedUnits: ['u2', 'e2'] },
      { id: 'ev5', turn: 3, phase: 'Weapon Attack', timestamp: 5, type: 'attack', description: 'Atlas headshot on Timber Wolf', involvedUnits: ['u1', 'e1'] },
      { id: 'ev6', turn: 3, phase: 'Damage', timestamp: 6, type: 'damage', description: 'Timber Wolf destroyed — head destroyed', involvedUnits: ['e1'] },
      { id: 'ev7', turn: 4, phase: 'Movement', timestamp: 7, type: 'movement', description: 'Dire Wolf attempts retreat', involvedUnits: ['e2'] },
      { id: 'ev8', turn: 5, phase: 'Physical Attack', timestamp: 8, type: 'damage', description: 'Dire Wolf falls after leg damage', involvedUnits: ['e2'] },
    ],
    stats: { totalKills: 1, totalDamage: 200, unitsLost: 0 },
  },
  {
    id: 'battle-2',
    missionId: 'mission-1',
    missionName: 'Operation Bulldog',
    timestamp: '2025-06-16T14:00:00Z',
    duration: 300,
    outcome: 'victory',
    forces: {
      player: {
        units: [
          { id: 'u3', name: 'Hunchback HBK-4G', pilot: 'Aidan Pryde', status: 'operational' },
        ],
        totalBV: 2800,
      },
      enemy: {
        units: [
          { id: 'e3', name: 'Stormcrow Prime', pilot: 'Star Commander Trent', status: 'destroyed' },
        ],
        totalBV: 3100,
      },
    },
    damageMatrix: {
      attackers: ['u3'],
      targets: ['e3'],
      cells: [{ attackerId: 'u3', targetId: 'e3', damage: 120 }],
    },
    keyMoments: [
      {
        id: 'km3',
        turn: 4,
        phase: 'Weapon Attack',
        tier: 'major',
        type: 'kill',
        description: 'Hunchback destroys Stormcrow with AC/20',
        involvedUnits: ['u3', 'e3'],
      },
    ],
    events: [
      { id: 'ev9', turn: 1, phase: 'Movement', timestamp: 1, type: 'movement', description: 'Hunchback takes position', involvedUnits: ['u3'] },
      { id: 'ev10', turn: 2, phase: 'Weapon Attack', timestamp: 2, type: 'attack', description: 'Hunchback fires AC/20', involvedUnits: ['u3', 'e3'] },
      { id: 'ev11', turn: 3, phase: 'Movement', timestamp: 3, type: 'movement', description: 'Stormcrow closes range', involvedUnits: ['e3'] },
      { id: 'ev12', turn: 4, phase: 'Weapon Attack', timestamp: 4, type: 'attack', description: 'Hunchback destroys Stormcrow', involvedUnits: ['u3', 'e3'] },
    ],
    stats: { totalKills: 1, totalDamage: 120, unitsLost: 0 },
  },
  {
    id: 'battle-3',
    missionId: 'mission-2',
    missionName: 'Garrison Duty',
    timestamp: '2025-06-20T08:00:00Z',
    duration: 600,
    outcome: 'defeat',
    forces: {
      player: {
        units: [
          { id: 'u4', name: 'Locust LCT-1V', pilot: 'MechWarrior Doe', status: 'destroyed' },
        ],
        totalBV: 800,
      },
      enemy: {
        units: [
          { id: 'e4', name: 'Mad Cat Mk II', pilot: 'Galaxy Commander Pryde', status: 'operational' },
        ],
        totalBV: 4500,
      },
    },
    damageMatrix: {
      attackers: ['u4', 'e4'],
      targets: ['u4', 'e4'],
      cells: [
        { attackerId: 'u4', targetId: 'e4', damage: 10 },
        { attackerId: 'e4', targetId: 'u4', damage: 150 },
      ],
    },
    keyMoments: [
      {
        id: 'km4',
        turn: 2,
        phase: 'Weapon Attack',
        tier: 'critical',
        type: 'ammo-explosion',
        description: 'Locust ammo explosion',
        involvedUnits: ['u4'],
      },
    ],
    events: [
      { id: 'ev13', turn: 1, phase: 'Movement', timestamp: 1, type: 'movement', description: 'Locust scouts ahead', involvedUnits: ['u4'] },
      { id: 'ev14', turn: 2, phase: 'Weapon Attack', timestamp: 2, type: 'attack', description: 'Mad Cat fires alpha strike', involvedUnits: ['e4', 'u4'] },
      { id: 'ev15', turn: 2, phase: 'Damage', timestamp: 3, type: 'damage', description: 'Locust ammo explosion — destroyed', involvedUnits: ['u4'] },
    ],
    stats: { totalKills: 0, totalDamage: 10, unitsLost: 1 },
  },
];

const MOCK_INVARIANTS: IInvariant[] = [
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

const MOCK_ANOMALIES: IPageAnomaly[] = [
  {
    id: 'anom-1',
    detector: 'heat-suicide',
    severity: 'critical',
    title: 'Detected Heat Suicide',
    description: 'Unit repeatedly fired alpha strikes causing shutdown and death',
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

const MOCK_VIOLATIONS: IViolation[] = [
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

const MOCK_THRESHOLDS: IThresholds = {
  heatSuicide: 80,
  passiveUnit: 60,
  noProgress: 70,
  longGame: 90,
  stateCycle: 75,
};

/* ========================================================================== */
/*  Component                                                                  */
/* ========================================================================== */

type TabId = 'campaign-dashboard' | 'encounter-history' | 'analysis-bugs';

export default function SimulationViewerTestPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('campaign-dashboard');
  const [isDark, setIsDark] = useState(false);
  const [thresholds, setThresholds] = useState<IThresholds>(MOCK_THRESHOLDS);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);
  }, []);

  const handleDrillDown = useCallback((target: string, _context: Record<string, unknown>) => {
    if (target === 'encounter-history' || target === 'analysis-bugs' || target === 'campaign-dashboard') {
      setActiveTab(target as TabId);
    }
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  const handleThresholdChange = useCallback((detector: string, value: number) => {
    setThresholds((prev) => ({ ...prev, [detector]: value }));
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 3000);
  }, []);

  // Memoize battle count by outcome for filter testing
  const victoryCount = useMemo(
    () => MOCK_BATTLES.filter((b) => b.outcome === 'victory').length,
    [],
  );

  if (!isTestEnv) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Not Available</h1>
        <p>This page is only available in development/test environments.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      data-testid="simulation-viewer-harness"
      data-victory-count={victoryCount}
    >
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-testid="harness-label">
          Simulation Viewer E2E Harness
        </span>
        <button
          type="button"
          onClick={handleToggleDarkMode}
          className="px-4 py-2 min-h-[44px] text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          data-testid="dark-mode-toggle"
        >
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Panels */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        data-testid={`panel-${activeTab}`}
      >
        {activeTab === 'campaign-dashboard' && (
          <CampaignDashboard
            campaignId="test-campaign-001"
            metrics={MOCK_METRICS}
            onDrillDown={handleDrillDown}
          />
        )}

        {activeTab === 'encounter-history' && (
          <EncounterHistory
            campaignId="test-campaign-001"
            battles={MOCK_BATTLES}
            onDrillDown={handleDrillDown}
          />
        )}

        {activeTab === 'analysis-bugs' && (
          <AnalysisBugs
            campaignId="test-campaign-001"
            invariants={MOCK_INVARIANTS}
            anomalies={MOCK_ANOMALIES}
            violations={MOCK_VIOLATIONS}
            thresholds={thresholds}
            onThresholdChange={handleThresholdChange}
          />
        )}
      </div>

      {/* Threshold Saved Toast */}
      {thresholdSaved && (
        <div
          className="fixed bottom-4 right-4 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg"
          data-testid="threshold-saved-toast"
          role="status"
        >
          Thresholds saved
        </div>
      )}
    </div>
  );
}
