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
  describe('Rendering', () => {
    it('renders the dashboard container', () => {
      renderDashboard();
      expect(screen.getByTestId('campaign-dashboard')).toBeInTheDocument();
    });

    it('renders campaign-id as data attribute', () => {
      renderDashboard();
      expect(screen.getByTestId('campaign-dashboard')).toHaveAttribute(
        'data-campaign-id',
        'campaign-001',
      );
    });

    it('renders the dashboard title', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-title')).toHaveTextContent(
        'Campaign Dashboard',
      );
    });

    it('renders the responsive grid container', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    });

    it('renders roster section', () => {
      renderDashboard();
      expect(screen.getByTestId('roster-section')).toBeInTheDocument();
    });

    it('renders force section', () => {
      renderDashboard();
      expect(screen.getByTestId('force-section')).toBeInTheDocument();
    });

    it('renders financial section', () => {
      renderDashboard();
      expect(screen.getByTestId('financial-section')).toBeInTheDocument();
    });

    it('renders progression section', () => {
      renderDashboard();
      expect(screen.getByTestId('progression-section')).toBeInTheDocument();
    });

    it('renders top performers section', () => {
      renderDashboard();
      expect(screen.getByTestId('top-performers-section')).toBeInTheDocument();
    });

    it('renders warnings section', () => {
      renderDashboard();
      expect(screen.getByTestId('warnings-section')).toBeInTheDocument();
    });

    it('renders all 6 section headings', () => {
      renderDashboard();
      const headings = screen.getAllByTestId('section-heading');
      expect(headings).toHaveLength(6);
    });

    it('renders roster metrics in KPICards', () => {
      renderDashboard();
      const rosterSection = screen.getByTestId('roster-section');
      const kpiCards = within(rosterSection).getAllByTestId('kpi-card');
      expect(kpiCards.length).toBeGreaterThanOrEqual(3);
    });

    it('displays active pilot count', () => {
      renderDashboard();
      const rosterSection = screen.getByTestId('roster-section');
      expect(rosterSection).toHaveTextContent('12');
    });

    it('displays wounded pilot count', () => {
      renderDashboard();
      const rosterSection = screen.getByTestId('roster-section');
      expect(rosterSection).toHaveTextContent('3');
    });

    it('displays KIA count', () => {
      renderDashboard();
      const rosterSection = screen.getByTestId('roster-section');
      expect(rosterSection).toHaveTextContent('1');
    });
  });

  describe('Force Section', () => {
    it('renders force metrics in KPICards', () => {
      renderDashboard();
      const forceSection = screen.getByTestId('force-section');
      const kpiCards = within(forceSection).getAllByTestId('kpi-card');
      expect(kpiCards.length).toBeGreaterThanOrEqual(5);
    });

    it('displays operational unit count', () => {
      renderDashboard();
      const forceSection = screen.getByTestId('force-section');
      expect(forceSection).toHaveTextContent('10');
    });

    it('displays damaged unit count', () => {
      renderDashboard();
      const forceSection = screen.getByTestId('force-section');
      expect(forceSection).toHaveTextContent('4');
    });

    it('displays destroyed unit count', () => {
      renderDashboard();
      const forceSection = screen.getByTestId('force-section');
      expect(forceSection).toHaveTextContent('2');
    });

    it('displays formatted total BV', () => {
      renderDashboard();
      const forceSection = screen.getByTestId('force-section');
      expect(forceSection).toHaveTextContent('25.0K');
    });

    it('displays formatted damaged BV', () => {
      renderDashboard();
      const forceSection = screen.getByTestId('force-section');
      expect(forceSection).toHaveTextContent('7.0K');
    });
  });

  describe('Financial Section', () => {
    it('renders the trend chart', () => {
      renderDashboard();
      expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
    });

    it('renders financial summary container', () => {
      renderDashboard();
      expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
    });

    it('displays balance from latest financial data point', () => {
      renderDashboard();
      const summary = screen.getByTestId('financial-summary');
      expect(summary).toHaveTextContent('1.5M');
    });

    it('displays income from latest financial data point', () => {
      renderDashboard();
      const summary = screen.getByTestId('financial-summary');
      expect(summary).toHaveTextContent('250.0K');
    });

    it('displays expenses from latest financial data point', () => {
      renderDashboard();
      const summary = screen.getByTestId('financial-summary');
      expect(summary).toHaveTextContent('180.0K');
    });
  });

  describe('Progression Section', () => {
    it('displays missions completed ratio', () => {
      renderDashboard();
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('24 / 32');
    });

    it('displays win rate as percentage', () => {
      renderDashboard();
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('75%');
    });

    it('displays total XP', () => {
      renderDashboard();
      const section = screen.getByTestId('progression-section');
      expect(section).toHaveTextContent('4.8K');
    });
  });
});
