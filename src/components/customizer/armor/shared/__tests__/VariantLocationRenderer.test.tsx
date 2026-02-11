import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';

import {
  LocationArmorValues,
  VariantLocation,
  VariantLocationProps,
} from '../VariantLocationRenderer';

// ===========================================================================
// Test Helpers
// ===========================================================================

function makeProps(
  overrides: Partial<VariantLocationProps> = {},
): VariantLocationProps {
  return {
    location: MechLocation.CENTER_TORSO,
    label: 'CT',
    pos: { x: 50, y: 50, width: 80, height: 120 },
    data: { current: 30, maximum: 47, rear: 10, rearMaximum: 23 },
    showRear: false,
    isSelected: false,
    isHovered: false,
    variant: 'clean-tech',
    onClick: jest.fn(),
    onHover: jest.fn(),
    ...overrides,
  };
}

/** Render inside an SVG wrapper so SVG children mount correctly */
function renderInSvg(props: VariantLocationProps) {
  return render(
    <svg>
      <VariantLocation {...props} />
    </svg>,
  );
}

// ===========================================================================
// Test Data Fixtures
// ===========================================================================

const ARMOR_DATA_FULL: LocationArmorValues = {
  current: 47,
  maximum: 47,
  rear: 23,
  rearMaximum: 23,
};

const ARMOR_DATA_PARTIAL: LocationArmorValues = {
  current: 30,
  maximum: 47,
  rear: 10,
  rearMaximum: 23,
};

const ARMOR_DATA_EMPTY: LocationArmorValues = {
  current: 0,
  maximum: 47,
  rear: 0,
  rearMaximum: 23,
};

const ARMOR_DATA_NO_REAR: LocationArmorValues = {
  current: 20,
  maximum: 24,
};

const ALL_VARIANTS: ArmorDiagramVariant[] = [
  'clean-tech',
  'neon-operator',
  'tactical-hud',
  'premium-material',
  'megamek',
];

// ===========================================================================
// Tests
// ===========================================================================

describe('VariantLocationRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Renders without crash
  // =========================================================================

  describe('renders without crash', () => {
    it.each(ALL_VARIANTS)('renders %s variant without crashing', (variant) => {
      const props = makeProps({ variant });
      expect(() => renderInSvg(props)).not.toThrow();
    });

    it.each(ALL_VARIANTS)(
      'renders %s variant with rear armor without crashing',
      (variant) => {
        const props = makeProps({ variant, showRear: true });
        expect(() => renderInSvg(props)).not.toThrow();
      },
    );

    it('renders with zero armor values', () => {
      const props = makeProps({ data: ARMOR_DATA_EMPTY });
      expect(() => renderInSvg(props)).not.toThrow();
    });

    it('renders with full armor values', () => {
      const props = makeProps({ data: ARMOR_DATA_FULL });
      expect(() => renderInSvg(props)).not.toThrow();
    });

    it('renders with no rear data (arm/leg locations)', () => {
      const props = makeProps({
        location: MechLocation.LEFT_ARM,
        label: 'LA',
        data: ARMOR_DATA_NO_REAR,
        showRear: false,
      });
      expect(() => renderInSvg(props)).not.toThrow();
    });
  });

  // =========================================================================
  // Armor location display
  // =========================================================================

  describe('armor location display', () => {
    it('displays current armor value for front-only location', () => {
      const props = makeProps({
        data: { current: 20, maximum: 24 },
        showRear: false,
        variant: 'clean-tech',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('20');
    });

    it('displays current front and rear values when showRear is true', () => {
      const props = makeProps({
        data: ARMOR_DATA_PARTIAL,
        showRear: true,
        variant: 'clean-tech',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('30');
      expect(values).toContain('10');
    });

    it('displays location label', () => {
      const props = makeProps({
        label: 'CT',
        showRear: false,
        variant: 'clean-tech',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('CT');
    });

    it('displays FRONT label when showing rear armor', () => {
      const props = makeProps({
        label: 'CT',
        showRear: true,
        variant: 'clean-tech',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('CT FRONT');
    });

    it('displays REAR label when showing rear armor', () => {
      const props = makeProps({
        showRear: true,
        variant: 'clean-tech',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('REAR');
    });

    it('displays maximum armor value for clean-tech variant', () => {
      const props = makeProps({
        data: { current: 30, maximum: 47 },
        showRear: false,
        variant: 'clean-tech',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('/ 47');
    });

    it('displays LED-style values for tactical-hud variant', () => {
      const props = makeProps({
        data: { current: 5, maximum: 47 },
        showRear: false,
        variant: 'tactical-hud',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('05');
    });

    it('displays label-F format for tactical-hud front section', () => {
      const props = makeProps({
        label: 'CT',
        showRear: true,
        variant: 'tactical-hud',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('CT-F');
    });

    it('displays label-R format for tactical-hud rear section', () => {
      const props = makeProps({
        label: 'CT',
        showRear: true,
        variant: 'tactical-hud',
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('CT-R');
    });

    describe.each(ALL_VARIANTS)(
      'variant %s displays armor values',
      (variant) => {
        it('shows current armor value', () => {
          const props = makeProps({
            data: { current: 25, maximum: 40 },
            showRear: false,
            variant,
          });
          const { container } = renderInSvg(props);
          const texts = Array.from(container.querySelectorAll('text'));
          const values = texts.map((t) => t.textContent);
          const hasValue = values.some(
            (v) => v === '25' || v === '25'.padStart(2, '0'),
          );
          expect(hasValue).toBe(true);
        });
      },
    );
  });

  // =========================================================================
  // Interaction handlers
  // =========================================================================

  describe('interaction handlers', () => {
    it('calls onClick when location is clicked', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onHover(true) on mouse enter', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(onHover).toHaveBeenCalledWith(true);
    });

    it('calls onHover(false) on mouse leave', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.mouseLeave(button);
      expect(onHover).toHaveBeenCalledWith(false);
    });

    it('calls onClick on Enter key press', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key press', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick on other key presses', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Escape' });
      fireEvent.keyDown(button, { key: 'a' });
      fireEvent.keyDown(button, { key: 'Tab' });
      expect(onClick).not.toHaveBeenCalled();
    });

    it('calls onHover(true) on focus', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.focus(button);
      expect(onHover).toHaveBeenCalledWith(true);
    });

    it('calls onHover(false) on blur', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.blur(button);
      expect(onHover).toHaveBeenCalledWith(false);
    });
  });

  // =========================================================================
  // Accessibility / aria attributes
  // =========================================================================

  describe('accessibility', () => {
    it('has role="button"', () => {
      const props = makeProps();
      renderInSvg(props);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has tabIndex=0 for keyboard accessibility', () => {
      const props = makeProps();
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('has correct aria-label for front-only location', () => {
      const props = makeProps({
        location: MechLocation.LEFT_ARM,
        data: { current: 20, maximum: 24 },
        showRear: false,
      });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Left Arm armor: 20 of 24');
    });

    it('has correct aria-label for front+rear location', () => {
      const props = makeProps({
        location: MechLocation.CENTER_TORSO,
        data: { current: 30, maximum: 47, rear: 10, rearMaximum: 23 },
        showRear: true,
      });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        'Center Torso armor: 30 of 47, rear: 10 of 23',
      );
    });

    it('has aria-pressed=true when selected', () => {
      const props = makeProps({ isSelected: true });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('has aria-pressed=false when not selected', () => {
      const props = makeProps({ isSelected: false });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // =========================================================================
  // Validation display (selected / hovered states)
  // =========================================================================

  describe('validation display (selected and hovered states)', () => {
    it.each(ALL_VARIANTS)(
      '%s variant renders differently when selected',
      (variant) => {
        const baseProps = makeProps({ variant, isSelected: false });
        const selectedProps = makeProps({ variant, isSelected: true });

        const { container: baseContainer } = renderInSvg(baseProps);
        const { container: selectedContainer } = renderInSvg(selectedProps);

        expect(selectedContainer.innerHTML).not.toEqual(
          baseContainer.innerHTML,
        );
      },
    );

    it.each(ALL_VARIANTS)(
      '%s variant renders differently when hovered',
      (variant) => {
        const baseProps = makeProps({ variant, isHovered: false });
        const hoveredProps = makeProps({ variant, isHovered: true });

        const { container: baseContainer } = renderInSvg(baseProps);
        const { container: hoveredContainer } = renderInSvg(hoveredProps);

        expect(hoveredContainer.innerHTML).not.toEqual(baseContainer.innerHTML);
      },
    );

    it('clean-tech uses path element when pos.path is provided', () => {
      const props = makeProps({
        variant: 'clean-tech',
        pos: {
          x: 50,
          y: 50,
          width: 80,
          height: 120,
          path: 'M 50 50 L 130 50 L 130 170 L 50 170 Z',
        },
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('clean-tech uses rect element when no pos.path', () => {
      const props = makeProps({
        variant: 'clean-tech',
        pos: { x: 50, y: 50, width: 80, height: 120 },
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThan(0);
    });

    it('megamek uses path with shadow when pos.path is provided', () => {
      const props = makeProps({
        variant: 'megamek',
        pos: {
          x: 50,
          y: 50,
          width: 80,
          height: 120,
          path: 'M 50 50 L 130 50 L 130 170 L 50 170 Z',
        },
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it('megamek uses rect when no pos.path', () => {
      const props = makeProps({
        variant: 'megamek',
        pos: { x: 50, y: 50, width: 80, height: 120 },
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThan(0);
    });

    it('tactical-hud shows corner brackets when hovered', () => {
      const props = makeProps({
        variant: 'tactical-hud',
        isHovered: true,
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThanOrEqual(4);
    });

    it('tactical-hud does not show corner brackets when not hovered', () => {
      const hoveredProps = makeProps({
        variant: 'tactical-hud',
        isHovered: true,
        showRear: false,
      });
      const notHoveredProps = makeProps({
        variant: 'tactical-hud',
        isHovered: false,
        showRear: false,
      });
      const { container: hoveredContainer } = renderInSvg(hoveredProps);
      const { container: notHoveredContainer } = renderInSvg(notHoveredProps);

      const hoveredPaths = hoveredContainer.querySelectorAll('path');
      const notHoveredPaths = notHoveredContainer.querySelectorAll('path');
      expect(hoveredPaths.length).toBeGreaterThan(notHoveredPaths.length);
    });

    it('neon-operator renders progress rings', () => {
      const props = makeProps({
        variant: 'neon-operator',
        data: ARMOR_DATA_PARTIAL,
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('premium-material renders dot indicators', () => {
      const props = makeProps({
        variant: 'premium-material',
        data: ARMOR_DATA_PARTIAL,
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('premium-material renders number badge', () => {
      const props = makeProps({
        variant: 'premium-material',
        data: { current: 30, maximum: 47 },
        showRear: false,
      });
      const { container } = renderInSvg(props);
      const texts = Array.from(container.querySelectorAll('text'));
      const values = texts.map((t) => t.textContent);
      expect(values).toContain('30');
    });
  });

  // =========================================================================
  // Variant-specific rear armor rendering
  // =========================================================================

  describe('rear armor rendering across variants', () => {
    it.each(ALL_VARIANTS)(
      '%s variant renders rear section when showRear is true',
      (variant) => {
        const withRear = makeProps({
          variant,
          showRear: true,
          data: ARMOR_DATA_PARTIAL,
        });
        const withoutRear = makeProps({
          variant,
          showRear: false,
          data: ARMOR_DATA_PARTIAL,
        });

        const { container: rearContainer } = renderInSvg(withRear);
        const { container: noRearContainer } = renderInSvg(withoutRear);

        const rearElements = rearContainer.querySelectorAll('*').length;
        const noRearElements = noRearContainer.querySelectorAll('*').length;
        expect(rearElements).toBeGreaterThan(noRearElements);
      },
    );
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles zero maximum armor gracefully', () => {
      const props = makeProps({
        data: { current: 0, maximum: 0 },
        showRear: false,
      });
      expect(() => renderInSvg(props)).not.toThrow();
    });

    it('handles current exceeding maximum', () => {
      const props = makeProps({
        data: { current: 100, maximum: 47 },
        showRear: false,
      });
      expect(() => renderInSvg(props)).not.toThrow();
    });

    it('handles very small position dimensions', () => {
      const props = makeProps({
        pos: { x: 0, y: 0, width: 10, height: 10 },
      });
      expect(() => renderInSvg(props)).not.toThrow();
    });

    it('handles negative position values', () => {
      const props = makeProps({
        pos: { x: -50, y: -50, width: 80, height: 120 },
      });
      expect(() => renderInSvg(props)).not.toThrow();
    });
  });
});
