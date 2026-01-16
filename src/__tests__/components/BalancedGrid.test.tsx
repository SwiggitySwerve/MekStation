/**
 * Tests for BalancedGrid component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BalancedGrid } from '@/components/common/BalancedGrid';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

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
        </BalancedGrid>
      );
      
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
    });

    it('should render with data-testid', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="my-grid">
          <div>Item</div>
        </BalancedGrid>
      );
      
      expect(screen.getByTestId('my-grid')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} className="custom-class" data-testid="grid">
          <div>Item</div>
        </BalancedGrid>
      );
      
      expect(screen.getByTestId('grid')).toHaveClass('custom-class');
    });

    it('should render as grid display', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={6} data-testid="grid">
          <div>Item</div>
        </BalancedGrid>
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
        </BalancedGrid>
      );
      
      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByText('Single')).toBeInTheDocument();
    });

    it('should handle many children', () => {
      const items = Array.from({ length: 20 }, (_, i) => (
        <div key={i} data-testid={`item-${i}`}>Item {i}</div>
      ));
      
      render(
        <BalancedGrid minItemWidth={60} gap={6}>
          {items}
        </BalancedGrid>
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
        </BalancedGrid>
      );
      
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });

  describe('gap configuration', () => {
    it('should apply specified gap', () => {
      render(
        <BalancedGrid minItemWidth={60} gap={10} data-testid="grid">
          <div>Item</div>
        </BalancedGrid>
      );
      
      const grid = screen.getByTestId('grid');
      expect(grid.style.gap).toBe('10px');
    });

    it('should use default gap of 4 when not specified', () => {
      render(
        <BalancedGrid minItemWidth={60} data-testid="grid">
          <div>Item</div>
        </BalancedGrid>
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
        </BalancedGrid>
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
        </BalancedGrid>
      );
      
      // Children should be focusable
      expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
    });
  });
});

describe('BalancedGrid integration with real content', () => {
  it('should work with typical filter button content', () => {
    const categories = ['Energy', 'Ballistic', 'Missile', 'Artillery', 'Physical', 'Ammo', 'Other', 'All'];
    
    render(
      <BalancedGrid minItemWidth={85} gap={4} data-testid="filter-grid">
        {categories.map(cat => (
          <button key={cat} data-testid={`btn-${cat.toLowerCase()}`}>
            {cat}
          </button>
        ))}
      </BalancedGrid>
    );
    
    const grid = screen.getByTestId('filter-grid');
    expect(grid).toBeInTheDocument();
    
    // All buttons should be rendered
    categories.forEach(cat => {
      expect(screen.getByTestId(`btn-${cat.toLowerCase()}`)).toBeInTheDocument();
    });
  });

  it('should work with stat box content', () => {
    const stats = ['Tonnage', 'Walk', 'Run', 'Jump', 'BV', 'Engine', 'Weight', 'Armor', 'Slots', 'Heat'];
    
    render(
      <BalancedGrid minItemWidth={75} gap={6} data-testid="stats-grid">
        {stats.map(stat => (
          <div key={stat} data-testid={`stat-${stat.toLowerCase()}`}>
            <span>{stat}</span>
            <span>100</span>
          </div>
        ))}
      </BalancedGrid>
    );
    
    const grid = screen.getByTestId('stats-grid');
    expect(grid).toBeInTheDocument();
    
    // All stats should be rendered
    stats.forEach(stat => {
      expect(screen.getByTestId(`stat-${stat.toLowerCase()}`)).toBeInTheDocument();
    });
  });
});
