/**
 * Tests for BalancedGrid component
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { BalancedGrid } from '@/components/common/BalancedGrid';

// Mock ResizeObserver - uses global mock from jest.setup.js
// Additional mock setup for tests that need to trigger resize callbacks
const mockResizeObserverInstances: Array<{ callback: ResizeObserverCallback }> =
  [];

class MockResizeObserver implements ResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    mockResizeObserverInstances.push(this);
  }

  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

// Assign with proper typing to avoid double assertion
(global as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver;

// Mock requestAnimationFrame to execute callback immediately
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  callback(0);
  return 0;
});

global.cancelAnimationFrame = jest.fn();

// Mock offsetWidth for container measurement
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() {
    return 700; // Default mock width
  },
});

describe('BalancedGrid', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6}>
          <div data-testid="item-1">Item 1</div>
          <div data-testid="item-2">Item 2</div>
          <div data-testid="item-3">Item 3</div>
        </BalancedGrid>,
      );

      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
    });

    it('should render with data-testid', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="my-grid">
          <div>Item</div>
        </BalancedGrid>,
      );

      expect(screen.getByTestId('my-grid')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <BalancedGrid
          minItemWidth={60}
          gap={6}
          className="custom-class"
          data-testid="grid"
        >
          <div>Item</div>
        </BalancedGrid>,
      );

      expect(screen.getByTestId('grid')).toHaveClass('custom-class');
    });

    it('should render as grid display', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="grid">
          <div>Item</div>
        </BalancedGrid>,
      );

      const grid = screen.getByTestId('grid');
      expect(grid.style.display).toBe('grid');
    });
  });

  describe('children counting', () => {
    it('should handle single child', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="grid">
          <div>Single</div>
        </BalancedGrid>,
      );

      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByText('Single')).toBeInTheDocument();
    });

    it('should handle many children', () => {
      const items = Array.from({ length: 20 }, (_, i) => (
        <div key={i} data-testid={`item-${i}`}>
          Item {i}
        </div>
      ));

      render(
        <BalancedGrid minItemWidth={60} gap={6}>
          {items}
        </BalancedGrid>,
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-19')).toBeInTheDocument();
    });

    it('should handle conditional children (with null/undefined)', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6}>
          <div data-testid="item-1">Item 1</div>
          {false && <div>Hidden</div>}
          {null}
          {undefined}
          <div data-testid="item-2">Item 2</div>
        </BalancedGrid>,
      );

      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('should correctly count children excluding false conditionals', () => {
      // This tests the fix for {condition && <Component/>} pattern
      // When condition is false, the expression evaluates to `false`
      // Children.toArray excludes false, so itemCount should be accurate
      const showOptional = false;

      render(
        <BalancedGrid minItemWidth={75} gap={6} data-testid="grid">
          <div data-testid="stat-1">Stat 1</div>
          <div data-testid="stat-2">Stat 2</div>
          <div data-testid="stat-3">Stat 3</div>
          {showOptional && <div data-testid="stat-optional">Optional</div>}
          <div data-testid="stat-4">Stat 4</div>
          <div data-testid="stat-5">Stat 5</div>
        </BalancedGrid>,
      );

      // Should render exactly 5 items (not 6)
      expect(screen.getByTestId('stat-1')).toBeInTheDocument();
      expect(screen.getByTestId('stat-2')).toBeInTheDocument();
      expect(screen.getByTestId('stat-3')).toBeInTheDocument();
      expect(screen.getByTestId('stat-4')).toBeInTheDocument();
      expect(screen.getByTestId('stat-5')).toBeInTheDocument();
      expect(screen.queryByTestId('stat-optional')).not.toBeInTheDocument();
    });

    it('should include conditional children when condition is true', () => {
      const showOptional = true;

      render(
        <BalancedGrid minItemWidth={75} gap={6} data-testid="grid">
          <div data-testid="stat-1">Stat 1</div>
          <div data-testid="stat-2">Stat 2</div>
          {showOptional && <div data-testid="stat-optional">Optional</div>}
          <div data-testid="stat-3">Stat 3</div>
        </BalancedGrid>,
      );

      // Should render exactly 4 items including optional
      expect(screen.getByTestId('stat-1')).toBeInTheDocument();
      expect(screen.getByTestId('stat-2')).toBeInTheDocument();
      expect(screen.getByTestId('stat-optional')).toBeInTheDocument();
      expect(screen.getByTestId('stat-3')).toBeInTheDocument();
    });

    it('should handle mixed conditional patterns', () => {
      const conditions = { a: true, b: false, c: true };

      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="grid">
          <div data-testid="always-1">Always 1</div>
          {conditions.a && <div data-testid="cond-a">Condition A</div>}
          {conditions.b && <div data-testid="cond-b">Condition B</div>}
          {conditions.c && <div data-testid="cond-c">Condition C</div>}
          <div data-testid="always-2">Always 2</div>
          {null}
          {undefined}
        </BalancedGrid>,
      );

      // Should render 4 items (2 always + 2 true conditions)
      expect(screen.getByTestId('always-1')).toBeInTheDocument();
      expect(screen.getByTestId('cond-a')).toBeInTheDocument();
      expect(screen.queryByTestId('cond-b')).not.toBeInTheDocument();
      expect(screen.getByTestId('cond-c')).toBeInTheDocument();
      expect(screen.getByTestId('always-2')).toBeInTheDocument();
    });
  });

  describe('gap configuration', () => {
    it('should apply specified gap', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={10} data-testid="grid">
          <div>Item</div>
        </BalancedGrid>,
      );

      const grid = screen.getByTestId('grid');
      expect(grid.style.gap).toBe('10px');
    });

    it('should use default gap of 4 when not specified', () => {
      render(
        <BalancedGrid minItemWidth={60} data-testid="grid">
          <div>Item</div>
        </BalancedGrid>,
      );

      const grid = screen.getByTestId('grid');
      expect(grid.style.gap).toBe('4px');
    });
  });

  describe('fallback columns', () => {
    it('should use provided fallback when specified', () => {
      // Before ready state, should use fallback
      // Note: In practice, this is brief during SSR/hydration
      render(
        <BalancedGrid
          minItemWidth={60}
          gap={6}
          fallbackColumns="repeat(4, 1fr)"
          data-testid="grid"
        >
          <div>Item</div>
        </BalancedGrid>,
      );

      // After mount, grid should have grid-template-columns set
      const grid = screen.getByTestId('grid');
      expect(grid.style.gridTemplateColumns).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should be accessible as a container', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="grid">
          <button>Action 1</button>
          <button>Action 2</button>
        </BalancedGrid>,
      );

      // Children should be focusable
      expect(
        screen.getByRole('button', { name: 'Action 1' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Action 2' }),
      ).toBeInTheDocument();
    });
  });
});

describe('BalancedGrid integration with real content', () => {
  it('should work with typical filter button content', () => {
    const categories = [
      'Energy',
      'Ballistic',
      'Missile',
      'Artillery',
      'Physical',
      'Ammo',
      'Other',
      'All',
    ];

    render(
      <BalancedGrid minItemWidth={85} gap={4} data-testid="filter-grid">
        {categories.map((cat) => (
          <button key={cat} data-testid={`btn-${cat.toLowerCase()}`}>
            {cat}
          </button>
        ))}
      </BalancedGrid>,
    );

    const grid = screen.getByTestId('filter-grid');
    expect(grid).toBeInTheDocument();

    // All buttons should be rendered
    categories.forEach((cat) => {
      expect(
        screen.getByTestId(`btn-${cat.toLowerCase()}`),
      ).toBeInTheDocument();
    });
  });

  it('should work with stat box content', () => {
    const stats = [
      'Tonnage',
      'Walk',
      'Run',
      'Jump',
      'BV',
      'Engine',
      'Weight',
      'Armor',
      'Slots',
      'Heat',
    ];

    render(
      <BalancedGrid minItemWidth={75} gap={6} data-testid="stats-grid">
        {stats.map((stat) => (
          <div key={stat} data-testid={`stat-${stat.toLowerCase()}`}>
            <span>{stat}</span>
            <span>100</span>
          </div>
        ))}
      </BalancedGrid>,
    );

    const grid = screen.getByTestId('stats-grid');
    expect(grid).toBeInTheDocument();

    // All stats should be rendered
    stats.forEach((stat) => {
      expect(
        screen.getByTestId(`stat-${stat.toLowerCase()}`),
      ).toBeInTheDocument();
    });
  });

  it('should handle UnitInfoBanner pattern with optional Run+ stat', () => {
    // This mirrors the actual UnitInfoBanner component structure
    const hasRunPlus = false; // Simulates when maxRunMP <= runMP

    render(
      <BalancedGrid minItemWidth={75} gap={6} data-testid="unit-stats">
        <div data-testid="tonnage">Tonnage</div>
        <div data-testid="walk">Walk</div>
        <div data-testid="run">Run</div>
        {hasRunPlus && <div data-testid="run-plus">Run+</div>}
        <div data-testid="jump">Jump</div>
        <div data-testid="bv">BV</div>
        <div data-testid="engine">Engine</div>
        <div data-testid="weight">Weight</div>
        <div data-testid="armor">Armor</div>
        <div data-testid="slots">Slots</div>
        <div data-testid="heat">Heat</div>
      </BalancedGrid>,
    );

    // Should have exactly 10 items (Run+ excluded)
    expect(screen.getByTestId('tonnage')).toBeInTheDocument();
    expect(screen.getByTestId('walk')).toBeInTheDocument();
    expect(screen.getByTestId('run')).toBeInTheDocument();
    expect(screen.queryByTestId('run-plus')).not.toBeInTheDocument();
    expect(screen.getByTestId('jump')).toBeInTheDocument();
    expect(screen.getByTestId('bv')).toBeInTheDocument();
    expect(screen.getByTestId('engine')).toBeInTheDocument();
    expect(screen.getByTestId('weight')).toBeInTheDocument();
    expect(screen.getByTestId('armor')).toBeInTheDocument();
    expect(screen.getByTestId('slots')).toBeInTheDocument();
    expect(screen.getByTestId('heat')).toBeInTheDocument();
  });

  it('should handle UnitInfoBanner pattern with Run+ stat included', () => {
    const hasRunPlus = true; // Simulates when maxRunMP > runMP

    render(
      <BalancedGrid minItemWidth={75} gap={6} data-testid="unit-stats">
        <div data-testid="tonnage">Tonnage</div>
        <div data-testid="walk">Walk</div>
        <div data-testid="run">Run</div>
        {hasRunPlus && <div data-testid="run-plus">Run+</div>}
        <div data-testid="jump">Jump</div>
        <div data-testid="bv">BV</div>
        <div data-testid="engine">Engine</div>
        <div data-testid="weight">Weight</div>
        <div data-testid="armor">Armor</div>
        <div data-testid="slots">Slots</div>
        <div data-testid="heat">Heat</div>
      </BalancedGrid>,
    );

    // Should have exactly 11 items (Run+ included)
    expect(screen.getByTestId('tonnage')).toBeInTheDocument();
    expect(screen.getByTestId('walk')).toBeInTheDocument();
    expect(screen.getByTestId('run')).toBeInTheDocument();
    expect(screen.getByTestId('run-plus')).toBeInTheDocument();
    expect(screen.getByTestId('jump')).toBeInTheDocument();
    expect(screen.getByTestId('bv')).toBeInTheDocument();
    expect(screen.getByTestId('engine')).toBeInTheDocument();
    expect(screen.getByTestId('weight')).toBeInTheDocument();
    expect(screen.getByTestId('armor')).toBeInTheDocument();
    expect(screen.getByTestId('slots')).toBeInTheDocument();
    expect(screen.getByTestId('heat')).toBeInTheDocument();
  });
});
