/**
 * Tests for Pagination component
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import Pagination from '@/components/common/Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render pagination controls', () => {
      render(<Pagination {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Previous/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
    });

    it('should display current page and total pages', () => {
      render(<Pagination {...defaultProps} currentPage={5} totalPages={20} />);

      expect(screen.getByText('Page 5 of 20')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onPageChange with next page when Next is clicked', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          onPageChange={onPageChange}
          currentPage={3}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange with previous page when Previous is clicked', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          onPageChange={onPageChange}
          currentPage={3}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should not call onPageChange when clicking Previous on first page', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          onPageChange={onPageChange}
          currentPage={1}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should not call onPageChange when clicking Next on last page', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          onPageChange={onPageChange}
          currentPage={10}
          totalPages={10}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Button states', () => {
    it('should disable Previous button on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
    });

    it('should disable Next button on last page', () => {
      render(<Pagination {...defaultProps} currentPage={10} totalPages={10} />);

      expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
    });

    it('should enable both buttons on middle page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      expect(
        screen.getByRole('button', { name: /Previous/i }),
      ).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /Next/i })).not.toBeDisabled();
    });
  });

  describe('Edge cases', () => {
    it('should handle single page', () => {
      render(<Pagination {...defaultProps} currentPage={1} totalPages={1} />);

      expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    it('should handle two pages on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} totalPages={2} />);

      expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Next/i })).not.toBeDisabled();
    });

    it('should handle two pages on last page', () => {
      render(<Pagination {...defaultProps} currentPage={2} totalPages={2} />);

      expect(
        screen.getByRole('button', { name: /Previous/i }),
      ).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
    });
  });
});
