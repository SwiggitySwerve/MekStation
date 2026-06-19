import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

import type { ArmorData } from '../ArmorDiagram';

import { ArmorDiagram } from '../ArmorDiagram';

const createMockArmor = (): ArmorData => ({
  front: {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 50,
    [MechLocation.LEFT_TORSO]: 40,
    [MechLocation.RIGHT_TORSO]: 40,
    [MechLocation.LEFT_ARM]: 30,
    [MechLocation.RIGHT_ARM]: 30,
    [MechLocation.LEFT_LEG]: 40,
    [MechLocation.RIGHT_LEG]: 40,
  },
  rear: {
    [MechLocation.HEAD]: 0,
    [MechLocation.CENTER_TORSO]: 30,
    [MechLocation.LEFT_TORSO]: 20,
    [MechLocation.RIGHT_TORSO]: 20,
    [MechLocation.LEFT_ARM]: 0,
    [MechLocation.RIGHT_ARM]: 0,
    [MechLocation.LEFT_LEG]: 0,
    [MechLocation.RIGHT_LEG]: 0,
  },
  max: {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 100,
    [MechLocation.LEFT_TORSO]: 80,
    [MechLocation.RIGHT_TORSO]: 80,
    [MechLocation.LEFT_ARM]: 60,
    [MechLocation.RIGHT_ARM]: 60,
    [MechLocation.LEFT_LEG]: 80,
    [MechLocation.RIGHT_LEG]: 80,
  },
});

describe('ArmorDiagram', () => {
  const mockOnArmorChange = jest.fn();
  const mockArmor = createMockArmor();

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Accessibility', () => {
    it('should have proper ARIA labels on toggle buttons', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const frontButton = screen.getByText('Front');
      const rearButton = screen.getByText('Rear');

      expect(frontButton).toHaveAttribute('aria-pressed');
      expect(rearButton).toHaveAttribute('aria-pressed');
    });

    it('should maintain accessibility in ArmorLocation children', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const progressbars = container.querySelectorAll('[role="progressbar"]');
      expect(progressbars.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const frontButton = screen.getByText('Front');
      frontButton.focus();
      expect(document.activeElement).toBe(frontButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero armor values', () => {
      const zeroArmor: ArmorData = {
        front: {
          [MechLocation.HEAD]: 0,
          [MechLocation.CENTER_TORSO]: 0,
          [MechLocation.LEFT_TORSO]: 0,
          [MechLocation.RIGHT_TORSO]: 0,
          [MechLocation.LEFT_ARM]: 0,
          [MechLocation.RIGHT_ARM]: 0,
          [MechLocation.LEFT_LEG]: 0,
          [MechLocation.RIGHT_LEG]: 0,
        },
        rear: {
          [MechLocation.HEAD]: 0,
          [MechLocation.CENTER_TORSO]: 0,
          [MechLocation.LEFT_TORSO]: 0,
          [MechLocation.RIGHT_TORSO]: 0,
          [MechLocation.LEFT_ARM]: 0,
          [MechLocation.RIGHT_ARM]: 0,
          [MechLocation.LEFT_LEG]: 0,
          [MechLocation.RIGHT_LEG]: 0,
        },
        max: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 100,
          [MechLocation.LEFT_TORSO]: 80,
          [MechLocation.RIGHT_TORSO]: 80,
          [MechLocation.LEFT_ARM]: 60,
          [MechLocation.RIGHT_ARM]: 60,
          [MechLocation.LEFT_LEG]: 80,
          [MechLocation.RIGHT_LEG]: 80,
        },
      };

      render(
        <ArmorDiagram armor={zeroArmor} onArmorChange={mockOnArmorChange} />,
      );

      expect(screen.getAllByText('0 / 9')).toHaveLength(2);
      expect(screen.getAllByText('0 / 100')).toHaveLength(2);
    });

    it('should handle maxed out armor', () => {
      const maxedArmor: ArmorData = {
        front: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 100,
          [MechLocation.LEFT_TORSO]: 80,
          [MechLocation.RIGHT_TORSO]: 80,
          [MechLocation.LEFT_ARM]: 60,
          [MechLocation.RIGHT_ARM]: 60,
          [MechLocation.LEFT_LEG]: 80,
          [MechLocation.RIGHT_LEG]: 80,
        },
        rear: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 100,
          [MechLocation.LEFT_TORSO]: 80,
          [MechLocation.RIGHT_TORSO]: 80,
          [MechLocation.LEFT_ARM]: 60,
          [MechLocation.RIGHT_ARM]: 60,
          [MechLocation.LEFT_LEG]: 80,
          [MechLocation.RIGHT_LEG]: 80,
        },
        max: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 100,
          [MechLocation.LEFT_TORSO]: 80,
          [MechLocation.RIGHT_TORSO]: 80,
          [MechLocation.LEFT_ARM]: 60,
          [MechLocation.RIGHT_ARM]: 60,
          [MechLocation.LEFT_LEG]: 80,
          [MechLocation.RIGHT_LEG]: 80,
        },
      };

      render(
        <ArmorDiagram armor={maxedArmor} onArmorChange={mockOnArmorChange} />,
      );

      expect(screen.getAllByText('9 / 9')).toHaveLength(2);
      expect(screen.getAllByText('100 / 100')).toHaveLength(2);
    });

    it('should handle asymmetric max armor values', () => {
      const asymmetricArmor: ArmorData = {
        front: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 50,
          [MechLocation.LEFT_TORSO]: 40,
          [MechLocation.RIGHT_TORSO]: 35,
          [MechLocation.LEFT_ARM]: 30,
          [MechLocation.RIGHT_ARM]: 25,
          [MechLocation.LEFT_LEG]: 40,
          [MechLocation.RIGHT_LEG]: 45,
        },
        rear: {
          [MechLocation.HEAD]: 0,
          [MechLocation.CENTER_TORSO]: 25,
          [MechLocation.LEFT_TORSO]: 20,
          [MechLocation.RIGHT_TORSO]: 15,
          [MechLocation.LEFT_ARM]: 0,
          [MechLocation.RIGHT_ARM]: 0,
          [MechLocation.LEFT_LEG]: 0,
          [MechLocation.RIGHT_LEG]: 0,
        },
        max: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 100,
          [MechLocation.LEFT_TORSO]: 80,
          [MechLocation.RIGHT_TORSO]: 70,
          [MechLocation.LEFT_ARM]: 60,
          [MechLocation.RIGHT_ARM]: 50,
          [MechLocation.LEFT_LEG]: 80,
          [MechLocation.RIGHT_LEG]: 90,
        },
      };

      render(
        <ArmorDiagram
          armor={asymmetricArmor}
          onArmorChange={mockOnArmorChange}
        />,
      );

      expect(screen.getAllByText('35 / 70')).toHaveLength(2); // Right Torso
      expect(screen.getAllByText('45 / 90')).toHaveLength(2); // Right Leg
    });
  });

  describe('Auto-Allocate Feature', () => {
    it('should not show auto-allocate dropdown when onAutoAllocate is not provided', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      expect(
        container.querySelector('#auto-allocate-select'),
      ).not.toBeInTheDocument();
    });

    it('should show auto-allocate dropdown when onAutoAllocate is provided', () => {
      const mockAutoAllocate = jest.fn();
      const { container } = render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );
      expect(
        container.querySelector('#auto-allocate-select'),
      ).toBeInTheDocument();
    });

    it('should display all allocation options', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );

      expect(screen.getByText('Even Distribution')).toBeInTheDocument();
      expect(screen.getByText('Front-Weighted')).toBeInTheDocument();
      expect(screen.getByText('Rear-Weighted')).toBeInTheDocument();
    });

    it('should call onAutoAllocate with even type when Apply is clicked', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockAutoAllocate).toHaveBeenCalledWith('even');
    });

    it('should call onAutoAllocate with front-weighted type when selected and Apply is clicked', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );

      const select = screen.getByLabelText('Auto-Allocate Armor');
      fireEvent.change(select, { target: { value: 'front-weighted' } });

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockAutoAllocate).toHaveBeenCalledWith('front-weighted');
    });

    it('should call onAutoAllocate with rear-weighted type when selected and Apply is clicked', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );

      const select = screen.getByLabelText('Auto-Allocate Armor');
      fireEvent.change(select, { target: { value: 'rear-weighted' } });

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockAutoAllocate).toHaveBeenCalledWith('rear-weighted');
    });

    it('should have 44x44px minimum touch targets on apply button', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );

      const applyButton = screen.getByText('Apply');
      expect(applyButton).toHaveClass('min-h-[44px]');
    });

    it('should have proper label association', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          onAutoAllocate={mockAutoAllocate}
        />,
      );

      const label = screen.getByText('Auto-Allocate Armor');
      const select = screen.getByLabelText('Auto-Allocate Armor');

      expect(label).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });
  });
});
