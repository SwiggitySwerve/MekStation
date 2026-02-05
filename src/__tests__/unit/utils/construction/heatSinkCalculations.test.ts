import { EngineType } from '@/types/construction/EngineType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import {
  calculateHeatDissipation,
  calculateExternalHeatSinks,
  calculateExternalHeatSinkWeight,
  calculateExternalHeatSinkSlots,
  validateHeatSinks,
  calculateHeatSinkWeight,
  getHeatSinkSummary,
} from '@/utils/construction/heatSinkCalculations';

describe('heatSinkCalculations', () => {
  describe('calculateHeatDissipation()', () => {
    it('should calculate dissipation for single heat sinks', () => {
      const dissipation = calculateHeatDissipation(HeatSinkType.SINGLE, 10);
      expect(dissipation).toBe(10); // 10 * 1 = 10
    });

    it('should calculate dissipation for double heat sinks', () => {
      const dissipation = calculateHeatDissipation(HeatSinkType.DOUBLE_IS, 10);
      expect(dissipation).toBe(20); // 10 * 2 = 20
    });

    it('should handle unknown heat sink type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(calculateHeatDissipation('INVALID' as any, 10)).toBe(10);
    });
  });

  describe('calculateExternalHeatSinks()', () => {
    it('should calculate external heat sinks', () => {
      const external = calculateExternalHeatSinks(15, 250, EngineType.STANDARD);
      // Engine provides 10 integral heat sinks (250 / 25)
      // External = 15 - 10 = 5
      expect(external).toBe(5);
    });

    it('should return 0 when total equals integral', () => {
      const external = calculateExternalHeatSinks(10, 250, EngineType.STANDARD);
      expect(external).toBe(0);
    });

    it('should not return negative', () => {
      const external = calculateExternalHeatSinks(5, 250, EngineType.STANDARD);
      expect(external).toBe(0);
    });
  });

  describe('calculateHeatSinkWeight()', () => {
    it('should calculate weight for first 10 as weight-free', () => {
      expect(calculateHeatSinkWeight(10, HeatSinkType.SINGLE)).toBe(0);
      expect(calculateHeatSinkWeight(15, HeatSinkType.SINGLE)).toBe(5);
    });

    it('should calculate weight for double heat sinks beyond 10', () => {
      expect(calculateHeatSinkWeight(15, HeatSinkType.DOUBLE_IS)).toBe(5);
    });
  });

  describe('calculateExternalHeatSinkWeight()', () => {
    it('should calculate weight for single heat sinks', () => {
      const weight = calculateExternalHeatSinkWeight(5, HeatSinkType.SINGLE);
      expect(weight).toBe(5); // 5 * 1 = 5
    });

    it('should handle unknown heat sink type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(calculateExternalHeatSinkWeight(5, 'INVALID' as any)).toBe(5);
    });
  });

  describe('calculateExternalHeatSinkSlots()', () => {
    it('should calculate slots for single heat sinks', () => {
      const slots = calculateExternalHeatSinkSlots(5, HeatSinkType.SINGLE);
      expect(slots).toBe(5); // 5 * 1 = 5
    });

    it('should handle unknown heat sink type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(calculateExternalHeatSinkSlots(5, 'INVALID' as any)).toBe(5);
    });
  });

  describe('validateHeatSinks()', () => {
    it('should validate correct heat sink count', () => {
      const result = validateHeatSinks(
        15,
        HeatSinkType.SINGLE,
        250,
        EngineType.STANDARD,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject below minimum', () => {
      const result = validateHeatSinks(
        5,
        HeatSinkType.SINGLE,
        250,
        EngineType.STANDARD,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject unknown heat sink type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      const result = validateHeatSinks(
        15,
        'INVALID' as any,
        250,
        EngineType.STANDARD,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unknown heat sink type');
    });

    it('should issue warning for large number of external sinks', () => {
      const result = validateHeatSinks(
        40,
        HeatSinkType.SINGLE,
        250,
        EngineType.STANDARD,
      );
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getHeatSinkSummary()', () => {
    it('should return a summary', () => {
      const summary = getHeatSinkSummary(
        15,
        HeatSinkType.SINGLE,
        250,
        EngineType.STANDARD,
      );
      expect(summary.integrated).toBe(10);
      expect(summary.external).toBe(5);
      expect(summary.weight).toBe(5);
      expect(summary.slots).toBe(5);
      expect(summary.dissipation).toBe(15);
      expect(summary.weightFree).toBe(10);
    });
  });
});
