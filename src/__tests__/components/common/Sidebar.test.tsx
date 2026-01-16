/**
 * Tests for Sidebar component
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/common/Sidebar';

// Mock Next.js Link component with legacyBehavior support
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, legacyBehavior }: { children: React.ReactNode | ((props: { href: string }) => React.ReactNode); href: string; legacyBehavior?: boolean }): React.ReactElement => {
      // Normalize children so TypeScript sees a ReactNode before rendering
      const resolvedChildren = typeof children === 'function' ? children({ href }) : children;

      if (legacyBehavior) {
        // For legacyBehavior, children can be a function or React element
        if (React.isValidElement(resolvedChildren)) {
          return React.cloneElement(resolvedChildren as React.ReactElement<{ href?: string }>, { href });
        }
        return <>{resolvedChildren}</>;
      }

      // For non-legacy, wrap children in anchor
      return <a href={href}>{resolvedChildren}</a>;
    },
  };
});

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock the mobile sidebar store with configurable state
let mockIsOpen = false;
const mockClose = jest.fn();
jest.mock('@/stores/navigationStore', () => ({
  useMobileSidebarStore: (selector?: (state: { isOpen: boolean; close: () => void }) => unknown) => {
    const state = { isOpen: mockIsOpen, close: mockClose };
    // If no selector is provided, return the full state object
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

describe('Sidebar', () => {
  const defaultProps = {
    isCollapsed: false,
    setIsCollapsed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sidebar with brand name', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('MekStation')).toBeInTheDocument();
    });

    it('should render navigation items', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Units')).toBeInTheDocument();
      expect(screen.getByText('Compendium')).toBeInTheDocument();
      expect(screen.getByText('Customizer')).toBeInTheDocument();
      expect(screen.getByText('Compare')).toBeInTheDocument();
    });

    it('should display subtitle when expanded', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);

      expect(screen.getByText('BattleTech Lab')).toBeInTheDocument();
    });
  });

  describe('Collapsed state', () => {
    it('should hide brand name when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);

      expect(screen.queryByText('MekStation')).not.toBeInTheDocument();
    });

    it('should show nav labels as tooltips when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);

      // Labels are in tooltips (invisible by default but in DOM)
      const unitsTooltips = screen.getAllByText('Units');
      expect(unitsTooltips.length).toBeGreaterThan(0);
    });

    it('should hide subtitle when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);

      expect(screen.queryByText('BattleTech Lab')).not.toBeInTheDocument();
    });

    it('should have narrow width when collapsed', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={true} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('w-16');
    });

    it('should have wide width when expanded', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={false} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('w-56');
    });
  });

  describe('Toggle functionality', () => {
    it('should call setIsCollapsed when toggle button clicked', () => {
      const setIsCollapsed = jest.fn();
      render(<Sidebar {...defaultProps} isCollapsed={false} setIsCollapsed={setIsCollapsed} />);

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      fireEvent.click(toggleButton);

      expect(setIsCollapsed).toHaveBeenCalledWith(true);
    });

    it('should expand when toggle clicked while collapsed', () => {
      const setIsCollapsed = jest.fn();
      render(<Sidebar {...defaultProps} isCollapsed={true} setIsCollapsed={setIsCollapsed} />);

      const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
      fireEvent.click(toggleButton);

      expect(setIsCollapsed).toHaveBeenCalledWith(false);
    });
  });

  describe('Navigation links', () => {
    it('should have correct href for Dashboard', () => {
      render(<Sidebar {...defaultProps} />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/');
    });

    it('should have correct href for Units', () => {
      render(<Sidebar {...defaultProps} />);

      const unitsLink = screen.getByText('Units').closest('a');
      expect(unitsLink).toHaveAttribute('href', '/units');
    });

    it('should have correct href for Compendium', () => {
      render(<Sidebar {...defaultProps} />);

      const compendiumLink = screen.getByText('Compendium').closest('a');
      expect(compendiumLink).toHaveAttribute('href', '/compendium');
    });

    it('should have correct href for Customizer', () => {
      render(<Sidebar {...defaultProps} />);

      const customizerLink = screen.getByText('Customizer').closest('a');
      expect(customizerLink).toHaveAttribute('href', '/customizer');
    });

    it('should have correct href for Compare', () => {
      render(<Sidebar {...defaultProps} />);

      const compareLink = screen.getByText('Compare').closest('a');
      expect(compareLink).toHaveAttribute('href', '/compare');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible toggle button label when expanded', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);

      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    });

    it('should have accessible toggle button label when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);

      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have dark background', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('bg-surface-deep');
    });

    it('should be fixed positioned', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('fixed');
    });

    it('should have transition classes for transform', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('transition-transform');
    });
  });

  describe('Mobile overlay behavior', () => {
    // Note: Mobile state is now managed by useMobileSidebarStore
    // The store is mocked at the top of this file with isOpen: false by default
    
    beforeEach(() => {
      mockIsOpen = false;
      mockClose.mockClear();
    });

    it('should be translated off-screen when mobile is closed (default mock state)', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('should have lg:translate-x-0 for desktop visibility', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('lg:translate-x-0');
    });

    it('should be translated to visible position when mobile sidebar is open', () => {
      mockIsOpen = true;
      const { container } = render(<Sidebar {...defaultProps} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      expect(sidebar).toHaveClass('translate-x-0');
    });

    it('should show backdrop overlay when mobile sidebar is open', () => {
      mockIsOpen = true;
      const { container } = render(<Sidebar {...defaultProps} />);

      // Look for the backdrop div
      const backdrop = container.querySelector('[class*="bg-black"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('should hide backdrop when mobile sidebar is closed', () => {
      mockIsOpen = false;
      const { container } = render(<Sidebar {...defaultProps} />);

      // Backdrop should have pointer-events-none or be invisible
      const backdrop = container.querySelector('[class*="bg-black"]');
      if (backdrop) {
        // Either it's hidden or has pointer-events-none
        expect(backdrop.className).toMatch(/opacity-0|pointer-events-none/);
      }
    });
  });

  describe('Mobile expansion behavior', () => {
    beforeEach(() => {
      mockClose.mockClear();
    });

    it('should show expanded width when mobile sidebar is open regardless of isCollapsed prop', () => {
      mockIsOpen = true;
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={true} />);

      const sidebar = container.querySelector('aside') as HTMLElement;
      // When mobile is open, should be expanded (w-56) not collapsed (w-16)
      expect(sidebar).toHaveClass('w-56');
    });

    it('should show nav labels when mobile sidebar is open regardless of isCollapsed prop', () => {
      mockIsOpen = true;
      render(<Sidebar {...defaultProps} isCollapsed={true} />);

      // Should show the full brand name since mobile opens expanded
      expect(screen.getByText('MekStation')).toBeInTheDocument();
    });

    it('should call close when navigation item is clicked', () => {
      mockIsOpen = true;
      render(<Sidebar {...defaultProps} />);

      // Click on a navigation item
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      if (dashboardLink) {
        fireEvent.click(dashboardLink);
      }

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should call close when backdrop is clicked', () => {
      mockIsOpen = true;
      const { container } = render(<Sidebar {...defaultProps} />);

      // Find and click the backdrop
      const backdrop = container.querySelector('[class*="bg-black"]');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should hide collapse toggle button on mobile', () => {
      mockIsOpen = true;
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={false} />);

      // The toggle button should have lg:block (hidden on mobile)
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toHaveClass('lg:block');
      expect(toggleButton).toHaveClass('hidden');
    });
  });
});
