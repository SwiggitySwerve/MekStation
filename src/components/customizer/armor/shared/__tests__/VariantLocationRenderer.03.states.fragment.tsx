import { describe, expect, it } from '@jest/globals';

import {
  ALL_VARIANTS,
  ARMOR_DATA_PARTIAL,
  makeProps,
  renderInSvg,
} from './VariantLocationRenderer.test-helpers';

describe('VariantLocationRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
