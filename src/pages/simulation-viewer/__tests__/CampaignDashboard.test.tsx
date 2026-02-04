import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  CampaignDashboard,
  formatCompactNumber,
  formatPercent,
} from '../CampaignDashboard';
import type { ICampaignDashboardProps } from '../CampaignDashboard';
import type { ICampaignDashboardMetrics } from '@/types/simulation-viewer';

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
  const props = { ...defaultProps, ...overrides, onDrillDown: overrides.onDrillDown ?? jest.fn() };
  return render(<CampaignDashboard {...props} />);
}

function metricsWithUndefined(key: keyof ICampaignDashboardMetrics): ICampaignDashboardMetrics {
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
      expect(screen.getByTestId('dashboard-title')).toHaveTextContent('Campaign Dashboard');
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
      expect(screen.getByTestId('financial-section')).toHaveClass('md:col-span-2');
    });

    it('progression section has col-span-1', () => {
      renderDashboard();
      expect(screen.getByTestId('progression-section')).toHaveClass('col-span-1');
    });

    it('top performers spans 3 columns on lg', () => {
      renderDashboard();
      expect(screen.getByTestId('top-performers-section')).toHaveClass('lg:col-span-3');
    });

    it('top performers spans 2 columns on md', () => {
      renderDashboard();
      expect(screen.getByTestId('top-performers-section')).toHaveClass('md:col-span-2');
    });

    it('warnings section spans full width on lg (4 columns)', () => {
      renderDashboard();
      expect(screen.getByTestId('warnings-section')).toHaveClass('lg:col-span-4');
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
      expect(screen.getByTestId('campaign-dashboard')).toHaveClass('dark:bg-gray-900');
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
      expect(screen.getByTestId('dashboard-title')).toHaveClass('dark:text-gray-100');
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

  describe('User Interactions', () => {
    describe('Financial time range', () => {
      it('renders time range selector', () => {
        renderDashboard();
        expect(screen.getByTestId('time-range-select')).toBeInTheDocument();
      });

      it('defaults to 30d time range', () => {
        renderDashboard();
        const select = screen.getByTestId('time-range-select') as HTMLSelectElement;
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
        expect(dismissButtons[0].getAttribute('aria-label')).toContain('Dismiss warning');
      });

      it('shows empty state when all warnings are dismissed', () => {
        renderDashboard();
        const dismissButtons = screen.getAllByTestId('warning-dismiss');
        fireEvent.click(dismissButtons[0]);
        fireEvent.click(screen.getAllByTestId('warning-dismiss')[0]);

        expect(screen.getByTestId('warnings-empty')).toBeInTheDocument();
        expect(screen.getByTestId('warnings-empty')).toHaveTextContent('all systems nominal');
      });
    });

    describe('Drill-down links', () => {
      it('calls onDrillDown when roster drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const rosterSection = screen.getByTestId('roster-section');
        const link = within(rosterSection).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', { section: 'roster' });
      });

      it('calls onDrillDown when force drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const forceSection = screen.getByTestId('force-section');
        const link = within(forceSection).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', { section: 'force' });
      });

      it('calls onDrillDown when financial drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const financialSection = screen.getByTestId('financial-section');
        const link = within(financialSection).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('campaign-dashboard', { section: 'financial' });
      });

      it('calls onDrillDown when progression drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const section = screen.getByTestId('progression-section');
        const link = within(section).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', { section: 'progression' });
      });

      it('calls onDrillDown with personId when performer drill-down is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const cards = screen.getAllByTestId('performer-card');
        const link = within(cards[0]).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', { personId: 'p1' });
      });

      it('calls onDrillDown when warning details link is clicked', () => {
        const onDrillDown = jest.fn();
        renderDashboard({ onDrillDown });
        const warningItems = screen.getAllByTestId('warning-item');
        const link = within(warningItems[0]).getByTestId('drill-down-link');
        fireEvent.click(link);
        expect(onDrillDown).toHaveBeenCalledWith('encounter-history', { warningTarget: 'roster' });
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
          { date: '2025-01-01', balance: 500000, income: 100000, expenses: 80000 },
        ],
      };
      renderDashboard({ metrics });
      expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
    });

    it('handles zero missions completed', () => {
      const metrics = {
        ...mockMetrics,
        progression: { ...mockMetrics.progression, missionsCompleted: 0, missionsTotal: 0 },
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
      expect(screen.getByTestId('performers-empty')).toHaveTextContent('No performance data');
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
          { date: '2025-01-15', balance: 5000000, income: 1200000, expenses: 800000 },
        ],
      };
      renderDashboard({ metrics });
      const summary = screen.getByTestId('financial-summary');
      expect(summary).toHaveTextContent('5.0M');
      expect(summary).toHaveTextContent('1.2M');
    });

    it('handles performers with equal sort values', () => {
      const metrics = {
        ...mockMetrics,
        topPerformers: [
          { personId: 'p1', name: 'Alpha', rank: 'Lt', kills: 10, xp: 100, survivalRate: 1.0, missionsCompleted: 5 },
          { personId: 'p2', name: 'Beta', rank: 'Lt', kills: 10, xp: 100, survivalRate: 1.0, missionsCompleted: 5 },
        ],
      };
      renderDashboard({ metrics });
      const cards = screen.getAllByTestId('performer-card');
      expect(cards).toHaveLength(2);
    });

    it('handles missing optional onDrillDown', () => {
      expect(() => {
        render(
          <CampaignDashboard
            campaignId="test"
            metrics={mockMetrics}
          />,
        );
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
        force: { operational: 0, damaged: 0, destroyed: 0, totalBV: 0, damagedBV: 0 },
        financialTrend: [],
        progression: { missionsCompleted: 0, missionsTotal: 0, winRate: 0, totalXP: 0, averageXPPerMission: 0 },
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
      expect(screen.getByTestId('roster-section')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('force-section')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('financial-section')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('progression-section')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('top-performers-section')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('warnings-section')).toHaveAttribute('aria-label');
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
      expect(screen.getByTestId('sort-button-kills')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sort-button-xp')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('sort-button-missionsCompleted')).toHaveAttribute('aria-pressed', 'false');
    });

    it('warning severity is conveyed through data attribute', () => {
      renderDashboard();
      const items = screen.getAllByTestId('warning-item');
      expect(items[0]).toHaveAttribute('data-severity', 'critical');
      expect(items[1]).toHaveAttribute('data-severity', 'warning');
    });
  });
});
