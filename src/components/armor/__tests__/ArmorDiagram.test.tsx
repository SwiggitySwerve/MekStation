import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArmorDiagram } from '../ArmorDiagram';
import type { ArmorData } from '../ArmorDiagram';

const createMockArmor = (): ArmorData => ({
  front: {
    head: 9,
    centerTorso: 50,
    leftTorso: 40,
    rightTorso: 40,
    leftArm: 30,
    rightArm: 30,
    leftLeg: 40,
    rightLeg: 40,
  },
  rear: {
    head: 0,
    centerTorso: 30,
    leftTorso: 20,
    rightTorso: 20,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
  },
  max: {
    head: 9,
    centerTorso: 100,
    leftTorso: 80,
    rightTorso: 80,
    leftArm: 60,
    rightArm: 60,
    leftLeg: 80,
    rightLeg: 80,
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
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
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
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      expect(screen.getByText('Front')).toBeInTheDocument();
      expect(screen.getByText('Rear')).toBeInTheDocument();
    });

    it('should have Front pressed by default', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      const frontButton = screen.getByText('Front');
      expect(frontButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should display correct armor values for front facing', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      expect(screen.getAllByText('9 / 9')).toHaveLength(2); // Head (desktop + mobile)
      expect(screen.getAllByText('50 / 100')).toHaveLength(2); // Center Torso
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Front/Rear Toggle', () => {
    it('should switch to rear when Rear button is clicked', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      const rearButton = screen.getByText('Rear');
      fireEvent.click(rearButton);

      expect(rearButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByText('0 / 9')).toHaveLength(2); // Rear head (desktop + mobile)
    });

    it('should switch back to front when Front button is clicked', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      const rearButton = screen.getByText('Rear');
      const frontButton = screen.getByText('Front');

      fireEvent.click(rearButton);
      fireEvent.click(frontButton);

      expect(frontButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByText('9 / 9')).toHaveLength(2); // Front head
    });

    it('should have 44x44px minimum touch targets on toggle buttons', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      const toggleButtons = container.querySelectorAll('.min-h-\\[44px\\]');
      expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Armor Changes', () => {
    it('should call onArmorChange when location armor changes', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      // Expand first Center Torso found
      const ctHeaders = screen.getAllByText('Center Torso');
      const ctHeader = ctHeaders[0].closest('button');
      fireEvent.click(ctHeader!);

      // Increment armor
      const incrementButton = screen.getAllByLabelText('Add 1 armor to Center Torso')[0];
      fireEvent.click(incrementButton);

      expect(mockOnArmorChange).toHaveBeenCalledWith('centerTorso', 51, 'front');
    });

    it('should use front facing by default for changes', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      // Use Center Torso instead of Head (Head is at max armor 9/9)
      const ctHeaders = screen.getAllByText('Center Torso');
      const ctHeader = ctHeaders[0].closest('button');
      fireEvent.click(ctHeader!);

      const incrementButtons = screen.getAllByLabelText('Add 1 armor to Center Torso');
      fireEvent.click(incrementButtons[0]);

      expect(mockOnArmorChange).toHaveBeenCalledWith('centerTorso', 51, 'front');
    });

    it('should use rear facing for changes after switching', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      // Switch to rear
      fireEvent.click(screen.getByText('Rear'));

      // Expand first Center Torso
      const ctHeaders = screen.getAllByText('Center Torso');
      const ctHeader = ctHeaders[0].closest('button');
      fireEvent.click(ctHeader!);

      // Increment armor
      const incrementButton = screen.getAllByLabelText('Add 1 armor to Center Torso')[0];
      fireEvent.click(incrementButton);

      expect(mockOnArmorChange).toHaveBeenCalledWith('centerTorso', 31, 'rear');
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      // Mock mobile viewport
      global.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });

    it('should stack locations vertically on mobile', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      // Mobile layout should be visible (hidden lg: class)
      const mobileLayout = container.querySelector('.lg\\:hidden');
      expect(mobileLayout).toBeInTheDocument();
    });

    it('should show section headings on mobile', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      expect(screen.getByText('Torso')).toBeInTheDocument();
      expect(screen.getByText('Arms')).toBeInTheDocument();
      expect(screen.getByText('Legs')).toBeInTheDocument();
    });

    it('should maintain expandable card behavior on mobile', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const headSections = screen.getAllByText('Head');
      const headSection = headSections[0].closest('button');
      expect(headSection).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(headSection!);
      expect(headSection).toHaveAttribute('aria-expanded', 'true');
    });

    it('should display armor values on mobile', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      expect(screen.getAllByText('9 / 9')).toHaveLength(2);
      expect(screen.getAllByText('50 / 100')).toHaveLength(2);
    });
  });

  describe('Desktop Layout', () => {
    it('should use CSS Grid on desktop', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const gridLayout = container.querySelector('.hidden.lg\\:grid');
      expect(gridLayout).toBeInTheDocument();
    });

    it('should position head at top center', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      // The grid should have gridTemplateAreas defined
      const gridLayout = container.querySelector('.hidden.lg\\:grid') as HTMLElement;
      expect(gridLayout?.style.gridTemplateAreas).toContain('head');
    });

    it('should position torsos in middle', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const gridLayout = container.querySelector('.hidden.lg\\:grid') as HTMLElement;
      expect(gridLayout?.style.gridTemplateAreas).toContain('center-torso');
      expect(gridLayout?.style.gridTemplateAreas).toContain('left-torso');
      expect(gridLayout?.style.gridTemplateAreas).toContain('right-torso');
    });

    it('should position legs at bottom', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const gridLayout = container.querySelector('.hidden.lg\\:grid') as HTMLElement;
      expect(gridLayout?.style.gridTemplateAreas).toContain('left-leg');
      expect(gridLayout?.style.gridTemplateAreas).toContain('right-leg');
    });

    it('should have consistent gap between areas', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const gridLayout = container.querySelector('.hidden.lg\\:grid') as HTMLElement;
      expect(gridLayout?.style.gap).toBe('0.5rem');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on toggle buttons', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const frontButton = screen.getByText('Front');
      const rearButton = screen.getByText('Rear');

      expect(frontButton).toHaveAttribute('aria-pressed');
      expect(rearButton).toHaveAttribute('aria-pressed');
    });

    it('should maintain accessibility in ArmorLocation children', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const progressbars = container.querySelectorAll('[role="progressbar"]');
      expect(progressbars.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);

      const frontButton = screen.getByText('Front');
      frontButton.focus();
      expect(document.activeElement).toBe(frontButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero armor values', () => {
      const zeroArmor: ArmorData = {
        front: {
          head: 0,
          centerTorso: 0,
          leftTorso: 0,
          rightTorso: 0,
          leftArm: 0,
          rightArm: 0,
          leftLeg: 0,
          rightLeg: 0,
        },
        rear: {
          head: 0,
          centerTorso: 0,
          leftTorso: 0,
          rightTorso: 0,
          leftArm: 0,
          rightArm: 0,
          leftLeg: 0,
          rightLeg: 0,
        },
        max: {
          head: 9,
          centerTorso: 100,
          leftTorso: 80,
          rightTorso: 80,
          leftArm: 60,
          rightArm: 60,
          leftLeg: 80,
          rightLeg: 80,
        },
      };

      render(<ArmorDiagram armor={zeroArmor} onArmorChange={mockOnArmorChange} />);

      expect(screen.getAllByText('0 / 9')).toHaveLength(2);
      expect(screen.getAllByText('0 / 100')).toHaveLength(2);
    });

    it('should handle maxed out armor', () => {
      const maxedArmor: ArmorData = {
        front: {
          head: 9,
          centerTorso: 100,
          leftTorso: 80,
          rightTorso: 80,
          leftArm: 60,
          rightArm: 60,
          leftLeg: 80,
          rightLeg: 80,
        },
        rear: {
          head: 9,
          centerTorso: 100,
          leftTorso: 80,
          rightTorso: 80,
          leftArm: 60,
          rightArm: 60,
          leftLeg: 80,
          rightLeg: 80,
        },
        max: {
          head: 9,
          centerTorso: 100,
          leftTorso: 80,
          rightTorso: 80,
          leftArm: 60,
          rightArm: 60,
          leftLeg: 80,
          rightLeg: 80,
        },
      };

      render(<ArmorDiagram armor={maxedArmor} onArmorChange={mockOnArmorChange} />);

      expect(screen.getAllByText('9 / 9')).toHaveLength(2);
      expect(screen.getAllByText('100 / 100')).toHaveLength(2);
    });

    it('should handle asymmetric max armor values', () => {
      const asymmetricArmor: ArmorData = {
        front: {
          head: 9,
          centerTorso: 50,
          leftTorso: 40,
          rightTorso: 35,
          leftArm: 30,
          rightArm: 25,
          leftLeg: 40,
          rightLeg: 45,
        },
        rear: {
          head: 0,
          centerTorso: 25,
          leftTorso: 20,
          rightTorso: 15,
          leftArm: 0,
          rightArm: 0,
          leftLeg: 0,
          rightLeg: 0,
        },
        max: {
          head: 9,
          centerTorso: 100,
          leftTorso: 80,
          rightTorso: 70,
          leftArm: 60,
          rightArm: 50,
          leftLeg: 80,
          rightLeg: 90,
        },
      };

      render(<ArmorDiagram armor={asymmetricArmor} onArmorChange={mockOnArmorChange} />);

      expect(screen.getAllByText('35 / 70')).toHaveLength(2); // Right Torso
      expect(screen.getAllByText('45 / 90')).toHaveLength(2); // Right Leg
    });
  });

  describe('Auto-Allocate Feature', () => {
    it('should not show auto-allocate dropdown when onAutoAllocate is not provided', () => {
      const { container } = render(<ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} />);
      expect(container.querySelector('#auto-allocate-select')).not.toBeInTheDocument();
    });

    it('should show auto-allocate dropdown when onAutoAllocate is provided', () => {
      const mockAutoAllocate = jest.fn();
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
      );
      expect(container.querySelector('#auto-allocate-select')).toBeInTheDocument();
    });

    it('should display all allocation options', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
      );

      expect(screen.getByText('Even Distribution')).toBeInTheDocument();
      expect(screen.getByText('Front-Weighted')).toBeInTheDocument();
      expect(screen.getByText('Rear-Weighted')).toBeInTheDocument();
    });

    it('should call onAutoAllocate with even type when Apply is clicked', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
      );

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockAutoAllocate).toHaveBeenCalledWith('even');
    });

    it('should call onAutoAllocate with front-weighted type when selected and Apply is clicked', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
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
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
      );

      const select = screen.getByLabelText('Auto-Allocate Armor');
      fireEvent.change(select, { target: { value: 'rear-weighted' } });

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockAutoAllocate).toHaveBeenCalledWith('rear-weighted');
    });

    it('should have 44x44px minimum touch targets on apply button', () => {
      const mockAutoAllocate = jest.fn();
      const { container } = render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
      );

      const applyButton = screen.getByText('Apply');
      expect(applyButton).toHaveClass('min-h-[44px]');
    });

    it('should have proper label association', () => {
      const mockAutoAllocate = jest.fn();
      render(
        <ArmorDiagram armor={mockArmor} onArmorChange={mockOnArmorChange} onAutoAllocate={mockAutoAllocate} />
      );

      const label = screen.getByText('Auto-Allocate Armor');
      const select = screen.getByLabelText('Auto-Allocate Armor');

      expect(label).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });
  });
});
