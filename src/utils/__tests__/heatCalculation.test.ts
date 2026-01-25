/**
 * Heat Calculation Utility Tests
 */
import {
  calculateHeatNet,
  formatHeatNet,
  getHeatVariant,
  getHeatVariantClass,
  getHeatDisplay,
  HEAT_VARIANT_CLASSES,
} from '../heatCalculation';

describe('heatCalculation', () => {
  describe('calculateHeatNet', () => {
    it('should calculate positive heat (overheating)', () => {
      expect(calculateHeatNet(15, 10)).toBe(5);
    });

    it('should calculate negative heat (running cool)', () => {
      expect(calculateHeatNet(10, 15)).toBe(-5);
    });

    it('should calculate zero heat (balanced)', () => {
      expect(calculateHeatNet(10, 10)).toBe(0);
    });

    it('should handle zero values', () => {
      expect(calculateHeatNet(0, 0)).toBe(0);
      expect(calculateHeatNet(5, 0)).toBe(5);
      expect(calculateHeatNet(0, 5)).toBe(-5);
    });
  });

  describe('formatHeatNet', () => {
    it('should add + prefix for positive values', () => {
      expect(formatHeatNet(5)).toBe('+5');
      expect(formatHeatNet(1)).toBe('+1');
      expect(formatHeatNet(100)).toBe('+100');
    });

    it('should keep - prefix for negative values', () => {
      expect(formatHeatNet(-5)).toBe('-5');
      expect(formatHeatNet(-1)).toBe('-1');
      expect(formatHeatNet(-100)).toBe('-100');
    });

    it('should display zero without prefix', () => {
      expect(formatHeatNet(0)).toBe('0');
    });
  });

  describe('getHeatVariant', () => {
    it('should return "hot" for positive heat', () => {
      expect(getHeatVariant(1)).toBe('hot');
      expect(getHeatVariant(10)).toBe('hot');
    });

    it('should return "cold" for negative heat', () => {
      expect(getHeatVariant(-1)).toBe('cold');
      expect(getHeatVariant(-10)).toBe('cold');
    });

    it('should return "neutral" for zero heat', () => {
      expect(getHeatVariant(0)).toBe('neutral');
    });
  });

  describe('HEAT_VARIANT_CLASSES', () => {
    it('should have correct class for hot', () => {
      expect(HEAT_VARIANT_CLASSES.hot).toBe('text-rose-400');
    });

    it('should have correct class for cold', () => {
      expect(HEAT_VARIANT_CLASSES.cold).toBe('text-cyan-400');
    });

    it('should have correct class for neutral', () => {
      expect(HEAT_VARIANT_CLASSES.neutral).toBe('text-text-theme-secondary');
    });
  });

  describe('getHeatVariantClass', () => {
    it('should return rose class for positive heat', () => {
      expect(getHeatVariantClass(5)).toBe('text-rose-400');
    });

    it('should return cyan class for negative heat', () => {
      expect(getHeatVariantClass(-5)).toBe('text-cyan-400');
    });

    it('should return secondary class for zero heat', () => {
      expect(getHeatVariantClass(0)).toBe('text-text-theme-secondary');
    });
  });

  describe('getHeatDisplay', () => {
    it('should return complete display info for overheating', () => {
      const result = getHeatDisplay(15, 10);
      expect(result).toEqual({
        net: 5,
        display: '+5',
        variant: 'hot',
        className: 'text-rose-400',
      });
    });

    it('should return complete display info for running cool', () => {
      const result = getHeatDisplay(10, 15);
      expect(result).toEqual({
        net: -5,
        display: '-5',
        variant: 'cold',
        className: 'text-cyan-400',
      });
    });

    it('should return complete display info for balanced heat', () => {
      const result = getHeatDisplay(10, 10);
      expect(result).toEqual({
        net: 0,
        display: '0',
        variant: 'neutral',
        className: 'text-text-theme-secondary',
      });
    });

    it('should handle edge case of zero generation and dissipation', () => {
      const result = getHeatDisplay(0, 0);
      expect(result).toEqual({
        net: 0,
        display: '0',
        variant: 'neutral',
        className: 'text-text-theme-secondary',
      });
    });

    it('should handle typical BattleMech heat values', () => {
      // Atlas AS7-D with 4 MLs and 1 AC/20: ~12 heat, 10 dissipation
      const atlas = getHeatDisplay(12, 10);
      expect(atlas.net).toBe(2);
      expect(atlas.variant).toBe('hot');

      // Timber Wolf Prime: ~24 heat, 20 dissipation (double heat sinks)
      const timberWolf = getHeatDisplay(24, 20);
      expect(timberWolf.net).toBe(4);
      expect(timberWolf.variant).toBe('hot');

      // Fire Moth: high speed, low heat weapons
      const fireMoth = getHeatDisplay(6, 10);
      expect(fireMoth.net).toBe(-4);
      expect(fireMoth.variant).toBe('cold');
    });
  });
});
