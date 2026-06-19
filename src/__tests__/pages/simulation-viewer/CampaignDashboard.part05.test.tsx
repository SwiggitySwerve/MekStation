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
  describe('formatCompactNumber', () => {
    it('formats millions correctly', () => {
      expect(formatCompactNumber(1500000)).toBe('1.5M');
    });

    it('formats thousands correctly', () => {
      expect(formatCompactNumber(25000)).toBe('25.0K');
    });

    it('formats small numbers with locale string', () => {
      expect(formatCompactNumber(42)).toBe('42');
    });

    it('formats zero', () => {
      expect(formatCompactNumber(0)).toBe('0');
    });

    it('formats exactly 1 million', () => {
      expect(formatCompactNumber(1000000)).toBe('1.0M');
    });

    it('formats exactly 1 thousand', () => {
      expect(formatCompactNumber(1000)).toBe('1.0K');
    });
  });

  describe('formatPercent', () => {
    it('formats 0.75 as 75%', () => {
      expect(formatPercent(0.75)).toBe('75%');
    });

    it('formats 0 as 0%', () => {
      expect(formatPercent(0)).toBe('0%');
    });

    it('formats 1.0 as 100%', () => {
      expect(formatPercent(1.0)).toBe('100%');
    });

    it('rounds to nearest whole percent', () => {
      expect(formatPercent(0.333)).toBe('33%');
    });
  });

  describe('Accessibility', () => {
    it('sections have aria-label attributes', () => {
      renderDashboard();
      expect(screen.getByTestId('roster-section')).toHaveAttribute(
        'aria-label',
      );
      expect(screen.getByTestId('force-section')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('financial-section')).toHaveAttribute(
        'aria-label',
      );
      expect(screen.getByTestId('progression-section')).toHaveAttribute(
        'aria-label',
      );
      expect(screen.getByTestId('top-performers-section')).toHaveAttribute(
        'aria-label',
      );
      expect(screen.getByTestId('warnings-section')).toHaveAttribute(
        'aria-label',
      );
    });

    it('sort controls group has aria-label', () => {
      renderDashboard();
      expect(screen.getByTestId('performer-sort-controls')).toHaveAttribute(
        'aria-label',
        'Sort performers by',
      );
    });

    it('sort buttons have aria-pressed attribute', () => {
      renderDashboard();
      expect(screen.getByTestId('sort-button-kills')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByTestId('sort-button-xp')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(
        screen.getByTestId('sort-button-missionsCompleted'),
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('warning severity is conveyed through data attribute', () => {
      renderDashboard();
      const items = screen.getAllByTestId('warning-item');
      expect(items[0]).toHaveAttribute('data-severity', 'critical');
      expect(items[1]).toHaveAttribute('data-severity', 'warning');
    });
  });
});
