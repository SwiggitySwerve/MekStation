import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeatTracker } from '../HeatTracker';

describe('HeatTracker', () => {
  const mockOnScaleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display current and max heat', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should display heat label', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('Heat')).toBeInTheDocument();
    });

    it('should have progress bar', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '15');
      expect(progressbar).toHaveAttribute('aria-valuemax', '30');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Heat Scale Selector', () => {
    it('should display scale selector', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const select = screen.getByLabelText('Heat scale');
      expect(select).toBeInTheDocument();
    });

    it('should have all scale options', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('Single Heat')).toBeInTheDocument();
      expect(screen.getByText('Double Heat')).toBeInTheDocument();
      expect(screen.getByText('Triple Heat')).toBeInTheDocument();
    });

    it('should call onScaleChange when scale changes', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const select = screen.getByLabelText('Heat scale');
      fireEvent.change(select, { target: { value: 'Double' } });

      expect(mockOnScaleChange).toHaveBeenCalledWith('Double');
    });

    it('should update max heat based on scale', () => {
      const { rerender } = render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('15')).toBeInTheDocument(); // Current heat
      expect(screen.getByText('30')).toBeInTheDocument(); // Max heat (Single)

      rerender(
        <HeatTracker
          currentHeat={15}
          heatScale="Double"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('15')).toBeInTheDocument(); // Current heat still 15
      expect(screen.getByText('50')).toBeInTheDocument(); // Max heat now 50 (Double)
    });

    it('should have 44x44px minimum on selector', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const select = screen.getByLabelText('Heat scale');
      expect(select).toHaveClass('min-h-[44px]');
    });
  });

  describe('Warning Levels', () => {
    it('should show green color for normal heat (<50%)', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={10}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('10')).toHaveClass('text-green-500');
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('should show amber warning at 50%', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('CAUTION: HEAT BUILDUP')).toBeInTheDocument();
    });

    it('should show red warning at 75%', () => {
      render(
        <HeatTracker
          currentHeat={23}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText(/WARNING.*NEAR MAX HEAT/)).toBeInTheDocument();
    });

    it('should show solid red at max heat', () => {
      render(
        <HeatTracker
          currentHeat={30}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('MAX HEAT - SHUTDOWN')).toBeInTheDocument();
    });

    it('should show ammo explosion risk at max heat', () => {
      render(
        <HeatTracker
          currentHeat={30}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('⚠️ Ammo explosion risk')).toBeInTheDocument();
    });

    it('should have warning color changes', () => {
      const { container: normalContainer } = render(
        <HeatTracker
          currentHeat={5}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const { container: warningContainer } = render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const { container: criticalContainer } = render(
        <HeatTracker
          currentHeat={25}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const { container: maxContainer } = render(
        <HeatTracker
          currentHeat={30}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(normalContainer.querySelector('.bg-green-500')).toBeInTheDocument();
      expect(warningContainer.querySelector('.bg-amber-500')).toBeInTheDocument();
      expect(criticalContainer.querySelector('.bg-red-500')).toBeInTheDocument();
      expect(maxContainer.querySelector('.bg-red-600')).toBeInTheDocument();
    });
  });

  describe('Cooling Phase', () => {
    it('should display cooling indicator when isCooling is true', () => {
      render(
        <HeatTracker
          currentHeat={25}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
          isCooling={true}
          coolingTurns={3}
        />
      );

      expect(screen.getByText(/Cooling:/)).toBeInTheDocument();
      expect(screen.getByText(/3 turns remaining/)).toBeInTheDocument();
    });

    it('should show singular "turn" when 1 turn remaining', () => {
      render(
        <HeatTracker
          currentHeat={25}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
          isCooling={true}
          coolingTurns={1}
        />
      );

      expect(screen.getByText(/1 turn remaining/)).toBeInTheDocument();
      expect(screen.queryByText(/1 turns remaining/)).not.toBeInTheDocument();
    });

    it('should not show cooling indicator when isCooling is false', () => {
      render(
        <HeatTracker
          currentHeat={25}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
          isCooling={false}
        />
      );

      expect(screen.queryByText(/Cooling:/)).not.toBeInTheDocument();
    });

    it('should have animated pulse icon during cooling', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={25}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
          isCooling={true}
          coolingTurns={2}
        />
      );

      const icon = container.querySelector('.animate-pulse');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Heat Overflow', () => {
    it('should display overflow indicator when heat exceeds max', () => {
      render(
        <HeatTracker
          currentHeat={35}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText(/⚠️ HEAT OVERFLOW:/)).toBeInTheDocument();
      expect(screen.getByText(/5 over limit/)).toBeInTheDocument();
    });

    it('should calculate overflow correctly', () => {
      render(
        <HeatTracker
          currentHeat={45}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText(/15 over limit/)).toBeInTheDocument();
    });

    it('should not show overflow when at or below max', () => {
      render(
        <HeatTracker
          currentHeat={30}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.queryByText(/HEAT OVERFLOW/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByLabelText('Heat scale')).toBeInTheDocument();
    });

    it('should have progressbar with proper attributes', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveAttribute('aria-label', 'Current heat: 15 of 30');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    });
  });

  describe('Visual States', () => {
    it('should have smooth transitions', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={15}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const progressBar = container.querySelector('.transition-all');
      expect(progressBar).toHaveClass('duration-300');
    });

    it('should clip progress bar at 100%', () => {
      const { container } = render(
        <HeatTracker
          currentHeat={40}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInstanceOf(HTMLElement);
      const progressBarElement = progressBar as HTMLElement;
      // Width should be capped at 100% when heat exceeds max
      expect(progressBarElement.style.width).toBe('100%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero heat', () => {
      render(
        <HeatTracker
          currentHeat={0}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.queryByText('CAUTION')).not.toBeInTheDocument();
    });

    it('should handle different heat scales correctly', () => {
      const { rerender } = render(
        <HeatTracker
          currentHeat={25}
          heatScale="Single"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument(); // Single scale max

      rerender(
        <HeatTracker
          currentHeat={30}
          heatScale="Double"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getAllByText('30')).toHaveLength(1); // Only current heat
      expect(screen.getByText('50')).toBeInTheDocument(); // Double scale max
    });

    it('should handle triple heat scale', () => {
      render(
        <HeatTracker
          currentHeat={60}
          heatScale="Triple"
          onScaleChange={mockOnScaleChange}
        />
      );

      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });
  });
});
