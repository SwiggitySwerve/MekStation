/**
 * Tests for Layout component
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});

