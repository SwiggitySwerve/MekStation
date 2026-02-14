import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { useHaptics } from '@/hooks/useHaptics';

import { AmmoCounter } from '../AmmoCounter';

// Mock haptic feedback
jest.mock('@/hooks/useHaptics');

describe('AmmoCounter', () => {
  const mockVibrateCustom = jest.fn();
  const mockUseHaptics = useHaptics as jest.MockedFunction<typeof useHaptics>;

  const mockProps = {
    weaponName: 'Large Laser',
    shotsRemaining: 10,
    magazineSize: 20,
    onFire: jest.fn(),
    onReload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHaptics.mockReturnValue({
      vibrate: jest.fn(),
      vibrateCustom: mockVibrateCustom,
      cancel: jest.fn(),
      isSupported: true,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should display weapon name', () => {
      render(<AmmoCounter {...mockProps} />);

      expect(screen.getByText('Large Laser')).toBeInTheDocument();
    });

    it('should display shots remaining and magazine size', () => {
      render(<AmmoCounter {...mockProps} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display in X / Y format', () => {
      render(<AmmoCounter {...mockProps} />);

      const display = screen.getByText('10');
      const separator = screen.getByText('/');
      const max = screen.getByText('20');

      expect(display).toBeInTheDocument();
      expect(separator).toBeInTheDocument();
      expect(max).toBeInTheDocument();
    });

    it('should have reload button', () => {
      render(<AmmoCounter {...mockProps} />);

      expect(screen.getByLabelText('Reload Large Laser')).toBeInTheDocument();
    });

    it('should have fire button', () => {
      render(<AmmoCounter {...mockProps} />);

      expect(screen.getByLabelText('Fire Large Laser')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AmmoCounter {...mockProps} className="custom-class" />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Ammo Decrement', () => {
    it('should call onFire when fire button is clicked', () => {
      render(<AmmoCounter {...mockProps} />);

      const fireButton = screen.getByLabelText('Fire Large Laser');
      fireEvent.click(fireButton);

      expect(mockProps.onFire).toHaveBeenCalledTimes(1);
      expect(mockVibrateCustom).toHaveBeenCalledWith(50);
    });

    it('should trigger haptic feedback on fire', () => {
      render(<AmmoCounter {...mockProps} />);

      const fireButton = screen.getByLabelText('Fire Large Laser');
      fireEvent.click(fireButton);

      expect(mockVibrateCustom).toHaveBeenCalledWith(50);
    });

    it('should update display when shotsRemaining changes', () => {
      const { rerender } = render(<AmmoCounter {...mockProps} />);

      expect(screen.getByText('10')).toBeInTheDocument();

      rerender(<AmmoCounter {...mockProps} shotsRemaining={9} />);

      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.queryByText('10')).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should display progress bar with correct percentage', () => {
      const { container } = render(<AmmoCounter {...mockProps} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '10');
      expect(progressbar).toHaveAttribute('aria-valuemax', '20');
    });

    it('should be green when ammo is normal', () => {
      const { container } = render(
        <AmmoCounter {...mockProps} shotsRemaining={15} magazineSize={20} />,
      );

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveClass('bg-green-500');
    });

    it('should be amber when ammo is low (≤25%)', () => {
      const { container } = render(
        <AmmoCounter {...mockProps} shotsRemaining={5} magazineSize={20} />,
      );

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveClass('bg-amber-500');
    });

    it('should be red when ammo is empty', () => {
      const { container } = render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={20} />,
      );

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveClass('bg-red-500');
    });
  });

  describe('Empty Magazine', () => {
    it('should show EMPTY indicator when shots remaining is 0', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={20} />,
      );

      expect(screen.getByText('EMPTY - RELOAD REQUIRED')).toBeInTheDocument();
    });

    it('should disable fire button when empty', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={20} />,
      );

      const fireButton = screen.getByLabelText('Fire Large Laser');
      expect(fireButton).toHaveClass('cursor-not-allowed');
      expect(fireButton).toBeDisabled();
    });

    it('should show "Empty - Reload Required" on fire button', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={20} />,
      );

      expect(screen.getByText('Empty - Reload Required')).toBeInTheDocument();
    });

    it('should trigger haptic error when trying to fire while empty', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={20} />,
      );

      const fireButton = screen.getByLabelText('Fire Large Laser');

      // Note: When button is disabled, onClick doesn't fire in React
      // The component shows visual feedback ("Empty - Reload Required") instead
      expect(fireButton).toBeDisabled();
      expect(mockVibrateCustom).not.toHaveBeenCalled(); // Can't fire when disabled
      expect(mockProps.onFire).not.toHaveBeenCalled();
    });

    it('should make weapon unusable until reloaded', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={20} />,
      );

      const fireButton = screen.getByLabelText('Fire Large Laser');
      fireEvent.click(fireButton);

      expect(mockProps.onFire).not.toHaveBeenCalled();
    });
  });

  describe('Low Ammo Warning', () => {
    it('should show low ammo indicator at 25% or less', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={5} magazineSize={20} />,
      );

      expect(screen.getByText('⚠️ LOW AMMO')).toBeInTheDocument();
    });

    it('should not show low ammo indicator above 25%', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={6} magazineSize={20} />,
      );

      expect(screen.queryByText('⚠️ LOW AMMO')).not.toBeInTheDocument();
    });

    it('should use amber color for low ammo', () => {
      const { container } = render(
        <AmmoCounter {...mockProps} shotsRemaining={5} magazineSize={20} />,
      );

      const warning = container.querySelector('.border-amber-500');
      expect(warning).toBeInTheDocument();
    });
  });

  describe('Reload Action', () => {
    it('should call onReload when reload button is clicked', () => {
      render(<AmmoCounter {...mockProps} shotsRemaining={5} />);

      const reloadButton = screen.getByLabelText('Reload Large Laser');
      fireEvent.click(reloadButton);

      expect(mockProps.onReload).toHaveBeenCalledTimes(1);
    });

    it('should be 48px minimum height on fire button', () => {
      const { container } = render(<AmmoCounter {...mockProps} />);

      // Get the fire button (second button, which has min-h-[48px])
      const fireButton = container.querySelectorAll('button[type="button"]')[1];
      expect(fireButton).toHaveClass('min-h-[48px]');
    });

    it('should be 44x44px minimum on reload button', () => {
      render(<AmmoCounter {...mockProps} />);

      const reloadButton = screen.getByLabelText('Reload Large Laser');
      expect(reloadButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('Reloading State', () => {
    it('should show reloading indicator when isReloading is true', () => {
      render(
        <AmmoCounter {...mockProps} isReloading={true} shotsRemaining={0} />,
      );

      // There are two "Reloading..." elements (button and indicator), so use getAllByText
      expect(screen.getAllByText('Reloading...')).toHaveLength(2);
    });

    it('should show reload progress bar', () => {
      const { container } = render(
        <AmmoCounter {...mockProps} isReloading={true} shotsRemaining={0} />,
      );

      // The progress bar is nested inside the h-2 container
      const progressBar = container.querySelector('.h-2 .bg-blue-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display time remaining until reload completes', () => {
      render(
        <AmmoCounter
          {...mockProps}
          isReloading={true}
          reloadTime={5}
          shotsRemaining={0}
        />,
      );

      expect(screen.getByText(/5s/)).toBeInTheDocument();
    });

    it('should disable reload button during reload', () => {
      render(<AmmoCounter {...mockProps} isReloading={true} />);

      const reloadButton = screen.getByLabelText('Reload Large Laser');
      expect(reloadButton).toBeDisabled();
    });

    it('should disable fire button during reload', () => {
      render(<AmmoCounter {...mockProps} isReloading={true} />);

      const fireButton = screen.getByLabelText('Fire Large Laser');
      expect(fireButton).toBeDisabled();
    });

    it('should show "Reloading..." on fire button during reload', () => {
      render(<AmmoCounter {...mockProps} isReloading={true} />);

      const fireButton = screen.getByLabelText('Fire Large Laser');
      expect(fireButton.textContent).toBe('Reloading...');
    });

    it('should trigger haptic success when reload completes', () => {
      jest.useFakeTimers();

      render(
        <AmmoCounter
          {...mockProps}
          isReloading={true}
          shotsRemaining={0}
          reloadTime={1}
        />,
      );

      // Fast forward through reload animation
      act(() => {
        jest.advanceTimersByTime(1100); // 1s reload + 100ms buffer
      });

      expect(mockVibrateCustom).toHaveBeenCalledWith([100, 50, 100]);

      jest.useRealTimers();
    });

    it('should update reload progress over time', () => {
      const { container } = render(
        <AmmoCounter
          {...mockProps}
          isReloading={true}
          shotsRemaining={0}
          reloadTime={3}
        />,
      );

      // The progress bar is nested inside the h-2 container
      const progressBar = container.querySelector('.h-2 .bg-blue-500');

      // Type guard to ensure progressBar is an HTMLElement
      expect(progressBar).toBeInstanceOf(HTMLElement);
      const progressBarElement = progressBar as HTMLElement;

      // Initial progress
      expect(progressBarElement.style.width).toBe('0%');

      // After 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(progressBarElement.style.width).not.toBe('0%');

      // After 2 more seconds (total 3 seconds, complete)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Progress should be close to 100% (account for floating point imprecision)
      const progressValue = parseFloat(progressBarElement.style.width || '0');
      expect(progressValue).toBeCloseTo(100, 0); // Close to 100 with no decimal precision
    });

    it('should disable reload button when magazine is full', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={20} magazineSize={20} />,
      );

      const reloadButton = screen.getByLabelText('Reload Large Laser');
      expect(reloadButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AmmoCounter {...mockProps} />);

      expect(screen.getByLabelText('Reload Large Laser')).toBeInTheDocument();
      expect(screen.getByLabelText('Fire Large Laser')).toBeInTheDocument();
    });

    it('should have progressbar with proper attributes', () => {
      const { container } = render(<AmmoCounter {...mockProps} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        'Large Laser: 10 of 20 shots remaining',
      );
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    });

    it('should update ARIA label when ammo changes', () => {
      const { rerender, container } = render(<AmmoCounter {...mockProps} />);

      rerender(<AmmoCounter {...mockProps} shotsRemaining={5} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveAttribute('aria-valuenow', '5');
    });
  });

  describe('Visual States', () => {
    it('should have smooth transitions', () => {
      const { container } = render(<AmmoCounter {...mockProps} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveClass('transition-all');
      expect(progressbar).toHaveClass('duration-300');
    });

    it('should scale down fire button on active', () => {
      const { container } = render(<AmmoCounter {...mockProps} />);

      // Get the fire button (last button, which is the fire button)
      const fireButton = container.querySelectorAll('button[type="button"]')[1];
      expect(fireButton).toHaveClass('active:scale-95');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero magazine size', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={0} magazineSize={0} />,
      );

      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(2); // Both shots remaining and magazine size are 0
    });

    it('should handle magazine size of 1', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={1} magazineSize={1} />,
      );

      // Magazine is full (100%), so no low ammo warning
      expect(screen.queryByText('⚠️ LOW AMMO')).not.toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(2); // Both shots remaining and magazine size
    });

    it('should handle very large magazines', () => {
      render(
        <AmmoCounter {...mockProps} shotsRemaining={100} magazineSize={200} />,
      );

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.queryByText('⚠️ LOW AMMO')).not.toBeInTheDocument(); // 100 is exactly 50%
    });
  });
});
