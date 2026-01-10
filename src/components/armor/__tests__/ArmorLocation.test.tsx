import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArmorLocation } from '../ArmorLocation';

describe('ArmorLocation', () => {
  const mockProps = {
    location: 'Center Torso',
    currentArmor: 50,
    maxArmor: 100,
    onArmorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display location name', () => {
      render(<ArmorLocation {...mockProps} />);
      expect(screen.getByText('Center Torso')).toBeInTheDocument();
    });

    it('should display current and max armor values', () => {
      render(<ArmorLocation {...mockProps} />);
      expect(screen.getByText('50 / 100')).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const section = container.querySelector('section[aria-label*="armor allocation"]');
      expect(section).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have amber color for partial armor', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveClass('bg-amber-500');
    });

    it('should have green color for max armor', () => {
      render(<ArmorLocation {...mockProps} currentArmor={100} maxArmor={100} />);
      const { container } = render(<ArmorLocation currentArmor={100} maxArmor={100} onArmorChange={jest.fn()} location="Head" />);
      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveClass('bg-green-500');
    });

    it('should be collapsed by default', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const details = container.querySelector('[id*="-details"]');
      expect(details).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ArmorLocation {...mockProps} className="custom-class" />);
      const section = container.querySelector('.custom-class');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should expand when header is clicked', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]');
      fireEvent.click(header!);
      expect(container.querySelector('[id*="-details"]')).toBeInTheDocument();
    });

    it('should collapse when header is clicked again', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);
      fireEvent.click(header);
      expect(container.querySelector('[id*="-details"]')).not.toBeInTheDocument();
    });

    it('should update aria-expanded when toggled', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Quick Add Buttons', () => {
    beforeEach(() => {
      // Start with component expanded
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);
    });

    it('should add 5 armor when +5 button is clicked', () => {
      render(<ArmorLocation {...mockProps} />);
      const button = screen.getByLabelText('Add 5 armor to Center Torso');
      fireEvent.click(button);
      expect(mockProps.onArmorChange).toHaveBeenCalledWith(55);
    });

    it('should add 10 armor when +10 button is clicked', () => {
      render(<ArmorLocation {...mockProps} />);
      const button = screen.getByLabelText('Add 10 armor to Center Torso');
      fireEvent.click(button);
      expect(mockProps.onArmorChange).toHaveBeenCalledWith(60);
    });

    it('should add 20 armor when +20 button is clicked', () => {
      render(<ArmorLocation {...mockProps} />);
      const button = screen.getByLabelText('Add 20 armor to Center Torso');
      fireEvent.click(button);
      expect(mockProps.onArmorChange).toHaveBeenCalledWith(70);
    });

    it('should maximize armor when Max button is clicked', () => {
      render(<ArmorLocation {...mockProps} />);
      const button = screen.getByLabelText(/maximize/i);
      fireEvent.click(button);
      expect(mockProps.onArmorChange).toHaveBeenCalledWith(100);
    });

    it('should not exceed max armor with quick add', () => {
      const onArmorChange = jest.fn();
      const { container } = render(
        <ArmorLocation currentArmor={95} maxArmor={100} onArmorChange={onArmorChange} location="Test" />
      );
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const button = screen.getByLabelText('Add 10 armor to Test');
      fireEvent.click(button);
      expect(onArmorChange).toHaveBeenCalledWith(100);
    });

    it('should disable quick add buttons at max armor', () => {
      const onArmorChange = jest.fn();
      const { container } = render(
        <ArmorLocation currentArmor={100} maxArmor={100} onArmorChange={onArmorChange} location="Test" />
      );
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      // Check each quick add button specifically
      expect(screen.getByLabelText('Add 5 armor to Test')).toBeDisabled();
      expect(screen.getByLabelText('Add 10 armor to Test')).toBeDisabled();
      expect(screen.getByLabelText('Add 20 armor to Test')).toBeDisabled();
      expect(screen.getByLabelText(/maximize.*Test/i)).toBeDisabled();
    });
  });

  describe('Stepper Controls', () => {
    it('should display current armor value in stepper', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const value = container.querySelector('.text-2xl');
      expect(value).toHaveTextContent('50');
    });

    it('should increment armor when + button is clicked', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const incrementButton = screen.getByLabelText('Add 1 armor to Center Torso');
      fireEvent.click(incrementButton);
      expect(mockProps.onArmorChange).toHaveBeenCalledWith(51);
    });

    it('should decrement armor when - button is clicked', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const decrementButton = screen.getByLabelText('Remove 1 armor from Center Torso');
      fireEvent.click(decrementButton);
      expect(mockProps.onArmorChange).toHaveBeenCalledWith(49);
    });

    it('should not decrement below 0', () => {
      const { container } = render(<ArmorLocation currentArmor={0} maxArmor={100} onArmorChange={jest.fn()} location="Test" />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const decrementButton = screen.getByLabelText('Remove 1 armor from Test');
      expect(decrementButton).toBeDisabled();
    });

    it('should not increment above max', () => {
      const { container } = render(<ArmorLocation currentArmor={100} maxArmor={100} onArmorChange={jest.fn()} location="Test" />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const incrementButton = screen.getByLabelText('Add 1 armor to Test');
      expect(incrementButton).toBeDisabled();
    });

    it('should have 44x44px minimum touch targets', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded="false"]') as HTMLElement;
      fireEvent.click(header);

      const stepperButtons = container.querySelectorAll('.min-h-\\[44px\\]');
      expect(stepperButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const section = container.querySelector('section[aria-label]');
      expect(section?.getAttribute('aria-label')).toBe('Center Torso armor allocation');
    });

    it('should have aria-expanded on header button', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-expanded]');
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-controls linking to details', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const header = container.querySelector('button[aria-controls]');
      expect(header?.getAttribute('aria-controls')).toBe('center torso-details');
    });

    it('should have proper progressbar attributes', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveAttribute('aria-label', 'Center Torso armor: 50 of 100');
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(<ArmorLocation {...mockProps} />);
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 current armor', () => {
      const { container } = render(<ArmorLocation currentArmor={0} maxArmor={100} onArmorChange={jest.fn()} location="Test" />);
      expect(screen.getByText('0 / 100')).toBeInTheDocument();
    });

    it('should handle zero max armor gracefully', () => {
      const { container } = render(<ArmorLocation currentArmor={0} maxArmor={0} onArmorChange={jest.fn()} location="Test" />);
      expect(screen.getByText('0 / 0')).toBeInTheDocument();
    });

    it('should handle special location names', () => {
      render(<ArmorLocation {...mockProps} location="Rear Left Torso" />);
      expect(screen.getByText('Rear Left Torso')).toBeInTheDocument();
    });
  });
});
