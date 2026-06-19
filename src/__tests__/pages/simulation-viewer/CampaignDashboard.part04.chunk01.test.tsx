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
    it('handles zero active pilots', () => {
      const metrics = {
        ...mockMetrics,
        roster: { ...mockMetrics.roster, active: 0 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('roster-section');
      expect(section).toHaveTextContent('0');
    });

    it('handles zero wounded', () => {
      const metrics = {
        ...mockMetrics,
        roster: { ...mockMetrics.roster, wounded: 0 },
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('roster-section')).toBeInTheDocument();
    });

    it('handles zero KIA', () => {
      const metrics = {
        ...mockMetrics,
        roster: { ...mockMetrics.roster, kia: 0 },
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('roster-section')).toBeInTheDocument();
    });

    it('handles zero operational units', () => {
      const metrics = {
        ...mockMetrics,
        force: { ...mockMetrics.force, operational: 0 },
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('force-section')).toBeInTheDocument();
    });

    it('handles zero totalBV', () => {
      const metrics = {
        ...mockMetrics,
        force: { ...mockMetrics.force, totalBV: 0 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('force-section');
      expect(section).toHaveTextContent('0');
    });

    it('handles empty financial trend', () => {
      const metrics = { ...mockMetrics, financialTrend: [] };
      renderDashboard({ metrics });
      expect(screen.getByTestId('financial-section')).toBeInTheDocument();
    });

    it('handles single financial data point', () => {
      const metrics = {
        ...mockMetrics,
        financialTrend: [
          {
            date: '2025-01-01',
            balance: 500000,
            income: 100000,
            expenses: 80000,
          },
        ],
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
    });

    it('handles zero missions completed', () => {
      const metrics = {
        ...mockMetrics,
        progression: {
          ...mockMetrics.progression,
          missionsCompleted: 0,
          missionsTotal: 0,
        },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('0 / 0');
    });

    it('handles zero win rate', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, winRate: 0 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('0%');
    });

    it('handles 100% win rate', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, winRate: 1.0 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('100%');
    });

    it('handles zero XP', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, totalXP: 0 },
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('progression-section')).toBeInTheDocument();
    });

    it('handles empty top performers array', () => {
      const metrics = { ...mockMetrics, topPerformers: [] };
      renderDashboard({ metrics });
      expect(screen.getByTestId('performers-empty')).toBeInTheDocument();
      expect(screen.getByTestId('performers-empty')).toHaveTextContent(
        'No performance data',
      );
    });

    it('handles all warnings false', () => {
      const metrics = {
        ...mockMetrics,
        warnings: { lowFunds: false, manyWounded: false, lowBV: false },
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('warnings-empty')).toBeInTheDocument();
    });

    it('handles all warnings true', () => {
      const metrics = {
        ...mockMetrics,
        warnings: { lowFunds: true, manyWounded: true, lowBV: true },
      };
      renderDashboard({ metrics });
      const items = screen.getAllByTestId('warning-item');
      expect(items).toHaveLength(3);
    });

    it('handles large numbers in force metrics', () => {
      const metrics = {
        ...mockMetrics,
        force: { ...mockMetrics.force, totalBV: 1500000 },
      };
      renderDashboard({ metrics });
      const section = screen.getByTestId('force-section');
      expect(section).toHaveTextContent('1.5M');
    });

    it('handles large financial values (millions)', () => {
      const metrics = {
        ...mockMetrics,
        financialTrend: [
          {
            date: '2025-01-15',
            balance: 5000000,
            income: 1200000,
            expenses: 800000,
          },
        ],
      };
      renderDashboard({ metrics });
      const summary = screen.getByTestId('financial-summary');
      expect(summary).toHaveTextContent('5.0M');
      expect(summary).toHaveTextContent('1.2M');
    });
  });
});
