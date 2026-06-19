import { describe, expect, it } from '@jest/globals';

import { MechLocation } from '@/types/construction';

import {
  ALL_VARIANTS,
  ARMOR_DATA_EMPTY,
  ARMOR_DATA_FULL,
  ARMOR_DATA_NO_REAR,
  ARMOR_DATA_PARTIAL,
  makeProps,
  renderInSvg,
} from './VariantLocationRenderer.test-helpers';

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
});
