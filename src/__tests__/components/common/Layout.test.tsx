/**
 * Tests for Layout component
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from '@/components/common/Layout';

// Mock Next.js Head component
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

// Mock the mobile sidebar store
const mockOpenMobileSidebar = jest.fn();
jest.mock('@/stores/navigationStore', () => ({
  useMobileSidebarStore: (selector?: (state: { isOpen: boolean; open: () => void }) => unknown) => {
    const state = { isOpen: false, open: mockOpenMobileSidebar };
    // If no selector is provided, return the full state object
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

describe('Layout', () => {
  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <Layout>
          <div data-testid="content">Main content</div>
        </Layout>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('should render with default title', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(document.title).toBeDefined();
    });

    it('should have main element', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('should render sidebar component when provided', () => {
      render(
        <Layout sidebarComponent={<div data-testid="sidebar">Sidebar</div>}>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should not render sidebar when not provided', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    });

    it('should adjust margin when sidebar is collapsed (desktop only)', () => {
      const { container } = render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          isSidebarCollapsed={true}
        >
          <div>Content</div>
        </Layout>
      );

      // When collapsed, should have lg:ml-16 class (desktop only margin)
      const contentArea = container.querySelector('.lg\\:ml-16');
      expect(contentArea).toBeInTheDocument();
    });

    it('should adjust margin when sidebar is expanded (desktop only)', () => {
      const { container } = render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          isSidebarCollapsed={false}
        >
          <div>Content</div>
        </Layout>
      );

      // When expanded, should have lg:ml-56 class (desktop only margin)
      const contentArea = container.querySelector('.lg\\:ml-56');
      expect(contentArea).toBeInTheDocument();
    });

    it('should not apply sidebar margins when no sidebar provided', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      // Should NOT have any lg:ml-* classes when no sidebar
      const contentAreaWithMargin = container.querySelector('[class*="lg:ml-"]');
      expect(contentAreaWithMargin).not.toBeInTheDocument();
    });
  });

  describe('Secondary Sidebar', () => {
    it('should render secondary sidebar when provided', () => {
      render(
        <Layout secondarySidebar={<div data-testid="secondary">Secondary</div>}>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId('secondary')).toBeInTheDocument();
    });

    it('should not render secondary sidebar when not provided', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      // No aside element for secondary sidebar
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('should render both sidebars when provided', () => {
      render(
        <Layout 
          sidebarComponent={<div data-testid="primary-sidebar">Primary</div>}
          secondarySidebar={<div data-testid="secondary-sidebar">Secondary</div>}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId('primary-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-sidebar')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const rootDiv = container.querySelector('.bg-surface-deep');
      expect(rootDiv).toBeInTheDocument();
    });

    it('should have full screen height', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const rootDiv = container.querySelector('.h-screen');
      expect(rootDiv).toBeInTheDocument();
    });

    it('should have overflow hidden on root', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const rootDiv = container.querySelector('.overflow-hidden');
      expect(rootDiv).toBeInTheDocument();
    });

    it('should have transition for sidebar animation', () => {
      const { container } = render(
        <Layout sidebarComponent={<div>Sidebar</div>}>
          <div>Content</div>
        </Layout>
      );

      const transitionDiv = container.querySelector('.transition-all');
      expect(transitionDiv).toBeInTheDocument();
    });
  });

  describe('Print styles', () => {
    it('should hide sidebar in print', () => {
      const { container } = render(
        <Layout sidebarComponent={<div>Sidebar</div>}>
          <div>Content</div>
        </Layout>
      );

      const printHiddenElements = container.querySelectorAll('.print\\:hidden');
      expect(printHiddenElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive behavior', () => {
    it('should have flex layout', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const flexElements = container.querySelectorAll('.flex');
      expect(flexElements.length).toBeGreaterThan(0);
    });

    it('should have flex-1 on content area', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const flexOneElements = container.querySelectorAll('.flex-1');
      expect(flexOneElements.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile header', () => {
    beforeEach(() => {
      mockOpenMobileSidebar.mockClear();
    });

    it('should render mobile header when sidebar is provided', () => {
      render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          title="Test Page"
        >
          <div>Content</div>
        </Layout>
      );

      // Mobile header should show the title
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      
      // Should have the hamburger menu button
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    });

    it('should not render mobile header when no sidebar is provided', () => {
      render(
        <Layout title="Test Page">
          <div>Content</div>
        </Layout>
      );

      // Should not have mobile header button
      expect(screen.queryByRole('button', { name: /open navigation menu/i })).not.toBeInTheDocument();
    });

    it('should not render mobile header when hideMobileHeader is true', () => {
      render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          title="Test Page"
          hideMobileHeader={true}
        >
          <div>Content</div>
        </Layout>
      );

      // Should not have mobile header button when hidden
      expect(screen.queryByRole('button', { name: /open navigation menu/i })).not.toBeInTheDocument();
    });

    it('should call openMobileSidebar when hamburger button is clicked', () => {
      render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          title="Test Page"
        >
          <div>Content</div>
        </Layout>
      );

      const hamburgerButton = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(hamburgerButton);

      expect(mockOpenMobileSidebar).toHaveBeenCalledTimes(1);
    });

    it('should position hamburger button on the right side', () => {
      const { container } = render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          title="Test Page"
        >
          <div>Content</div>
        </Layout>
      );

      // The header should have justify-between which places title left, button right
      const header = container.querySelector('header');
      expect(header).toHaveClass('justify-between');
    });

    it('should hide mobile header on desktop (lg:hidden class)', () => {
      const { container } = render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          title="Test Page"
        >
          <div>Content</div>
        </Layout>
      );

      const header = container.querySelector('header');
      expect(header).toHaveClass('lg:hidden');
    });

    it('should display default title when no title provided', () => {
      render(
        <Layout sidebarComponent={<div>Sidebar</div>}>
          <div>Content</div>
        </Layout>
      );

      // Default title is 'MekStation'
      expect(screen.getByText('MekStation')).toBeInTheDocument();
    });

    it('should have accessible hamburger button', () => {
      render(
        <Layout 
          sidebarComponent={<div>Sidebar</div>}
          title="Test Page"
        >
          <div>Content</div>
        </Layout>
      );

      const button = screen.getByRole('button', { name: /open navigation menu/i });
      expect(button).toHaveAttribute('aria-label', 'Open navigation menu');
    });
  });
});

