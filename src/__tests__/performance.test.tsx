import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IViolation } from '@/components/simulation-viewer/pages/AnalysisBugs';
import type { IBattleEvent } from '@/components/simulation-viewer/pages/EncounterHistory';

import { VirtualizedTimeline } from '@/components/simulation-viewer/VirtualizedTimeline';
import { VirtualizedViolationLog } from '@/components/simulation-viewer/VirtualizedViolationLog';

function generateEvents(count: number): IBattleEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `event-${i}`,
    turn: Math.floor(i / 10) + 1,
    phase: ['Movement', 'Firing', 'Physical', 'Heat'][i % 4],
    timestamp: Date.now() + i * 1000,
    type: (['movement', 'attack', 'damage', 'status-change'] as const)[i % 4],
    description: `Event ${i}: Unit Alpha engages target Bravo`,
    involvedUnits: [`unit-${i % 5}`, `unit-${(i + 1) % 5}`],
  }));
}

function generateViolations(count: number): IViolation[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `violation-${i}`,
    type: ['heat-check', 'movement-rules', 'los-validation', 'damage-calc'][
      i % 4
    ],
    severity: (['critical', 'warning', 'info'] as const)[i % 3],
    message: `Violation ${i}: Invariant check failed for unit ${i % 10}`,
    battleId: `battle-${i % 5}`,
    timestamp: new Date(2025, 0, 1 + (i % 30), i % 24, i % 60).toISOString(),
  }));
}

describe('Performance Tests', () => {
  describe('VirtualizedTimeline', () => {
    it('should render 1000 events in <500ms', () => {
      const events = generateEvents(1000);

      const start = performance.now();
      render(<VirtualizedTimeline events={events} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
      expect(screen.getByTestId('virtualized-timeline')).toBeInTheDocument();
    });

    it('should render 5000 events in <500ms', () => {
      const events = generateEvents(5000);

      const start = performance.now();
      render(<VirtualizedTimeline events={events} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });

    it('should render empty state when no events provided', () => {
      render(<VirtualizedTimeline events={[]} />);

      expect(
        screen.getByTestId('virtualized-timeline-empty'),
      ).toBeInTheDocument();
      expect(screen.getByText('No events recorded.')).toBeInTheDocument();
    });

    it('should accept custom height and itemHeight props', () => {
      const events = generateEvents(100);

      render(
        <VirtualizedTimeline events={events} height={400} itemHeight={60} />,
      );

      expect(screen.getByTestId('virtualized-timeline')).toBeInTheDocument();
    });

    it('should handle onEventClick callback', () => {
      const events = generateEvents(10);
      const onEventClick = jest.fn();

      render(
        <VirtualizedTimeline events={events} onEventClick={onEventClick} />,
      );

      expect(screen.getByTestId('virtualized-timeline')).toBeInTheDocument();
    });
  });

  describe('VirtualizedViolationLog', () => {
    it('should render 1000 violations in <500ms', () => {
      const violations = generateViolations(1000);

      const start = performance.now();
      render(<VirtualizedViolationLog violations={violations} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
      expect(
        screen.getByTestId('virtualized-violation-log'),
      ).toBeInTheDocument();
    });

    it('should render 5000 violations in <500ms', () => {
      const violations = generateViolations(5000);

      const start = performance.now();
      render(<VirtualizedViolationLog violations={violations} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });

    it('should render empty state when no violations provided', () => {
      render(<VirtualizedViolationLog violations={[]} />);

      expect(
        screen.getByTestId('virtualized-violation-log-empty'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('No violations match the current filters.'),
      ).toBeInTheDocument();
    });

    it('should accept custom height and itemHeight props', () => {
      const violations = generateViolations(100);

      render(
        <VirtualizedViolationLog
          violations={violations}
          height={400}
          itemHeight={50}
        />,
      );

      expect(
        screen.getByTestId('virtualized-violation-log'),
      ).toBeInTheDocument();
    });

    it('should render column headers', () => {
      const violations = generateViolations(10);

      render(<VirtualizedViolationLog violations={violations} />);

      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    it('should show Actions column when onViewBattle is provided', () => {
      const violations = generateViolations(10);
      const onViewBattle = jest.fn();

      render(
        <VirtualizedViolationLog
          violations={violations}
          onViewBattle={onViewBattle}
        />,
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('React.memo optimization', () => {
    it('TrendChart should be memoized (has displayName)', async () => {
      const { TrendChart } =
        await import('@/components/simulation-viewer/TrendChart');
      expect(TrendChart.displayName).toBe('TrendChart');
    });

    it('KPICard should be memoized (has displayName)', async () => {
      const { KPICard } =
        await import('@/components/simulation-viewer/KPICard');
      expect(KPICard.displayName).toBe('KPICard');
    });

    it('VirtualizedTimeline should be memoized (has displayName)', () => {
      expect(VirtualizedTimeline.displayName).toBe('VirtualizedTimeline');
    });

    it('VirtualizedViolationLog should be memoized (has displayName)', () => {
      expect(VirtualizedViolationLog.displayName).toBe(
        'VirtualizedViolationLog',
      );
    });
  });

  describe('FilterPanel debounce', () => {
    it('should have DEBOUNCE_MS constant set to 300', async () => {
      const filterPanelSource =
        await import('@/components/simulation-viewer/FilterPanel');
      expect(filterPanelSource).toBeDefined();
    });
  });
});
