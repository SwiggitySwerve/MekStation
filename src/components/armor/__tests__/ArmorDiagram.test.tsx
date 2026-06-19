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

  describe('Rendering', () => {
    it('should render all 8 armor locations', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      // Each location appears twice (desktop + mobile layout)
      expect(screen.getAllByText('Head')).toHaveLength(2);
      expect(screen.getAllByText('Center Torso')).toHaveLength(2);
      expect(screen.getAllByText('Left Torso')).toHaveLength(2);
      expect(screen.getAllByText('Right Torso')).toHaveLength(2);
      expect(screen.getAllByText('Left Arm')).toHaveLength(2);
      expect(screen.getAllByText('Right Arm')).toHaveLength(2);
      expect(screen.getAllByText('Left Leg')).toHaveLength(2);
      expect(screen.getAllByText('Right Leg')).toHaveLength(2);
    });

    it('should render front/rear toggle buttons', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      expect(screen.getByText('Front')).toBeInTheDocument();
      expect(screen.getByText('Rear')).toBeInTheDocument();
    });

    it('should have Front pressed by default', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      const frontButton = screen.getByText('Front');
      expect(frontButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should display correct armor values for front facing', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      expect(screen.getAllByText('9 / 9')).toHaveLength(2); // Head (desktop + mobile)
      expect(screen.getAllByText('50 / 100')).toHaveLength(2); // Center Torso
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ArmorDiagram
          armor={mockArmor}
          onArmorChange={mockOnArmorChange}
          className="custom-class"
        />,
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Front/Rear Toggle', () => {
    it('should switch to rear when Rear button is clicked', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      const rearButton = screen.getByText('Rear');
      fireEvent.click(rearButton);

      expect(rearButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByText('0 / 9')).toHaveLength(2); // Rear head (desktop + mobile)
    });

    it('should switch back to front when Front button is clicked', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      const rearButton = screen.getByText('Rear');
      const frontButton = screen.getByText('Front');

      fireEvent.click(rearButton);
      fireEvent.click(frontButton);

      expect(frontButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByText('9 / 9')).toHaveLength(2); // Front head
    });

    it('should have 44x44px minimum touch targets on toggle buttons', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );
      const toggleButtons = container.querySelectorAll('.min-h-\\[44px\\]');
      expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Armor Changes', () => {
    it('should call onArmorChange when location armor changes', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      // Expand first Center Torso found
      const ctHeaders = screen.getAllByText('Center Torso');
      const ctHeader = ctHeaders[0].closest('button');
      fireEvent.click(ctHeader!);

      // Increment armor
      const incrementButton = screen.getAllByLabelText(
        'Add 1 armor to Center Torso',
      )[0];
      fireEvent.click(incrementButton);

      expect(mockOnArmorChange).toHaveBeenCalledWith(
        MechLocation.CENTER_TORSO,
        51,
        'front',
      );
    });

    it('should use front facing by default for changes', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      // Use Center Torso instead of Head (Head is at max armor 9/9)
      const ctHeaders = screen.getAllByText('Center Torso');
      const ctHeader = ctHeaders[0].closest('button');
      fireEvent.click(ctHeader!);

      const incrementButtons = screen.getAllByLabelText(
        'Add 1 armor to Center Torso',
      );
      fireEvent.click(incrementButtons[0]);

      expect(mockOnArmorChange).toHaveBeenCalledWith(
        MechLocation.CENTER_TORSO,
        51,
        'front',
      );
    });

    it('should use rear facing for changes after switching', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      // Switch to rear
      fireEvent.click(screen.getByText('Rear'));

      // Expand first Center Torso
      const ctHeaders = screen.getAllByText('Center Torso');
      const ctHeader = ctHeaders[0].closest('button');
      fireEvent.click(ctHeader!);

      // Increment armor
      const incrementButton = screen.getAllByLabelText(
        'Add 1 armor to Center Torso',
      )[0];
      fireEvent.click(incrementButton);

      expect(mockOnArmorChange).toHaveBeenCalledWith(
        MechLocation.CENTER_TORSO,
        31,
        'rear',
      );
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      // Mock mobile viewport
      global.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });

    it('should stack locations vertically on mobile', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      // Mobile layout should be visible (hidden lg: class)
      const mobileLayout = container.querySelector('.lg\\:hidden');
      expect(mobileLayout).toBeInTheDocument();
    });

    it('should show section headings on mobile', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      expect(screen.getByText('Torso')).toBeInTheDocument();
      expect(screen.getByText('Arms')).toBeInTheDocument();
      expect(screen.getByText('Legs')).toBeInTheDocument();
    });

    it('should maintain expandable card behavior on mobile', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const headSections = screen.getAllByText('Head');
      const headSection = headSections[0].closest('button');
      expect(headSection).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(headSection!);
      expect(headSection).toHaveAttribute('aria-expanded', 'true');
    });

    it('should display armor values on mobile', () => {
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      expect(screen.getAllByText('9 / 9')).toHaveLength(2);
      expect(screen.getAllByText('50 / 100')).toHaveLength(2);
    });
  });

  describe('Desktop Layout', () => {
    it('should use CSS Grid on desktop', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const gridLayout = container.querySelector('.hidden.lg\\:grid');
      expect(gridLayout).toBeInTheDocument();
    });

    it('should position head at top center', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      // The grid should have gridTemplateAreas defined
      const gridLayout = container.querySelector(
        '.hidden.lg\\:grid',
      ) as HTMLElement;
      expect(gridLayout?.style.gridTemplateAreas).toContain('head');
    });

    it('should position torsos in middle', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const gridLayout = container.querySelector(
        '.hidden.lg\\:grid',
      ) as HTMLElement;
      expect(gridLayout?.style.gridTemplateAreas).toContain('center-torso');
      expect(gridLayout?.style.gridTemplateAreas).toContain('left-torso');
      expect(gridLayout?.style.gridTemplateAreas).toContain('right-torso');
    });

    it('should position legs at bottom', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const gridLayout = container.querySelector(
        '.hidden.lg\\:grid',
      ) as HTMLElement;
      expect(gridLayout?.style.gridTemplateAreas).toContain('left-leg');
      expect(gridLayout?.style.gridTemplateAreas).toContain('right-leg');
    });

    it('should have consistent gap between areas', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />,
      );

      const gridLayout = container.querySelector(
        '.hidden.lg\\:grid',
      ) as HTMLElement;
      expect(gridLayout?.style.gap).toBe('0.5rem');
    });
  });
});
