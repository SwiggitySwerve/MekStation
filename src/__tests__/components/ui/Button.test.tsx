/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for Button Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, PaginationButtons } from '@/components/ui/Button';

describe('Button', () => {
  describe('Base Button', () => {
    it('should render children', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('should handle onClick', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should apply primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-accent-hover');
    });

    it('should apply secondary variant (default)', () => {
      render(<Button>Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-surface-raised');
    });

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
    });

    it('should apply pagination variant', () => {
      render(<Button variant="pagination">Pagination</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-surface-base');
    });

    it('should apply danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });

    it('should apply success variant', () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-emerald-600');
    });

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-1.5');
    });

    it('should apply medium size (default)', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when loading', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show loading spinner when isLoading', () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">←</span>}>With Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>With Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should not render right icon when loading', () => {
      render(
        <Button 
          isLoading 
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          Loading
        </Button>
      );
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });

    it('should apply fullWidth class', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('should have base classes', () => {
      render(<Button>Base</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-lg');
      expect(button).toHaveClass('font-medium');
      expect(button).toHaveClass('transition-colors');
    });
  });

  describe('PaginationButtons', () => {
    const defaultProps = {
      currentPage: 1,
      totalPages: 5,
      onPageChange: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render all pagination buttons', () => {
      render(<PaginationButtons {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Prev' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Last' })).toBeInTheDocument();
    });

    it('should show current page info', () => {
      render(<PaginationButtons {...defaultProps} currentPage={3} />);
      expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();
    });

    it('should return null when totalPages is 1', () => {
      const { container } = render(
        <PaginationButtons {...defaultProps} totalPages={1} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should disable First and Prev on first page', () => {
      render(<PaginationButtons {...defaultProps} currentPage={1} />);
      
      expect(screen.getByRole('button', { name: 'First' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
    });

    it('should disable Next and Last on last page', () => {
      render(<PaginationButtons {...defaultProps} currentPage={5} />);
      
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled();
    });

    it('should call onPageChange with 1 when First is clicked', () => {
      const onPageChange = jest.fn();
      render(<PaginationButtons {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'First' }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange with previous page when Prev is clicked', () => {
      const onPageChange = jest.fn();
      render(<PaginationButtons {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with next page when Next is clicked', () => {
      const onPageChange = jest.fn();
      render(<PaginationButtons {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange with totalPages when Last is clicked', () => {
      const onPageChange = jest.fn();
      render(<PaginationButtons {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Last' }));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });
  });
});

