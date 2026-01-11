/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for PageLayout Components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageLayout, PageLoading, PageError, EmptyState } from '@/components/ui/PageLayout';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

describe('PageLayout Components', () => {
  describe('PageLayout', () => {
    it('should render title', () => {
      render(<PageLayout title="Test Page">Content</PageLayout>);
      expect(screen.getByRole('heading', { name: 'Test Page' })).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(
        <PageLayout title="Test" subtitle="This is a subtitle">
          Content
        </PageLayout>
      );
      expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<PageLayout title="Test">Child Content</PageLayout>);
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should apply default max width', () => {
      const { container } = render(<PageLayout title="Test">Content</PageLayout>);
      expect(container.querySelector('.max-w-7xl')).toBeInTheDocument();
    });

    it('should apply narrow max width', () => {
      const { container } = render(
        <PageLayout title="Test" maxWidth="narrow">Content</PageLayout>
      );
      expect(container.querySelector('.max-w-5xl')).toBeInTheDocument();
    });

    it('should apply wide max width', () => {
      const { container } = render(
        <PageLayout title="Test" maxWidth="wide">Content</PageLayout>
      );
      expect(container.querySelector('.max-w-screen-2xl')).toBeInTheDocument();
    });

    it('should apply full max width', () => {
      const { container } = render(
        <PageLayout title="Test" maxWidth="full">Content</PageLayout>
      );
      expect(container.querySelector('.max-w-full')).toBeInTheDocument();
    });

    it('should render back link when provided as string', () => {
      render(
        <PageLayout title="Test" backLink="/previous" backLabel="Go Back">
          Content
        </PageLayout>
      );
      const link = screen.getByRole('link', { name: /Go Back/i });
      expect(link).toHaveAttribute('href', '/previous');
    });

    it('should render back link when provided as object', () => {
      render(
        <PageLayout title="Test" backLink={{ href: '/home', label: 'Home' }}>
          Content
        </PageLayout>
      );
      const link = screen.getByRole('link', { name: /Home/i });
      expect(link).toHaveAttribute('href', '/home');
    });

    it('should render back button when onBack provided', () => {
      const handleBack = jest.fn();
      render(
        <PageLayout title="Test" onBack={handleBack} backLabel="Cancel">
          Content
        </PageLayout>
      );
      
      const button = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(button);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });

    it('should render header content', () => {
      render(
        <PageLayout 
          title="Test" 
          headerContent={<button data-testid="header-btn">Action</button>}
        >
          Content
        </PageLayout>
      );
      expect(screen.getByTestId('header-btn')).toBeInTheDocument();
    });

    it('should apply gradient background when gradient=true', () => {
      const { container } = render(
        <PageLayout title="Test" gradient>Content</PageLayout>
      );
      expect(container.firstChild).toHaveClass('bg-gradient-to-br');
    });

    it('should not apply gradient when gradient=false', () => {
      const { container } = render(
        <PageLayout title="Test" gradient={false}>Content</PageLayout>
      );
      expect(container.firstChild).not.toHaveClass('bg-gradient-to-br');
    });
  });

  describe('PageLoading', () => {
    it('should render default loading message', () => {
      render(<PageLoading />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom loading message', () => {
      render(<PageLoading message="Fetching data..." />);
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('should show spinner animation', () => {
      const { container } = render(<PageLoading />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should be centered', () => {
      const { container } = render(<PageLoading />);
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('items-center');
      expect(container.firstChild).toHaveClass('justify-center');
    });
  });

  describe('PageError', () => {
    it('should render default error title', () => {
      render(<PageError message="Something went wrong" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render custom error title', () => {
      render(<PageError title="Not Found" message="Page not found" />);
      expect(screen.getByText('Not Found')).toBeInTheDocument();
    });

    it('should render error message', () => {
      render(<PageError message="Connection failed" />);
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should render back link when provided', () => {
      render(<PageError message="Error" backLink="/" backLabel="Go Home" />);
      const link = screen.getByRole('link', { name: 'Go Home' });
      expect(link).toHaveAttribute('href', '/');
    });

    it('should not render back link when not provided', () => {
      render(<PageError message="Error" />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should use default back label', () => {
      render(<PageError message="Error" backLink="/" />);
      expect(screen.getByRole('link', { name: 'Go Back' })).toBeInTheDocument();
    });

    it('should have error styling', () => {
      const { container } = render(<PageError message="Error" />);
      expect(container.querySelector('.bg-red-900\\/20')).toBeInTheDocument();
      expect(container.querySelector('.border-red-600\\/30')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('should render title', () => {
      render(<EmptyState title="No Items" />);
      expect(screen.getByText('No Items')).toBeInTheDocument();
    });

    it('should render message', () => {
      render(<EmptyState title="Empty" message="Try adding some items" />);
      expect(screen.getByText('Try adding some items')).toBeInTheDocument();
    });

    it('should render icon', () => {
      render(
        <EmptyState 
          title="Empty" 
          icon={<span data-testid="icon">📭</span>}
        />
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render action', () => {
      render(
        <EmptyState 
          title="Empty" 
          action={<button data-testid="action-btn">Add Item</button>}
        />
      );
      expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    });

    it('should have empty state styling', () => {
      const { container } = render(<EmptyState title="Empty" />);
      expect(container.firstChild).toHaveClass('bg-surface-raised/30');
      expect(container.firstChild).toHaveClass('border-dashed');
      expect(container.firstChild).toHaveClass('text-center');
    });
  });
});

