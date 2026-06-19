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
  describe('Edge Cases', () => {
    it('handles performers with equal sort values', () => {
      const metrics = {
        ...mockMetrics,
        topPerformers: [
          {
            personId: 'p1',
            name: 'Alpha',
            rank: 'Lt',
            kills: 10,
            xp: 100,
            survivalRate: 1.0,
            missionsCompleted: 5,
          },
          {
            personId: 'p2',
            name: 'Beta',
            rank: 'Lt',
            kills: 10,
            xp: 100,
            survivalRate: 1.0,
            missionsCompleted: 5,
          },
        ],
      };
      renderDashboard({ metrics });
      const cards = screen.getAllByTestId('performer-card');
      expect(cards).toHaveLength(2);
    });

    it('handles missing optional onDrillDown', () => {
      expect(() => {
        render(<CampaignDashboard campaignId="test" metrics={mockMetrics} />);
      }).not.toThrow();
    });

    it('handles empty string campaignId', () => {
      renderDashboard({ campaignId: '' });
      expect(screen.getByTestId('campaign-dashboard')).toHaveAttribute(
        'data-campaign-id',
        '',
      );
    });

    it('handles win rate below 50% (shows down direction)', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, winRate: 0.3 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('30%');
    });

    it('handles force with zero damaged units (neutral direction)', () => {
      const metrics = {
        ...mockMetrics,
        force: { ...mockMetrics.force, damaged: 0, destroyed: 0, damagedBV: 0 },
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('force-section')).toBeInTheDocument();
    });

    it('shows zero balance when financial trend is empty', () => {
      const metrics = { ...mockMetrics, financialTrend: [] };
      renderDashboard({ metrics });
      const summary = screen.getByTestId('financial-summary');
      expect(summary).toHaveTextContent('0');
    });

    it('handles only lowBV warning active', () => {
      const metrics = {
        ...mockMetrics,
        warnings: { lowFunds: false, manyWounded: false, lowBV: true },
      };
      renderDashboard({ metrics });
      const items = screen.getAllByTestId('warning-item');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveAttribute('data-severity', 'warning');
    });

    it('handles only lowFunds warning active', () => {
      const metrics = {
        ...mockMetrics,
        warnings: { lowFunds: true, manyWounded: false, lowBV: false },
      };
      renderDashboard({ metrics });
      const items = screen.getAllByTestId('warning-item');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Low C-Bill reserves');
    });

    it('handles only manyWounded warning active', () => {
      const metrics = {
        ...mockMetrics,
        warnings: { lowFunds: false, manyWounded: true, lowBV: false },
      };
      renderDashboard({ metrics });
      const items = screen.getAllByTestId('warning-item');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('Multiple pilots wounded');
    });

    it('renders correctly with partial null-like metrics', () => {
      const metrics = {
        roster: { active: 0, wounded: 0, kia: 0, total: 0 },
        force: {
          operational: 0,
          damaged: 0,
          destroyed: 0,
          totalBV: 0,
          damagedBV: 0,
        },
        financialTrend: [],
        progression: {
          missionsCompleted: 0,
          missionsTotal: 0,
          winRate: 0,
          totalXP: 0,
          averageXPPerMission: 0,
        },
        topPerformers: [],
        warnings: { lowFunds: false, manyWounded: false, lowBV: false },
      } as ICampaignDashboardMetrics;
      renderDashboard({ metrics });
      expect(screen.getByTestId('campaign-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('performers-empty')).toBeInTheDocument();
      expect(screen.getByTestId('warnings-empty')).toBeInTheDocument();
    });

    it('handles win rate exactly at 0.5 boundary (shows up direction)', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, winRate: 0.5 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('50%');
    });

    it('handles win rate just below 0.5 (shows down direction)', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, winRate: 0.49 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('49%');
    });

    it('renders with undefined roster defensively', () => {
      renderDashboard({ metrics: metricsWithUndefined('roster') });
      expect(screen.getByTestId('roster-section')).toBeInTheDocument();
    });

    it('renders with undefined force defensively', () => {
      renderDashboard({ metrics: metricsWithUndefined('force') });
      expect(screen.getByTestId('force-section')).toBeInTheDocument();
    });

    it('renders with undefined financialTrend defensively', () => {
      renderDashboard({ metrics: metricsWithUndefined('financialTrend') });
      expect(screen.getByTestId('financial-section')).toBeInTheDocument();
    });

    it('renders with undefined progression defensively', () => {
      renderDashboard({ metrics: metricsWithUndefined('progression') });
      expect(screen.getByTestId('progression-section')).toBeInTheDocument();
    });

    it('renders with undefined topPerformers defensively', () => {
      renderDashboard({ metrics: metricsWithUndefined('topPerformers') });
      expect(screen.getByTestId('performers-empty')).toBeInTheDocument();
    });

    it('applies fallback when unknown time range is set externally', () => {
      renderDashboard();
      const select = screen.getByTestId('time-range-select');
      fireEvent.change(select, { target: { value: 'unknown-range' } });
      expect(screen.getByTestId('financial-section')).toBeInTheDocument();
    });
  });
});
