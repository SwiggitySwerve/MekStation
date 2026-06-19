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
  describe('Top Performers Section', () => {
    it('renders performer cards', () => {
      renderDashboard();
      const cards = screen.getAllByTestId('performer-card');
      expect(cards).toHaveLength(5);
    });

    it('renders performer names', () => {
      renderDashboard();
      const names = screen.getAllByTestId('performer-name');
      expect(names[0]).toHaveTextContent('Natasha Kerensky');
    });

    it('renders performer ranks', () => {
      renderDashboard();
      const ranks = screen.getAllByTestId('performer-rank');
      expect(ranks[0]).toHaveTextContent('Colonel');
    });

    it('renders performer kills', () => {
      renderDashboard();
      const kills = screen.getAllByTestId('performer-kills');
      expect(kills[0]).toHaveTextContent('15');
    });

    it('renders performer XP', () => {
      renderDashboard();
      const xp = screen.getAllByTestId('performer-xp');
      expect(xp[0]).toHaveTextContent('2.5K');
    });

    it('renders performer missions count', () => {
      renderDashboard();
      const missions = screen.getAllByTestId('performer-missions');
      expect(missions[0]).toHaveTextContent('20');
    });

    it('renders sort controls', () => {
      renderDashboard();
      expect(screen.getByTestId('performer-sort-controls')).toBeInTheDocument();
    });

    it('renders performers list container', () => {
      renderDashboard();
      expect(screen.getByTestId('performers-list')).toBeInTheDocument();
    });
  });

  describe('Warnings Section', () => {
    it('renders active warning items', () => {
      renderDashboard();
      const items = screen.getAllByTestId('warning-item');
      expect(items).toHaveLength(2);
    });

    it('renders warning messages', () => {
      renderDashboard();
      const messages = screen.getAllByTestId('warning-message');
      expect(messages[0]).toHaveTextContent('Multiple pilots wounded');
    });

    it('renders warning severity badges', () => {
      renderDashboard();
      const badges = screen.getAllByTestId('warning-severity-badge');
      expect(badges[0]).toHaveTextContent('critical');
      expect(badges[1]).toHaveTextContent('warning');
    });

    it('renders dismiss buttons for each warning', () => {
      renderDashboard();
      const buttons = screen.getAllByTestId('warning-dismiss');
      expect(buttons).toHaveLength(2);
    });

    it('renders warnings list', () => {
      renderDashboard();
      expect(screen.getByTestId('warnings-list')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('grid container has responsive column classes', () => {
      renderDashboard();
      const grid = screen.getByTestId('dashboard-grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-4');
    });

    it('grid container has gap-4 class', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-grid')).toHaveClass('gap-4');
    });

    it('roster section has col-span-1', () => {
      renderDashboard();
      expect(screen.getByTestId('roster-section')).toHaveClass('col-span-1');
    });

    it('force section has col-span-1', () => {
      renderDashboard();
      expect(screen.getByTestId('force-section')).toHaveClass('col-span-1');
    });

    it('financial section spans 2 columns on md', () => {
      renderDashboard();
      expect(screen.getByTestId('financial-section')).toHaveClass(
        'md:col-span-2',
      );
    });

    it('progression section has col-span-1', () => {
      renderDashboard();
      expect(screen.getByTestId('progression-section')).toHaveClass(
        'col-span-1',
      );
    });

    it('top performers spans 3 columns on lg', () => {
      renderDashboard();
      expect(screen.getByTestId('top-performers-section')).toHaveClass(
        'lg:col-span-3',
      );
    });

    it('top performers spans 2 columns on md', () => {
      renderDashboard();
      expect(screen.getByTestId('top-performers-section')).toHaveClass(
        'md:col-span-2',
      );
    });

    it('warnings section spans full width on lg (4 columns)', () => {
      renderDashboard();
      expect(screen.getByTestId('warnings-section')).toHaveClass(
        'lg:col-span-4',
      );
    });

    it('dashboard has responsive padding', () => {
      renderDashboard();
      const main = screen.getByTestId('campaign-dashboard');
      expect(main).toHaveClass('p-4');
      expect(main).toHaveClass('md:p-6');
      expect(main).toHaveClass('lg:p-8');
    });
  });

  describe('Dark Mode', () => {
    it('dashboard container has dark mode background class', () => {
      renderDashboard();
      expect(screen.getByTestId('campaign-dashboard')).toHaveClass(
        'dark:bg-gray-900',
      );
    });

    it('section headings have dark mode text color', () => {
      renderDashboard();
      const headings = screen.getAllByTestId('section-heading');
      headings.forEach((heading) => {
        expect(heading).toHaveClass('dark:text-gray-200');
      });
    });

    it('dashboard title has dark mode text class', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-title')).toHaveClass(
        'dark:text-gray-100',
      );
    });

    it('performer cards have dark mode background', () => {
      renderDashboard();
      const cards = screen.getAllByTestId('performer-card');
      cards.forEach((card) => {
        expect(card).toHaveClass('dark:bg-gray-800');
      });
    });

    it('performer cards have dark mode border', () => {
      renderDashboard();
      const cards = screen.getAllByTestId('performer-card');
      cards.forEach((card) => {
        expect(card).toHaveClass('dark:border-gray-700');
      });
    });
  });
});
