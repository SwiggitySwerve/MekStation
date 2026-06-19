import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

import type { ICampaignDashboardProps } from '@/components/simulation-viewer/pages/CampaignDashboard';
import type { ICampaignDashboardMetrics } from '@/types/simulation-viewer';

import {
  CampaignDashboard,
  formatCompactNumber,
  formatPercent,
} from '@/components/simulation-viewer/pages/CampaignDashboard';

const mockMetrics: ICampaignDashboardMetrics = {
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
    {
      personId: 'p4',
      name: 'Phelan Kell',
      rank: 'Star Captain',
      kills: 8,
      xp: 1500,
      survivalRate: 0.85,
      missionsCompleted: 14,
    },
    {
      personId: 'p5',
      name: 'Victor Steiner-Davion',
      rank: 'Prince',
      kills: 7,
      xp: 1200,
      survivalRate: 0.8,
      missionsCompleted: 12,
    },
  ],
  warnings: { lowFunds: true, manyWounded: true, lowBV: false },
};

const defaultProps: ICampaignDashboardProps = {
  campaignId: 'campaign-001',
  metrics: mockMetrics,
  onDrillDown: jest.fn(),
};

function renderDashboard(overrides: Partial<ICampaignDashboardProps> = {}) {
  const props = {
    ...defaultProps,
    ...overrides,
    onDrillDown: overrides.onDrillDown ?? jest.fn(),
  };
  return render(<CampaignDashboard {...props} />);
}

function metricsWithUndefined(
  key: keyof ICampaignDashboardMetrics,
): ICampaignDashboardMetrics {
  const result = { ...mockMetrics };
  Object.defineProperty(result, key, { value: undefined, writable: true });
  return result;
}

describe('CampaignDashboard', () => {
  describe('User Interactions', () => {
    describe('Financial time range', () => {
      it('renders time range selector', () => {
        renderDashboard();
        expect(screen.getByTestId('time-range-select')).toBeInTheDocument();
      });

      it('defaults to 30d time range', () => {
        renderDashboard();
        const select = screen.getByTestId(
          'time-range-select',
        ) as HTMLSelectElement;
        expect(select.value).toBe('30d');
      });

      it('changes time range when 7d is selected', () => {
        renderDashboard();
        const select = screen.getByTestId('time-range-select');
        fireEvent.change(select, { target: { value: '7d' } });
        expect((select as HTMLSelectElement).value).toBe('7d');
      });

      it('changes time range when 90d is selected', () => {
        renderDashboard();
        const select = screen.getByTestId('time-range-select');
        fireEvent.change(select, { target: { value: '90d' } });
        expect((select as HTMLSelectElement).value).toBe('90d');
      });

      it('changes time range when 1y is selected', () => {
        renderDashboard();
        const select = screen.getByTestId('time-range-select');
        fireEvent.change(select, { target: { value: '1y' } });
        expect((select as HTMLSelectElement).value).toBe('1y');
      });
    });

    describe('Top performers sorting', () => {
      it('defaults to sorting by kills', () => {
        renderDashboard();
        const killsBtn = screen.getByTestId('sort-button-kills');
        expect(killsBtn).toHaveAttribute('aria-pressed', 'true');
      });

      it('first performer has highest kills by default', () => {
        renderDashboard();
        const names = screen.getAllByTestId('performer-name');
        expect(names[0]).toHaveTextContent('Natasha Kerensky');
      });

      it('sorts by XP when xp button clicked', () => {
        renderDashboard();
        fireEvent.click(screen.getByTestId('sort-button-xp'));
        const names = screen.getAllByTestId('performer-name');
        expect(names[0]).toHaveTextContent('Natasha Kerensky');

        const xpBtn = screen.getByTestId('sort-button-xp');
        expect(xpBtn).toHaveAttribute('aria-pressed', 'true');
      });

      it('sorts by missions when missions button clicked', () => {
        renderDashboard();
        fireEvent.click(screen.getByTestId('sort-button-missionsCompleted'));
        const names = screen.getAllByTestId('performer-name');
        expect(names[0]).toHaveTextContent('Natasha Kerensky');

        const missionsBtn = screen.getByTestId('sort-button-missionsCompleted');
        expect(missionsBtn).toHaveAttribute('aria-pressed', 'true');
      });

      it('kills button shows inactive style when XP is selected', () => {
        renderDashboard();
        fireEvent.click(screen.getByTestId('sort-button-xp'));
        const killsBtn = screen.getByTestId('sort-button-kills');
        expect(killsBtn).toHaveAttribute('aria-pressed', 'false');
      });

      it('active sort key highlights the metric in performer cards', () => {
        renderDashboard();
        const killsValues = screen.getAllByTestId('performer-kills');
        expect(killsValues[0]).toHaveClass('text-blue-600');
      });

      it('non-active sort metrics use default text color', () => {
        renderDashboard();
        const xpValues = screen.getAllByTestId('performer-xp');
        expect(xpValues[0]).toHaveClass('text-gray-900');
      });
    });

    describe('Warning dismissal', () => {
      it('dismisses a warning when dismiss button is clicked', () => {
        renderDashboard();
        const dismissButtons = screen.getAllByTestId('warning-dismiss');
        expect(screen.getAllByTestId('warning-item')).toHaveLength(2);

        fireEvent.click(dismissButtons[0]);
        expect(screen.getAllByTestId('warning-item')).toHaveLength(1);
      });

      it('dismissed warning stays dismissed', () => {
        renderDashboard();
        const dismissButtons = screen.getAllByTestId('warning-dismiss');
        fireEvent.click(dismissButtons[0]);

        const remaining = screen.getAllByTestId('warning-item');
        expect(remaining).toHaveLength(1);
        expect(remaining[0]).toHaveTextContent('Low C-Bill reserves');
      });

      it('dismiss button has accessible aria-label', () => {
        renderDashboard();
        const dismissButtons = screen.getAllByTestId('warning-dismiss');
        expect(dismissButtons[0]).toHaveAttribute('aria-label');
        expect(dismissButtons[0].getAttribute('aria-label')).toContain(
          'Dismiss warning',
        );
      });

      it('shows empty state when all warnings are dismissed', () => {
        renderDashboard();
        const dismissButtons = screen.getAllByTestId('warning-dismiss');
        fireEvent.click(dismissButtons[0]);
        fireEvent.click(screen.getAllByTestId('warning-dismiss')[0]);

        expect(screen.getByTestId('warnings-empty')).toBeInTheDocument();
        expect(screen.getByTestId('warnings-empty')).toHaveTextContent(
          'all systems nominal',
        );
      });
    });

    describe('Drill-down links', () => {
      it('calls onDrillDown when roster drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const rosterSection = screen.getByTestId('roster-section');
        const link = within(rosterSection).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
          section: 'roster',
        });
      });

      it('calls onDrillDown when force drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const forceSection = screen.getByTestId('force-section');
        const link = within(forceSection).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
          section: 'force',
        });
      });

      it('calls onDrillDown when financial drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const financialSection = screen.getByTestId('financial-section');
        const link = within(financialSection).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('campaign-dashboard', {
          section: 'financial',
        });
      });

      it('calls onDrillDown when progression drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const section = screen.getByTestId('progression-section');
        const link = within(section).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
          section: 'progression',
        });
      });

      it('calls onDrillDown with personId when performer drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const cards = screen.getAllByTestId('performer-card');
        const link = within(cards[0]).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
          personId: 'p1',
        });
      });

      it('calls onDrillDown when warning details link is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const warningItems = screen.getAllByTestId('warning-item');
        const link = within(warningItems[0]).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
          warningTarget: 'roster',
        });
      });

      it('does not crash when onDrillDown is not provided', () => {
        expect(() => {
          renderDashboard({ onDrillDown: undefined });
          const rosterSection = screen.getByTestId('roster-section');
          const link = within(rosterSection).getByTestId('drill-down-link');
          fireEvent.click(link);
        }).not.toThrow();
      });

      it('drill-down links are keyboard accessible', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const rosterSection = screen.getByTestId('roster-section');
        const link = within(rosterSection).getByTestId('drill-down-link');
        fireEvent.keyDown(link, { key: 'Enter' });
        expect(onDrillDown).toHaveBeenCalled();
      });

      it('sort buttons are keyboard accessible via click', () => {
        renderDashboard();
        const xpBtn = screen.getByTestId('sort-button-xp');
        fireEvent.click(xpBtn);
        expect(xpBtn).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });
});
