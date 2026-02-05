/**
 * Tests for CategoryNavigation component
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import CategoryNavigation from '@/components/common/CategoryNavigation';

// Mock fetch
global.fetch = jest.fn();

describe('CategoryNavigation', () => {
  const mockCategories = ['meks', 'vehicles', 'infantry', 'battlearmor'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading message initially', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={jest.fn()}
        />,
      );

      expect(screen.getByText('Loading categories...')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockCategories,
      });
    });

    it('should display categories after loading', async () => {
      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('meks')).toBeInTheDocument();
        expect(screen.getByText('vehicles')).toBeInTheDocument();
        expect(screen.getByText('infantry')).toBeInTheDocument();
      });
    });

    it('should display "All Units" option', async () => {
      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('All Units')).toBeInTheDocument();
      });
    });

    it('should call onSelectCategory when category is clicked', async () => {
      const onSelectCategory = jest.fn();
      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={onSelectCategory}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('meks')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('meks'));

      expect(onSelectCategory).toHaveBeenCalledWith('meks');
    });

    it('should call onSelectCategory with null for "All Units"', async () => {
      const onSelectCategory = jest.fn();
      render(
        <CategoryNavigation
          selectedCategory="meks"
          onSelectCategory={onSelectCategory}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('All Units')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('All Units'));

      expect(onSelectCategory).toHaveBeenCalledWith(null);
    });

    it('should highlight selected category', async () => {
      render(
        <CategoryNavigation
          selectedCategory="meks"
          onSelectCategory={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('meks')).toBeInTheDocument();
      });

      const meksButton = screen.getByText('meks');
      expect(meksButton).toHaveClass('bg-blue-500');
    });

    it('should highlight "All Units" when no category selected', async () => {
      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('All Units')).toBeInTheDocument();
      });

      const allUnitsButton = screen.getByText('All Units');
      expect(allUnitsButton).toHaveClass('bg-blue-500');
    });
  });

  describe('Error state', () => {
    it('should display error message on fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should display error message on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <CategoryNavigation
          selectedCategory={null}
          onSelectCategory={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });
});
