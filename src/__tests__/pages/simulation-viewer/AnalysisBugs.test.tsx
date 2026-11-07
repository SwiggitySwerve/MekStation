import { screen, fireEvent, within } from '@testing-library/react';

import {
  mockInvariants,
  mockAnomalies,
  mockViolations,
  renderPage,
  formatTimestamp,
} from './AnalysisBugs.fixtures';

describe('AnalysisBugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      expect(screen.getByTestId('page-title')).toHaveTextContent(
        'Analysis & Bugs',
      );
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
      expect(screen.getByTestId('invariant-heading')).toHaveTextContent(
        'Invariant Status',
      );
      expect(screen.getByTestId('anomaly-heading')).toBeInTheDocument();
      expect(screen.getByTestId('violation-heading')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-heading')).toHaveTextContent(
        'Threshold Configuration',
      );
    });

    it('renders invariant grid', () => {
      renderPage();
      expect(screen.getByTestId('invariant-grid')).toBeInTheDocument();
    });

    it('renders anomaly scroll container', () => {
      renderPage();
      expect(
        screen.getByTestId('anomaly-scroll-container'),
      ).toBeInTheDocument();
    });

    it('renders violation log', () => {
      renderPage();
      expect(
        screen.getByTestId('virtualized-violation-log'),
      ).toBeInTheDocument();
    });

    it('renders filter panel in violation section', () => {
      renderPage();
      const violationSection = screen.getByTestId('violation-section');
      expect(
        within(violationSection).getByTestId('filter-panel'),
      ).toBeInTheDocument();
    });

    it('renders with empty data', () => {
      renderPage({ invariants: [], anomalies: [], violations: [] });
      expect(screen.getByTestId('invariant-empty')).toHaveTextContent(
        'No invariants configured',
      );
      expect(screen.getByTestId('anomaly-empty')).toHaveTextContent(
        'No anomalies detected',
      );
      expect(screen.getByTestId('violation-empty')).toHaveTextContent(
        'No violations',
      );
    });

    it('renders empty invariant message', () => {
      renderPage({ invariants: [] });
      expect(screen.getByTestId('invariant-empty')).toBeInTheDocument();
    });

    it('renders empty anomaly message when all dismissed and toggle off', () => {
      const allDismissed = mockAnomalies.map((a) => ({
        ...a,
        dismissed: true,
      }));
      renderPage({ anomalies: allDismissed });
      expect(screen.getByTestId('anomaly-empty')).toBeInTheDocument();
    });
  });

  describe('Invariant Status', () => {
    it('renders all 12 invariant cards', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      expect(cards).toHaveLength(12);
    });

    it('pass status shows pass badge', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const passCard = cards.find(
        (c) => c.getAttribute('data-status') === 'pass',
      );
      expect(passCard).toBeDefined();
      const badge = within(passCard!).getByTestId('invariant-status-badge');
      expect(badge).toHaveTextContent('pass');
    });

    it('fail status shows fail badge', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const failCard = cards.find(
        (c) => c.getAttribute('data-status') === 'fail',
      );
      expect(failCard).toBeDefined();
      const badge = within(failCard!).getByTestId('invariant-status-badge');
      expect(badge).toHaveTextContent('fail');
    });

    it('pass badge has green styling', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const passCard = cards.find(
        (c) => c.getAttribute('data-status') === 'pass',
      );
      const badge = within(passCard!).getByTestId('invariant-status-badge');
      expect(badge.className).toContain('bg-emerald');
    });

    it('fail badge has red styling', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      const failCard = cards.find(
        (c) => c.getAttribute('data-status') === 'fail',
      );
      const badge = within(failCard!).getByTestId('invariant-status-badge');
      expect(badge.className).toContain('bg-red');
    });

    it('failure count displayed correctly', () => {
      renderPage();
      const failureCounts = screen.getAllByTestId('invariant-failure-count');
      expect(failureCounts.length).toBeGreaterThan(0);
      const fiveFailures = failureCounts.find((el) =>
        el.textContent?.includes('5'),
      );
      expect(fiveFailures).toBeDefined();
    });

    it('failure count is hidden when zero', () => {
      renderPage({ invariants: [mockInvariants[0]] });
      expect(
        screen.queryByTestId('invariant-failure-count'),
      ).not.toBeInTheDocument();
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

  describe('Semantic palette', () => {
    it('uses the semantic deep surface token for the page container', () => {
      renderPage();
      const main = screen.getByTestId('analysis-bugs-page');
      expect(main).toHaveClass('bg-surface-deep');
    });

    it('uses the semantic primary-text token for the title', () => {
      renderPage();
      const title = screen.getByTestId('page-title');
      expect(title).toHaveClass('text-text-theme-primary');
    });

    it('uses the semantic accent token for the threshold slider', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      expect(slider).toHaveClass('accent-accent');
    });
  });

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
      expect(descriptions[0]).toHaveTextContent(
        'Ensures unit HP is always >= 0',
      );
    });

    it('invariant card has correct aria-label', () => {
      renderPage();
      const cards = screen.getAllByTestId('invariant-card');
      expect(cards[0]).toHaveAttribute(
        'aria-label',
        'Unit HP never negative: pass',
      );
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
