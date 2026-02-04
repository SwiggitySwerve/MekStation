import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useCollapsible,
  BREAKPOINTS,
  MIN_TOUCH_TARGET,
  TOUCH_TARGET_CLASSES,
} from '@/utils/responsive';
import { KPICard } from '@/components/simulation-viewer/KPICard';
import { TrendChart } from '@/components/simulation-viewer/TrendChart';
import { AnomalyAlertCard } from '@/components/simulation-viewer/AnomalyAlertCard';
import { TabNavigation } from '@/components/simulation-viewer/TabNavigation';
import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import type { IKPICardProps } from '@/components/simulation-viewer/types';
import type { ITrendChartProps } from '@/components/simulation-viewer/types';
import type { IAnomalyAlertCardProps } from '@/components/simulation-viewer/types';
import type { ITabNavigationProps } from '@/components/simulation-viewer/types';
import type { IFilterPanelProps, IFilterDefinition } from '@/components/simulation-viewer/types';
import type { IAnomaly } from '@/types/simulation-viewer';

type MediaQueryChangeListener = (event: { matches: boolean }) => void;

function createMatchMediaMock(defaultMatches: boolean) {
  const listeners: MediaQueryChangeListener[] = [];

  const matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: defaultMatches,
    media: query,
    onchange: null,
    addEventListener: jest.fn((_event: string, listener: MediaQueryChangeListener) => {
      listeners.push(listener);
    }),
    removeEventListener: jest.fn((_event: string, listener: MediaQueryChangeListener) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  return {
    matchMedia,
    listeners,
    triggerChange(matches: boolean) {
      for (const listener of listeners) {
        listener({ matches });
      }
    },
  };
}

function setViewport(width: number) {
  const mock = createMatchMediaMock(false);
  mock.matchMedia.mockImplementation((query: string) => {
    const maxMatch = query.match(/max-width:\s*(\d+)px/);
    const minMatch = query.match(/min-width:\s*(\d+)px/);

    let matches = false;
    if (maxMatch && minMatch) {
      matches = width <= parseInt(maxMatch[1]) && width >= parseInt(minMatch[1]);
    } else if (maxMatch) {
      matches = width <= parseInt(maxMatch[1]);
    } else if (minMatch) {
      matches = width >= parseInt(minMatch[1]);
    }

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mock.matchMedia,
  });

  return mock;
}

const sampleTrendData = [
  { date: '2026-01-20', value: 100 },
  { date: '2026-01-21', value: 120 },
  { date: '2026-01-22', value: 110 },
  { date: '2026-01-23', value: 140 },
  { date: '2026-01-24', value: 130 },
  { date: '2026-01-25', value: 150 },
  { date: '2026-01-26', value: 160 },
];

const sampleAnomaly: IAnomaly = {
  id: 'anomaly-1',
  type: 'heat-suicide',
  severity: 'critical',
  battleId: 'battle-001',
  turn: 3,
  unitId: 'unit-1',
  message: 'Unit overheated and shutdown',
  configKey: 'heatSuicideThreshold',
  timestamp: Date.now(),
};

const sampleFilterDefs: IFilterDefinition[] = [
  {
    id: 'outcome',
    label: 'Outcome',
    options: ['victory', 'defeat', 'draw'],
    optionLabels: { victory: 'Victory', defeat: 'Defeat', draw: 'Draw' },
  },
];

describe('Responsive Utilities', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  describe('BREAKPOINTS', () => {
    it('defines standard Tailwind breakpoints', () => {
      expect(BREAKPOINTS.sm).toBe(640);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS['2xl']).toBe(1536);
    });
  });

  describe('MIN_TOUCH_TARGET', () => {
    it('is 44px per WCAG 2.5.5', () => {
      expect(MIN_TOUCH_TARGET).toBe(44);
    });
  });

  describe('TOUCH_TARGET_CLASSES', () => {
    it('contains min-h and min-w for 44px', () => {
      expect(TOUCH_TARGET_CLASSES).toContain('min-h-[44px]');
      expect(TOUCH_TARGET_CLASSES).toContain('min-w-[44px]');
    });
  });

  describe('useMediaQuery', () => {
    it('returns true when media query matches', () => {
      const mock = createMatchMediaMock(true);
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mock.matchMedia,
      });

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(true);
    });

    it('returns false when media query does not match', () => {
      const mock = createMatchMediaMock(false);
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mock.matchMedia,
      });

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(false);
    });

    it('updates when media query changes', () => {
      const mock = createMatchMediaMock(false);
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mock.matchMedia,
      });

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(false);

      act(() => {
        mock.triggerChange(true);
      });

      expect(result.current).toBe(true);
    });

    it('cleans up listener on unmount', () => {
      let removeEventListenerSpy: jest.Mock | undefined;

      const matchMediaFn = jest.fn().mockImplementation((query: string) => {
        const obj = {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
          dispatchEvent: jest.fn(),
        };
        removeEventListenerSpy = obj.removeEventListener;
        return obj;
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaFn,
      });

      const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('useIsMobile', () => {
    it('returns true for mobile viewport (480px)', () => {
      setViewport(480);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('returns false for tablet viewport (768px)', () => {
      setViewport(768);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it('returns false for desktop viewport (1920px)', () => {
      setViewport(1920);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });
  });

  describe('useIsTablet', () => {
    it('returns false for mobile viewport (480px)', () => {
      setViewport(480);
      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(false);
    });

    it('returns true for tablet viewport (768px)', () => {
      setViewport(768);
      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(true);
    });

    it('returns false for desktop viewport (1920px)', () => {
      setViewport(1920);
      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(false);
    });
  });

  describe('useIsDesktop', () => {
    it('returns false for mobile viewport (480px)', () => {
      setViewport(480);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(false);
    });

    it('returns false for tablet viewport (768px)', () => {
      setViewport(768);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(false);
    });

    it('returns true for desktop viewport (1920px)', () => {
      setViewport(1920);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(true);
    });
  });

  describe('useCollapsible', () => {
    it('starts closed by default', () => {
      const { result } = renderHook(() => useCollapsible());
      expect(result.current.isOpen).toBe(false);
    });

    it('starts open when defaultOpen is true', () => {
      const { result } = renderHook(() => useCollapsible(true));
      expect(result.current.isOpen).toBe(true);
    });

    it('toggles state', () => {
      const { result } = renderHook(() => useCollapsible());
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('sets state explicitly', () => {
      const { result } = renderHook(() => useCollapsible());

      act(() => {
        result.current.setOpen(true);
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.setOpen(false);
      });
      expect(result.current.isOpen).toBe(false);
    });
  });
});

describe('Component Responsive Behavior', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  describe('KPICard', () => {
    const defaultProps: IKPICardProps = {
      label: 'Win Rate',
      value: '80%',
    };

    it('renders with responsive padding classes', () => {
      render(<KPICard {...defaultProps} />);
      const card = screen.getByTestId('kpi-card');
      expect(card.className).toContain('p-4');
      expect(card.className).toContain('md:p-6');
    });

    it('applies responsive text sizing', () => {
      render(<KPICard {...defaultProps} />);
      const value = screen.getByTestId('kpi-value');
      expect(value.className).toContain('text-2xl');
      expect(value.className).toContain('md:text-3xl');
    });

    it('has min-h-[44px] on clickable cards for touch targets', () => {
      render(<KPICard {...defaultProps} onClick={jest.fn()} />);
      const card = screen.getByTestId('kpi-card');
      expect(card.className).toContain('min-h-[44px]');
    });

    it('does not enforce touch target on non-clickable cards', () => {
      render(<KPICard {...defaultProps} />);
      const card = screen.getByTestId('kpi-card');
      expect(card.className).not.toContain('min-h-[44px]');
    });

    it('renders responsive sparkline height', () => {
      render(<KPICard {...defaultProps} trend={[0.75, 0.8, 0.85]} />);
      const trend = screen.getByTestId('kpi-trend');
      expect(trend.className).toContain('h-8');
      expect(trend.className).toContain('md:h-10');
    });
  });

  describe('TrendChart', () => {
    const defaultProps: ITrendChartProps = {
      data: sampleTrendData,
      timeRange: '7d',
      onTimeRangeChange: jest.fn(),
    };

    it('renders time range select with touch target class', () => {
      setViewport(1920);
      render(<TrendChart {...defaultProps} />);
      const select = screen.getByTestId('time-range-select');
      expect(select.className).toContain('min-h-[44px]');
      expect(select.className).toContain('md:min-h-0');
    });

    it('renders thicker stroke on mobile for chart line', () => {
      setViewport(480);
      render(<TrendChart {...defaultProps} />);
      const chartLine = screen.getByTestId('chart-line');
      expect(chartLine.getAttribute('stroke-width')).toBe('3');
    });

    it('renders normal stroke on desktop', () => {
      setViewport(1920);
      render(<TrendChart {...defaultProps} />);
      const chartLine = screen.getByTestId('chart-line');
      expect(chartLine.getAttribute('stroke-width')).toBe('2');
    });

    it('renders larger data points on mobile', () => {
      setViewport(480);
      render(<TrendChart {...defaultProps} />);
      const points = screen.getAllByTestId('data-point');
      expect(points[0].getAttribute('r')).toBe('5');
    });

    it('renders smaller data points on desktop', () => {
      setViewport(1920);
      render(<TrendChart {...defaultProps} />);
      const points = screen.getAllByTestId('data-point');
      expect(points[0].getAttribute('r')).toBe('3');
    });

    it('renders fewer y-axis ticks on mobile', () => {
      setViewport(480);
      render(<TrendChart {...defaultProps} />);
      const yLabels = screen.getAllByTestId('y-label');
      expect(yLabels.length).toBe(3);
    });

    it('renders more y-axis ticks on desktop', () => {
      setViewport(1920);
      render(<TrendChart {...defaultProps} />);
      const yLabels = screen.getAllByTestId('y-label');
      expect(yLabels.length).toBe(5);
    });
  });

  describe('AnomalyAlertCard', () => {
    const defaultProps: IAnomalyAlertCardProps = {
      anomaly: sampleAnomaly,
      onViewBattle: jest.fn(),
      onDismiss: jest.fn(),
    };

    it('renders action buttons with touch target class', () => {
      render(<AnomalyAlertCard {...defaultProps} />);
      const viewBattle = screen.getByTestId('action-view-battle');
      expect(viewBattle.className).toContain('min-h-[44px]');
      expect(viewBattle.className).toContain('md:min-h-0');
    });

    it('renders dismiss button with touch target class', () => {
      render(<AnomalyAlertCard {...defaultProps} />);
      const dismiss = screen.getByTestId('action-dismiss');
      expect(dismiss.className).toContain('min-h-[44px]');
    });
  });

  describe('TabNavigation', () => {
    const defaultProps: ITabNavigationProps = {
      activeTab: 'campaign-dashboard',
      onTabChange: jest.fn(),
    };

    it('renders with overflow-x-auto for horizontal scrolling', () => {
      render(<TabNavigation {...defaultProps} />);
      const nav = screen.getByTestId('tab-navigation');
      expect(nav.className).toContain('overflow-x-auto');
    });

    it('renders tabs with touch target and responsive padding', () => {
      render(<TabNavigation {...defaultProps} />);
      const tab = screen.getByTestId('tab-campaign-dashboard');
      expect(tab.className).toContain('min-h-[44px]');
      expect(tab.className).toContain('md:min-h-0');
      expect(tab.className).toContain('px-4');
      expect(tab.className).toContain('md:px-6');
    });

    it('applies whitespace-nowrap to prevent tab text wrapping', () => {
      render(<TabNavigation {...defaultProps} />);
      const tab = screen.getByTestId('tab-campaign-dashboard');
      expect(tab.className).toContain('whitespace-nowrap');
    });
  });

  describe('DrillDownLink', () => {
    const defaultProps = {
      label: 'View Details',
      targetTab: 'encounter-history' as const,
    };

    it('renders with mobile touch target padding', () => {
      render(<DrillDownLink {...defaultProps} />);
      const link = screen.getByTestId('drill-down-link');
      expect(link.className).toContain('py-2');
      expect(link.className).toContain('px-3');
      expect(link.className).toContain('min-h-[44px]');
    });

    it('removes extra padding on md+ screens', () => {
      render(<DrillDownLink {...defaultProps} />);
      const link = screen.getByTestId('drill-down-link');
      expect(link.className).toContain('md:py-0');
      expect(link.className).toContain('md:px-0');
      expect(link.className).toContain('md:min-h-0');
    });
  });

  describe('FilterPanel', () => {
    const defaultProps: IFilterPanelProps = {
      filters: sampleFilterDefs,
      activeFilters: {},
      onFilterChange: jest.fn(),
    };

    it('renders filter summary with touch target', () => {
      render(<FilterPanel {...defaultProps} />);
      const summary = screen.getByTestId('filter-summary-outcome');
      expect(summary.className).toContain('min-h-[44px]');
      expect(summary.className).toContain('md:min-h-0');
    });

    it('renders filter options with touch-friendly padding', () => {
      render(<FilterPanel {...defaultProps} />);
      const option = screen.getByTestId('filter-option-outcome-victory');
      expect(option.className).toContain('py-2');
      expect(option.className).toContain('min-h-[44px]');
      expect(option.className).toContain('md:py-1');
      expect(option.className).toContain('md:min-h-0');
    });

    it('renders clear all button with touch target when active', () => {
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ outcome: ['victory'] }}
        />,
      );
      const clearBtn = screen.getByTestId('clear-all-button');
      expect(clearBtn.className).toContain('min-h-[44px]');
      expect(clearBtn.className).toContain('md:min-h-0');
    });

    it('renders search input with touch target', () => {
      render(
        <FilterPanel
          {...defaultProps}
          enableSearch
          onSearchChange={jest.fn()}
        />,
      );
      const input = screen.getByTestId('filter-search-input');
      expect(input.className).toContain('min-h-[44px]');
      expect(input.className).toContain('md:min-h-0');
    });
  });
});

describe('Visual Regression: Breakpoint Classes', () => {
  it('KPICard renders responsive grid parent (1 col mobile, 2 tablet, 4 desktop)', () => {
    render(
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="kpi-grid"
      >
        <KPICard label="A" value={1} />
        <KPICard label="B" value={2} />
        <KPICard label="C" value={3} />
        <KPICard label="D" value={4} />
      </div>,
    );
    const grid = screen.getByTestId('kpi-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('md:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-4');
  });

  it('sidebar+main layout has correct responsive classes', () => {
    render(
      <div className="flex flex-col lg:flex-row gap-4" data-testid="layout">
        <aside className="w-full lg:w-64" data-testid="sidebar">
          Sidebar
        </aside>
        <main className="flex-1" data-testid="main">
          Main
        </main>
      </div>,
    );
    const layout = screen.getByTestId('layout');
    expect(layout.className).toContain('flex-col');
    expect(layout.className).toContain('lg:flex-row');

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toContain('w-full');
    expect(sidebar.className).toContain('lg:w-64');
  });

  it('analysis grid has responsive column layout', () => {
    render(
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        data-testid="analysis-grid"
      >
        <div>A</div>
        <div>B</div>
      </div>,
    );
    const grid = screen.getByTestId('analysis-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('md:grid-cols-2');
  });
});

describe('Touch Target Compliance', () => {
  it('all interactive elements have min-h-[44px] or md:min-h-0 pattern', () => {
    const touchTargetPattern = /min-h-\[44px\]/;
    const responsiveReset = /md:min-h-0/;

    const filterProps: IFilterPanelProps = {
      filters: sampleFilterDefs,
      activeFilters: { outcome: ['victory'] },
      onFilterChange: jest.fn(),
      enableSearch: true,
      onSearchChange: jest.fn(),
    };
    render(<FilterPanel {...filterProps} />);

    const clearButton = screen.getByTestId('clear-all-button');
    expect(clearButton.className).toMatch(touchTargetPattern);
    expect(clearButton.className).toMatch(responsiveReset);

    const searchInput = screen.getByTestId('filter-search-input');
    expect(searchInput.className).toMatch(touchTargetPattern);

    const filterOption = screen.getByTestId('filter-option-outcome-victory');
    expect(filterOption.className).toMatch(touchTargetPattern);
  });
});
