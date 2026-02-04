import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import {
  AnalysisBugs,
  formatTimestamp,
} from '@/components/simulation-viewer/pages/AnalysisBugs';
import type {
  IAnalysisBugsProps,
  IInvariant,
  IPageAnomaly,
  IViolation,
  IThresholds,
} from '@/components/simulation-viewer/pages/AnalysisBugs';

/* ---- Mock VirtualizedViolationLog ---- */
/* react-window does not render rows in jsdom, so we mock the component
   to render violations as simple divs with the test IDs the tests expect. */
jest.mock('@/components/simulation-viewer/VirtualizedViolationLog', () => ({
  VirtualizedViolationLog: ({
    violations,
    onViewBattle,
  }: {
    violations: readonly { id: string; type: string; severity: string; message: string; battleId: string; timestamp: string }[];
    onViewBattle?: (battleId: string) => void;
  }) => {
    const fmt = (iso: string): string => {
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch { return iso; }
    };

    if (violations.length === 0) {
      return (
        <div data-testid="virtualized-violation-log">
          <p data-testid="violation-empty">No violations match the current filters.</p>
        </div>
      );
    }
    return (
      <div data-testid="virtualized-violation-log">
        {violations.map((v) => (
          <div key={v.id} data-testid="violation-row" data-severity={v.severity}>
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
  { id: 'inv1', name: 'Unit HP never negative', description: 'Ensures unit HP is always >= 0', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv2', name: 'Armor never exceeds max', description: 'Ensures armor points <= max armor', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv3', name: 'Heat never exceeds capacity', description: 'Ensures heat <= heat capacity', status: 'fail', lastChecked: '2025-01-15T14:30:00Z', failureCount: 3 },
  { id: 'inv4', name: 'Ammo never negative', description: 'Ensures ammo count >= 0', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv5', name: 'Movement never exceeds max', description: 'Ensures movement points <= max MP', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv6', name: 'Weapon range valid', description: 'Ensures weapon ranges are within spec', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv7', name: 'Pilot skill in valid range', description: 'Ensures pilot skills 0-8', status: 'fail', lastChecked: '2025-01-15T14:30:00Z', failureCount: 1 },
  { id: 'inv8', name: 'BV calculation matches formula', description: 'Validates BV2.0 formula output', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv9', name: 'Turn order consistent', description: 'Phase initiative order preserved', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv10', name: 'Phase sequence valid', description: 'Phase transitions follow protocol', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv11', name: 'Unit status transitions valid', description: 'No invalid state transitions', status: 'pass', lastChecked: '2025-01-15T14:30:00Z', failureCount: 0 },
  { id: 'inv12', name: 'Damage totals match individual hits', description: 'Sum of hits equals total damage', status: 'fail', lastChecked: '2025-01-15T14:30:00Z', failureCount: 5 },
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
  { id: 'v1', type: 'heat-suicide', severity: 'critical', message: 'Unit overheated to shutdown', battleId: 'b1', timestamp: '2025-01-15T14:30:00Z' },
  { id: 'v2', type: 'passive-unit', severity: 'warning', message: 'Unit passive for 5 turns', battleId: 'b2', timestamp: '2025-01-15T14:35:00Z' },
  { id: 'v3', type: 'no-progress', severity: 'warning', message: 'No progress for 5 turns', battleId: 'b1', timestamp: '2025-01-15T14:40:00Z' },
  { id: 'v4', type: 'long-game', severity: 'info', message: 'Battle exceeded 50 turns', battleId: 'b3', timestamp: '2025-01-15T14:45:00Z' },
  { id: 'v5', type: 'state-cycle', severity: 'critical', message: 'State cycle detected', battleId: 'b1', timestamp: '2025-01-15T14:50:00Z' },
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
  const severities: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info'];
  const types = ['heat-suicide', 'passive-unit', 'no-progress', 'long-game', 'state-cycle'];
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
  /*  1. Render Tests                                                     */
  /* ================================================================== */
  describe('Rendering', () => {
    it('renders the page container', () => {
      renderPage();
      expect(screen.getByTestId('analysis-bugs-page')).toBeInTheDocument();
    });

    it('renders campaign-id as data attribute', () => {
      renderPage();
      expect(screen.getByTestId('analysis-bugs-page')).toHaveAttribute(
        'data-campaign-id',
        'campaign-001',
      );
    });

    it('renders the page title', () => {
      renderPage();
      expect(screen.getByTestId('page-title')).toHaveTextContent('Analysis & Bugs');
    });

    it('renders invariant status section', () => {
      renderPage();
      expect(screen.getByTestId('invariant-section')).toBeInTheDocument();
    });

    it('renders anomaly section', () => {
      renderPage();
      expect(screen.getByTestId('anomaly-section')).toBeInTheDocument();
    });

    it('renders violation section', () => {
      renderPage();
      expect(screen.getByTestId('violation-section')).toBeInTheDocument();
    });

    it('renders threshold section', () => {
      renderPage();
      expect(screen.getByTestId('threshold-section')).toBeInTheDocument();
    });

    it('renders all four section headings', () => {
      renderPage();
      expect(screen.getByTestId('invariant-heading')).toHaveTextContent('Invariant Status');
      expect(screen.getByTestId('anomaly-heading')).toBeInTheDocument();
      expect(screen.getByTestId('violation-heading')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-heading')).toHaveTextContent('Threshold Configuration');
    });

    it('renders invariant grid', () => {
      renderPage();
      expect(screen.getByTestId('invariant-grid')).toBeInTheDocument();
    });

    it('renders anomaly scroll container', () => {
      renderPage();
      expect(screen.getByTestId('anomaly-scroll-container')).toBeInTheDocument();
    });

    it('renders violation log', () => {
      renderPage();
      expect(screen.getByTestId('virtualized-violation-log')).toBeInTheDocument();
    });

    it('renders filter panel in violation section', () => {
      renderPage();
      const violationSection = screen.getByTestId('violation-section');
      expect(within(violationSection).getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('renders with empty data', () => {
      renderPage({ invariants: [], anomalies: [], violations: [] });
      expect(screen.getByTestId('invariant-empty')).toHaveTextContent('No invariants configured');
      expect(screen.getByTestId('anomaly-empty')).toHaveTextContent('No anomalies detected');
      expect(screen.getByTestId('violation-empty')).toHaveTextContent('No violations');
    });

    it('renders empty invariant message', () => {
      renderPage({ invariants: [] });
      expect(screen.getByTestId('invariant-empty')).toBeInTheDocument();
    });

    it('renders empty anomaly message when all dismissed and toggle off', () => {
      const allDismissed = mockAnomalies.map((a) => ({ ...a, dismissed: true }));
      renderPage({ anomalies: allDismissed });
      expect(screen.getByTestId('anomaly-empty')).toBeInTheDocument();
    });
  });

  /* ================================================================== */
  /*  2. Invariant Tests                                                  */
  /* ================================================================== */
  describe('Invariant Status', () => {
    it('renders all 12 invariant cards', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      expect(cards).toHaveLength(12);
    });

    it('pass status shows pass badge', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const passCard = cards.find((c) => c.getAttribute('data-status') === 'pass');
      expect(passCard).toBeDefined();
      const badge = within(passCard!).getByTestId('invariant-status-badge');
      expect(badge).toHaveTextContent('pass');
    });

    it('fail status shows fail badge', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const failCard = cards.find((c) => c.getAttribute('data-status') === 'fail');
      expect(failCard).toBeDefined();
      const badge = within(failCard!).getByTestId('invariant-status-badge');
      expect(badge).toHaveTextContent('fail');
    });

    it('pass badge has green styling', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const passCard = cards.find((c) => c.getAttribute('data-status') === 'pass');
      const badge = within(passCard!).getByTestId('invariant-status-badge');
      expect(badge.className).toContain('bg-emerald');
    });

    it('fail badge has red styling', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const failCard = cards.find((c) => c.getAttribute('data-status') === 'fail');
      const badge = within(failCard!).getByTestId('invariant-status-badge');
      expect(badge.className).toContain('bg-red');
    });

    it('failure count displayed correctly', () => {
      renderPage();
      const failureCounts = screen.getAllByTestId('invariant-failure-count');
      expect(failureCounts.length).toBeGreaterThan(0);
      const fiveFailures = failureCounts.find((el) => el.textContent?.includes('5'));
      expect(fiveFailures).toBeDefined();
    });

    it('failure count is hidden when zero', () => {
      renderPage({ invariants: [mockInvariants[0]] });
      expect(screen.queryByTestId('invariant-failure-count')).not.toBeInTheDocument();
    });

    it('last checked timestamp is formatted', () => {
      renderPage();
      const timestamps = screen.getAllByTestId('invariant-last-checked');
      expect(timestamps[0].textContent).not.toBe('2025-01-15T14:30:00Z');
      expect(timestamps[0].textContent?.length).toBeGreaterThan(0);
    });

    it('click invariant card triggers onViewInvariant', () => {
      const onViewInvariant = jest.fn();
      renderPage({ onViewInvariant });
      const cards = screen.getAllByTestId('invariant-card');
      fireEvent.click(cards[0]);
      expect(onViewInvariant).toHaveBeenCalledWith('inv1');
    });

    it('keyboard Enter on invariant card triggers onViewInvariant', () => {
      const onViewInvariant = jest.fn();
      renderPage({ onViewInvariant });
      const cards = screen.getAllByTestId('invariant-card');
      fireEvent.keyDown(cards[0], { key: 'Enter' });
      expect(onViewInvariant).toHaveBeenCalledWith('inv1');
    });
  });

  /* ================================================================== */
  /*  3. Anomaly Card Tests                                               */
  /* ================================================================== */
  describe('Anomaly Cards', () => {
    it('renders AnomalyAlertCard for each non-dismissed anomaly', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(4);
    });

    it('renders correct number of anomaly card wrappers', () => {
      renderPage();
      const nonDismissed = mockAnomalies.filter((a) => !a.dismissed);
      nonDismissed.forEach((a) => {
        expect(screen.getByTestId(`anomaly-card-wrapper-${a.id}`)).toBeInTheDocument();
      });
    });

    it('severity styling applied — critical card has red border', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      const criticalCard = cards[0];
      expect(criticalCard.className).toContain('border-red');
    });

    it('severity styling applied — warning card has orange border', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      const warningCard = cards[1];
      expect(warningCard.className).toContain('border-orange');
    });

    it('severity styling applied — info card has blue border', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      const infoCard = cards[2];
      expect(infoCard.className).toContain('border-blue');
    });

    it('View Battle action calls onViewBattle', () => {
      const onViewBattle = jest.fn();
      renderPage({ onViewBattle });
      const viewBattleButtons = screen.getAllByTestId('action-view-battle');
      fireEvent.click(viewBattleButtons[0]);
      expect(onViewBattle).toHaveBeenCalledWith('b1');
    });

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

    it('dismissed anomalies are hidden by default', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(4);
    });

    it('toggle shows dismissed anomalies', () => {
      renderPage();
      const toggle = screen.getByTestId('toggle-dismissed');
      fireEvent.click(toggle);
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(5);
    });

    it('toggle button text changes when toggled', () => {
      renderPage();
      const toggle = screen.getByTestId('toggle-dismissed');
      expect(toggle).toHaveTextContent('Show Dismissed');
      fireEvent.click(toggle);
      expect(toggle).toHaveTextContent('Hide Dismissed');
    });

    it('toggle button has aria-pressed attribute', () => {
      renderPage();
      const toggle = screen.getByTestId('toggle-dismissed');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('does not show toggle when no dismissed anomalies', () => {
      const noDismissed = mockAnomalies.map((a) => ({ ...a, dismissed: false }));
      renderPage({ anomalies: noDismissed });
      expect(screen.queryByTestId('toggle-dismissed')).not.toBeInTheDocument();
    });

    it('anomaly count is displayed in heading', () => {
      renderPage();
      const heading = screen.getByTestId('anomaly-heading');
      expect(heading.textContent).toContain('(4)');
    });

    it('does not render cards when anomalies are empty', () => {
      renderPage({ anomalies: [] });
      expect(screen.queryByTestId('anomaly-alert-card')).not.toBeInTheDocument();
    });

    it('renders anomaly cards from all 5 detector types', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('toggle-dismissed'));
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(5);
    });
  });

  /* ================================================================== */
  /*  4. Violation Log Tests                                              */
  /* ================================================================== */
  describe('Violation Log', () => {
    it('renders all violation rows', () => {
      renderPage();
      const rows = screen.getAllByTestId('violation-row');
      expect(rows).toHaveLength(5);
    });

    it('displays violation count in heading', () => {
      renderPage();
      const heading = screen.getByTestId('violation-heading');
      expect(heading.textContent).toContain('(5)');
    });

    it('filters by severity — critical only', () => {
      renderPage();
      const severitySection = screen.getByTestId('filter-section-severity');
      const criticalCheckbox = within(severitySection).getByTestId('checkbox-severity-critical');
      fireEvent.click(criticalCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('critical');
      });
    });

    it('filters by severity — warning only', () => {
      renderPage();
      const severitySection = screen.getByTestId('filter-section-severity');
      const warningCheckbox = within(severitySection).getByTestId('checkbox-severity-warning');
      fireEvent.click(warningCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('warning');
      });
    });

    it('filters by severity — info only', () => {
      renderPage();
      const infoCheckbox = screen.getByTestId('checkbox-severity-info');
      fireEvent.click(infoCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('info');
      });
    });

    it('filters by type', () => {
      renderPage();
      const typeCheckbox = screen.getByTestId('checkbox-type-heat-suicide');
      fireEvent.click(typeCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(within(row).getByTestId('violation-type')).toHaveTextContent('heat-suicide');
      });
    });

    it('filters by battle', () => {
      renderPage();
      const battleCheckbox = screen.getByTestId('checkbox-battle-b2');
      fireEvent.click(battleCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(within(row).getByTestId('violation-battle')).toHaveTextContent('b2');
      });
    });

    it('combined filters intersect', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('checkbox-severity-critical'));
      fireEvent.click(screen.getByTestId('checkbox-battle-b1'));
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('critical');
        expect(within(row).getByTestId('violation-battle')).toHaveTextContent('b1');
      });
    });

    it('passes all violations to virtualized log (no pagination)', () => {
      const manyViolations = generateViolations(25);
      renderPage({ violations: manyViolations });
      const rows = screen.getAllByTestId('violation-row');
      expect(rows).toHaveLength(25);
    });

    it('View Battle button calls onViewBattle', () => {
      const onViewBattle = jest.fn();
      renderPage({ onViewBattle });
      const viewBattleButtons = screen.getAllByTestId('violation-view-battle');
      fireEvent.click(viewBattleButtons[0]);
      expect(onViewBattle).toHaveBeenCalled();
    });

    it('violation severity badge renders with correct text', () => {
      renderPage();
      const badges = screen.getAllByTestId('violation-severity-badge');
      expect(badges.length).toBeGreaterThan(0);
      const texts = badges.map((b) => b.textContent);
      expect(texts).toContain('critical');
      expect(texts).toContain('warning');
      expect(texts).toContain('info');
    });

    it('shows empty message when filter yields no results', () => {
      renderPage({ violations: [] });
      expect(screen.getByTestId('violation-empty')).toBeInTheDocument();
    });
  });

  /* ================================================================== */
  /*  5. Threshold Config Tests                                           */
  /* ================================================================== */
  describe('Threshold Configuration', () => {
    it('renders all 5 threshold sliders', () => {
      renderPage();
      expect(screen.getByTestId('threshold-slider-heatSuicide')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-slider-passiveUnit')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-slider-noProgress')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-slider-longGame')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-slider-stateCycle')).toBeInTheDocument();
    });

    it('sliders render with correct initial values', () => {
      renderPage();
      expect(screen.getByTestId('threshold-value-heatSuicide')).toHaveTextContent('80');
      expect(screen.getByTestId('threshold-value-passiveUnit')).toHaveTextContent('60');
      expect(screen.getByTestId('threshold-value-noProgress')).toHaveTextContent('70');
      expect(screen.getByTestId('threshold-value-longGame')).toHaveTextContent('90');
      expect(screen.getByTestId('threshold-value-stateCycle')).toHaveTextContent('75');
    });

    it('slider change updates displayed value', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '50' } });
      expect(screen.getByTestId('threshold-value-heatSuicide')).toHaveTextContent('50');
    });

    it('save button calls onThresholdChange for all detectors', () => {
      const onThresholdChange = jest.fn();
      renderPage({ onThresholdChange });
      fireEvent.click(screen.getByTestId('threshold-save'));
      expect(onThresholdChange).toHaveBeenCalledTimes(5);
      expect(onThresholdChange).toHaveBeenCalledWith('heatSuicide', 80);
      expect(onThresholdChange).toHaveBeenCalledWith('passiveUnit', 60);
      expect(onThresholdChange).toHaveBeenCalledWith('noProgress', 70);
      expect(onThresholdChange).toHaveBeenCalledWith('longGame', 90);
      expect(onThresholdChange).toHaveBeenCalledWith('stateCycle', 75);
    });

    it('reset button restores default values', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '10' } });
      expect(screen.getByTestId('threshold-value-heatSuicide')).toHaveTextContent('10');
      fireEvent.click(screen.getByTestId('threshold-reset'));
      expect(screen.getByTestId('threshold-value-heatSuicide')).toHaveTextContent('80');
    });

    it('auto-snapshot toggles render', () => {
      renderPage();
      expect(screen.getByTestId('auto-snapshot-config')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-auto-snapshot-critical')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-auto-snapshot-warning')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-auto-snapshot-info')).toBeInTheDocument();
    });

    it('auto-snapshot critical toggle is on by default', () => {
      renderPage();
      const input = screen.getByTestId('toggle-input-auto-snapshot-critical');
      expect(input).toBeChecked();
    });

    it('auto-snapshot warning toggle is off by default', () => {
      renderPage();
      const input = screen.getByTestId('toggle-input-auto-snapshot-warning');
      expect(input).not.toBeChecked();
    });

    it('auto-snapshot toggle changes state', () => {
      renderPage();
      const input = screen.getByTestId('toggle-input-auto-snapshot-warning');
      fireEvent.click(input);
      expect(input).toBeChecked();
    });

    it('affected anomaly count shows for active detectors', () => {
      renderPage();
      const affected = screen.getAllByTestId(/threshold-affected/);
      expect(affected.length).toBeGreaterThan(0);
    });

    it('slider has accessible aria attributes', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '80');
    });

    it('slider value updates aria-valuenow', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '45' } });
      expect(slider).toHaveAttribute('aria-valuenow', '45');
    });
  });

  /* ================================================================== */
  /*  6. Responsive Layout Tests                                          */
  /* ================================================================== */
  describe('Responsive Layout', () => {
    it('invariant grid has responsive columns', () => {
      renderPage();
      const grid = screen.getByTestId('invariant-grid');
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('md:grid-cols-2');
      expect(grid.className).toContain('lg:grid-cols-4');
    });

    it('violation/threshold section has responsive grid', () => {
      renderPage();
      const violationSection = screen.getByTestId('violation-section');
      expect(violationSection.className).toContain('lg:col-span-3');
    });

    it('threshold section takes 2 columns on desktop', () => {
      renderPage();
      const thresholdSection = screen.getByTestId('threshold-section');
      expect(thresholdSection.className).toContain('lg:col-span-2');
    });

    it('main container has responsive padding', () => {
      renderPage();
      const main = screen.getByTestId('analysis-bugs-page');
      expect(main.className).toContain('p-4');
      expect(main.className).toContain('md:p-6');
      expect(main.className).toContain('lg:p-8');
    });

    it('anomaly cards are horizontally scrollable', () => {
      renderPage();
      const container = screen.getByTestId('anomaly-scroll-container');
      expect(container.className).toContain('overflow-x-auto');
    });
  });

  /* ================================================================== */
  /*  7. Dark Mode Tests                                                  */
  /* ================================================================== */
  describe('Dark Mode', () => {
    it('page container has dark mode background', () => {
      renderPage();
      const main = screen.getByTestId('analysis-bugs-page');
      expect(main.className).toContain('dark:bg-gray-900');
    });

    it('title has dark mode text color', () => {
      renderPage();
      const title = screen.getByTestId('page-title');
      expect(title.className).toContain('dark:text-gray-100');
    });

    it('threshold slider has dark mode accent', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      expect(slider.className).toContain('dark:accent-blue-400');
    });
  });

  /* ================================================================== */
  /*  8. Utility Function Tests                                           */
  /* ================================================================== */
  describe('formatTimestamp', () => {
    it('formats a valid ISO string', () => {
      const result = formatTimestamp('2025-01-15T14:30:00Z');
      expect(result).not.toBe('2025-01-15T14:30:00Z');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns original for invalid input', () => {
      const result = formatTimestamp('not-a-date');
      expect(result).toBe('not-a-date');
    });

    it('returns original for empty string', () => {
      const result = formatTimestamp('');
      expect(result).toBe('');
    });
  });

  /* ================================================================== */
  /*  9. Edge Case & Integration Tests                                    */
  /* ================================================================== */
  describe('Edge Cases', () => {
    it('renders without optional callbacks', () => {
      renderPage({
        onThresholdChange: undefined,
        onDismissAnomaly: undefined,
        onViewSnapshot: undefined,
        onViewBattle: undefined,
        onConfigureThreshold: undefined,
        onViewInvariant: undefined,
      });
      expect(screen.getByTestId('analysis-bugs-page')).toBeInTheDocument();
    });

    it('saves thresholds when onThresholdChange is undefined', () => {
      renderPage({ onThresholdChange: undefined });
      fireEvent.click(screen.getByTestId('threshold-save'));
      expect(screen.getByTestId('analysis-bugs-page')).toBeInTheDocument();
    });

    it('handles single invariant', () => {
      renderPage({ invariants: [mockInvariants[0]] });
      const cards = screen.getAllByTestId('invariant-card');
      expect(cards).toHaveLength(1);
    });

    it('handles single violation', () => {
      renderPage({ violations: [mockViolations[0]] });
      const rows = screen.getAllByTestId('violation-row');
      expect(rows).toHaveLength(1);
    });

    it('displays invariant name in card', () => {
      renderPage();
      const names = screen.getAllByTestId('invariant-name');
      expect(names[0]).toHaveTextContent('Unit HP never negative');
    });

    it('displays invariant description in card', () => {
      renderPage();
      const descriptions = screen.getAllByTestId('invariant-description');
      expect(descriptions[0]).toHaveTextContent('Ensures unit HP is always >= 0');
    });

    it('invariant card has correct aria-label', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      expect(cards[0]).toHaveAttribute('aria-label', 'Unit HP never negative: pass');
    });

    it('violation row displays formatted timestamp', () => {
      renderPage();
      const timestamps = screen.getAllByTestId('violation-timestamp');
      expect(timestamps[0].textContent).not.toBe('2025-01-15T14:30:00Z');
    });

    it('violation row displays message', () => {
      renderPage();
      const messages = screen.getAllByTestId('violation-message');
      expect(messages[0]).toHaveTextContent('State cycle detected');
    });

    it('invariant singular failure text', () => {
      renderPage({ invariants: [{ ...mockInvariants[6], failureCount: 1 }] });
      const failureCount = screen.getByTestId('invariant-failure-count');
      expect(failureCount).toHaveTextContent('1 failure');
      expect(failureCount.textContent).not.toContain('failures');
    });

    it('invariant plural failures text', () => {
      renderPage({ invariants: [mockInvariants[2]] });
      const failureCount = screen.getByTestId('invariant-failure-count');
      expect(failureCount).toHaveTextContent('3 failures');
    });
  });
});
