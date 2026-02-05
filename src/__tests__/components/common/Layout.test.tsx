/**
 * Tests for Layout component
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

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
        </Layout>,
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('should render with default title', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      expect(document.title).toBeDefined();
    });

    it('should have main element', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Top Bar', () => {
    it('should render top bar component when provided', () => {
      render(
        <Layout topBarComponent={<div data-testid="topbar">Top Bar</div>}>
          <div>Content</div>
        </Layout>,
      );

      expect(screen.getByTestId('topbar')).toBeInTheDocument();
    });

    it('should not render top bar when not provided', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      expect(screen.queryByTestId('topbar')).not.toBeInTheDocument();
    });
  });

  describe('Secondary Sidebar', () => {
    it('should render secondary sidebar when provided', () => {
      render(
        <Layout secondarySidebar={<div data-testid="secondary">Secondary</div>}>
          <div>Content</div>
        </Layout>,
      );

      expect(screen.getByTestId('secondary')).toBeInTheDocument();
    });

    it('should not render secondary sidebar when not provided', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      // No aside element for secondary sidebar
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('should render both top bar and secondary sidebar when provided', () => {
      render(
        <Layout
          topBarComponent={<div data-testid="topbar">Top Bar</div>}
          secondarySidebar={
            <div data-testid="secondary-sidebar">Secondary</div>
          }
        >
          <div>Content</div>
        </Layout>,
      );

      expect(screen.getByTestId('topbar')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-sidebar')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      const rootDiv = container.querySelector('.bg-surface-deep');
      expect(rootDiv).toBeInTheDocument();
    });

    it('should have full screen height', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      const rootDiv = container.querySelector('.h-screen');
      expect(rootDiv).toBeInTheDocument();
    });

    it('should have overflow hidden on root', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      const rootDiv = container.querySelector('.overflow-hidden');
      expect(rootDiv).toBeInTheDocument();
    });

    it('should have vertical flex layout', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      const flexColDiv = container.querySelector('.flex-col');
      expect(flexColDiv).toBeInTheDocument();
    });
  });

  describe('Print styles', () => {
    it('should hide secondary sidebar in print', () => {
      const { container } = render(
        <Layout secondarySidebar={<div>Secondary</div>}>
          <div>Content</div>
        </Layout>,
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
        </Layout>,
      );

      const flexElements = container.querySelectorAll('.flex');
      expect(flexElements.length).toBeGreaterThan(0);
    });

    it('should have flex-1 on content area', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>,
      );

      const flexOneElements = container.querySelectorAll('.flex-1');
      expect(flexOneElements.length).toBeGreaterThan(0);
    });
  });
});
