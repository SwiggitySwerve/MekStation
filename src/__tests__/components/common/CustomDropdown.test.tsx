/**
 * Tests for CustomDropdown component
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomDropdown from '@/components/common/CustomDropdown';

describe('CustomDropdown', () => {
  const defaultProps = {
    value: '',
    options: ['Option 1', 'Option 2', 'Option 3'],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dropdown button', () => {
      render(<CustomDropdown {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should display placeholder when no value is selected', () => {
      render(<CustomDropdown {...defaultProps} placeholder="Select an option" />);

      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('should display selected value', () => {
      render(<CustomDropdown {...defaultProps} value="Option 1" />);

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('should use default placeholder when none is provided', () => {
      render(<CustomDropdown {...defaultProps} />);

      expect(screen.getByText('Select...')).toBeInTheDocument();
    });
  });

  describe('Opening and closing', () => {
    it('should show options when button is clicked', () => {
      render(<CustomDropdown {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should hide options when clicking outside', () => {
      render(
        <div>
          <CustomDropdown {...defaultProps} />
          <div data-testid="outside">Outside</div>
        </div>
      );

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getAllByText('Option 1')).toHaveLength(1);

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      // Options should be hidden (only the main button text should remain)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1); // Only the main button
    });

    it('should toggle dropdown on repeated clicks', () => {
      render(<CustomDropdown {...defaultProps} />);
      const button = screen.getByRole('button');

      // Open
      fireEvent.click(button);
      expect(screen.getAllByRole('button').length).toBeGreaterThan(1);

      // Close
      fireEvent.click(button);
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
  });

  describe('Selection', () => {
    it('should call onChange when option is selected', () => {
      const onChange = jest.fn();
      render(<CustomDropdown {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Option 2'));

      expect(onChange).toHaveBeenCalledWith('Option 2');
    });

    it('should close dropdown after selection', () => {
      render(<CustomDropdown {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Option 2'));

      // Should only have the main button now
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('should highlight selected option', () => {
      render(<CustomDropdown {...defaultProps} value="Option 2" />);

      fireEvent.click(screen.getByRole('button'));

      // The selected option should have a different style
      // Get option buttons (not the main dropdown button)
      const allButtons = screen.getAllByRole('button');
      const optionButton = allButtons.find(btn => 
        btn.textContent === 'Option 2' && btn !== screen.getAllByRole('button')[0]
      );
      expect(optionButton).toBeDefined();
      // The selected option should have blue background styling
      expect(optionButton?.className).toContain('bg-accent');
    });
  });

  describe('Disabled state', () => {
    it('should not open when disabled', () => {
      render(<CustomDropdown {...defaultProps} disabled={true} />);

      fireEvent.click(screen.getByRole('button'));

      // Should only have the main button
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('should have disabled styling', () => {
      render(<CustomDropdown {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button')).toHaveClass('opacity-50');
      expect(screen.getByRole('button')).toHaveClass('cursor-not-allowed');
    });

    it('should be disabled in DOM', () => {
      render(<CustomDropdown {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<CustomDropdown {...defaultProps} className="custom-class" />);

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Keyboard navigation', () => {
    it('should be accessible via keyboard', () => {
      render(<CustomDropdown {...defaultProps} />);
      const button = screen.getByRole('button');

      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Empty options', () => {
    it('should handle empty options array', () => {
      render(<CustomDropdown {...defaultProps} options={[]} />);

      fireEvent.click(screen.getByRole('button'));

      // Should only have the main button
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
  });
});

