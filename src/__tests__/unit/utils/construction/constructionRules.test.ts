/**
 * Tests for Construction Rules Core
 *
 * @spec openspec/specs/construction-rules-core/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  validateTonnage,
  calculateInternalStructure,
  calculateEngine,
  calculateGyro,
  calculateCockpit,
  calculateHeatSinks,
  calculateArmor,
  calculateStructuralWeight,
  calculateRemainingTonnage,
  validateConstruction,
  MechBuildConfig,
} from '@/utils/construction/constructionRules';

describe('Construction Rules', () => {
  /**
   * Create a valid mech configuration for testing
   */
  function createValidConfig(
    overrides: Partial<MechBuildConfig> = {},
  ): MechBuildConfig {
    return {
      tonnage: 50,
      engineRating: 200,
      engineType: EngineType.STANDARD,
      gyroType: GyroType.STANDARD,
      internalStructureType: InternalStructureType.STANDARD,
      armorType: ArmorTypeEnum.STANDARD,
      totalArmorPoints: 100,
      cockpitType: CockpitType.STANDARD,
      heatSinkType: HeatSinkType.SINGLE,
      totalHeatSinks: 10,
      jumpMP: 0,
      ...overrides,
    };
  }

  // ============================================================================
  // Step 1: validateTonnage
  // ============================================================================
  describe('validateTonnage', () => {
    it('should accept valid tonnages in 5-ton increments', () => {
      const validTonnages = [
        20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
      ];

      for (const tonnage of validTonnages) {
        const result = validateTonnage(tonnage);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject tonnage below 20', () => {
      const result = validateTonnage(15);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Tonnage must be between 20 and 100 (got 15)',
      );
    });

    it('should reject tonnage above 100', () => {
      const result = validateTonnage(105);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Tonnage must be between 20 and 100 (got 105)',
      );
    });

    it('should reject non-5-ton increments', () => {
      const result = validateTonnage(52);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Tonnage must be a multiple of 5 (got 52)',
      );
    });

    it('should return step 1 with correct name', () => {
      const result = validateTonnage(50);
      expect(result.step).toBe(1);
      expect(result.name).toBe('Choose Tonnage');
    });
  });

  // ============================================================================
  // Step 2: calculateInternalStructure
  // ============================================================================
  describe('calculateInternalStructure', () => {
    it('should calculate standard structure weight (10% of tonnage)', () => {
      const result = calculateInternalStructure(
        50,
        InternalStructureType.STANDARD,
      );
      expect(result.weight).toBe(5); // 50 * 0.10 = 5
      expect(result.isValid).toBe(true);
    });

    it('should calculate endo steel weight (5% of tonnage)', () => {
      const result = calculateInternalStructure(
        50,
        InternalStructureType.ENDO_STEEL_IS,
      );
      expect(result.weight).toBe(2.5); // 50 * 0.05 = 2.5
    });

    it('should include critical slots for endo steel', () => {
      const result = calculateInternalStructure(
        50,
        InternalStructureType.ENDO_STEEL_IS,
      );
      expect(result.criticalSlots).toBe(14);
    });

    it('should have 0 critical slots for standard structure', () => {
      const result = calculateInternalStructure(
        50,
        InternalStructureType.STANDARD,
      );
      expect(result.criticalSlots).toBe(0);
    });

    it('should return step 2', () => {
      const result = calculateInternalStructure(
        50,
        InternalStructureType.STANDARD,
      );
      expect(result.step).toBe(2);
      expect(result.name).toBe('Internal Structure');
    });
  });

  // ============================================================================
  // Step 3: calculateEngine
  // ============================================================================
  describe('calculateEngine', () => {
    it('should calculate engine weight for standard engine', () => {
      const result = calculateEngine(50, 200, EngineType.STANDARD);
      expect(result.weight).toBeGreaterThan(0);
      expect(result.isValid).toBe(true);
    });

    it('should error for engine rating providing less than 1 walk MP', () => {
      // Rating 40 / tonnage 50 = 0.8 walk MP (rounds down to 0)
      const result = calculateEngine(50, 40, EngineType.STANDARD);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('less than 1 walk MP'))).toBe(
        true,
      );
    });

    it('should calculate critical slots for engine', () => {
      const result = calculateEngine(50, 200, EngineType.STANDARD);
      expect(result.criticalSlots).toBeGreaterThan(0);
    });

    it('should return step 3', () => {
      const result = calculateEngine(50, 200, EngineType.STANDARD);
      expect(result.step).toBe(3);
      expect(result.name).toBe('Engine');
    });
  });

  // ============================================================================
  // Step 4: calculateGyro
  // ============================================================================
  describe('calculateGyro', () => {
    it('should calculate standard gyro weight (ceil(rating/100))', () => {
      const result = calculateGyro(200, GyroType.STANDARD);
      expect(result.weight).toBe(2); // ceil(200/100) = 2
    });

    it('should calculate compact gyro weight (1.5x standard)', () => {
      const result = calculateGyro(200, GyroType.COMPACT);
      expect(result.weight).toBe(3); // 2 * 1.5 = 3
    });

    it('should return gyro critical slots', () => {
      const standardResult = calculateGyro(200, GyroType.STANDARD);
      expect(standardResult.criticalSlots).toBe(4);

      const compactResult = calculateGyro(200, GyroType.COMPACT);
      expect(compactResult.criticalSlots).toBe(2);
    });

    it('should return step 4', () => {
      const result = calculateGyro(200, GyroType.STANDARD);
      expect(result.step).toBe(4);
      expect(result.name).toBe('Gyro');
    });
  });

  // ============================================================================
  // Step 5: calculateCockpit
  // ============================================================================
  describe('calculateCockpit', () => {
    it('should return standard cockpit weight (3 tons)', () => {
      const result = calculateCockpit(CockpitType.STANDARD);
      expect(result.weight).toBe(3);
      expect(result.isValid).toBe(true);
    });

    it('should return small cockpit weight (2 tons)', () => {
      const result = calculateCockpit(CockpitType.SMALL);
      expect(result.weight).toBe(2);
    });

    it('should return cockpit critical slots', () => {
      const result = calculateCockpit(CockpitType.STANDARD);
      expect(result.criticalSlots).toBeGreaterThanOrEqual(5);
    });

    it('should return step 5', () => {
      const result = calculateCockpit(CockpitType.STANDARD);
      expect(result.step).toBe(5);
      expect(result.name).toBe('Cockpit');
    });
  });

  // ============================================================================
  // Step 6: calculateHeatSinks
  // ============================================================================
  describe('calculateHeatSinks', () => {
    it('should require minimum 10 heat sinks', () => {
      const result = calculateHeatSinks(
        HeatSinkType.SINGLE,
        5,
        200,
        EngineType.STANDARD,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Minimum'))).toBe(true);
    });

    it('should calculate heat sink weight (first 10 are weight-free)', () => {
      // Per BattleTech rules, first 10 heat sinks are WEIGHT-FREE
      // With 12 total, only 2 cost weight (12 - 10 = 2)
      const result = calculateHeatSinks(
        HeatSinkType.SINGLE,
        12,
        200,
        EngineType.STANDARD,
      );
      expect(result.weight).toBe(2);
    });

    it('should calculate external heat sink slots', () => {
      const result = calculateHeatSinks(
        HeatSinkType.SINGLE,
        12,
        200,
        EngineType.STANDARD,
      );
      expect(result.criticalSlots).toBe(4); // 1 slot each for single
    });

    it('should warn when many external heat sinks', () => {
      const result = calculateHeatSinks(
        HeatSinkType.SINGLE,
        20,
        200,
        EngineType.STANDARD,
      );
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return step 6', () => {
      const result = calculateHeatSinks(
        HeatSinkType.SINGLE,
        10,
        200,
        EngineType.STANDARD,
      );
      expect(result.step).toBe(6);
      expect(result.name).toBe('Heat Sinks');
    });
  });

  // ============================================================================
  // Step 7: calculateArmor
  // ============================================================================
  describe('calculateArmor', () => {
    it('should calculate standard armor weight', () => {
      // Standard armor: 16 points per ton
      const result = calculateArmor(ArmorTypeEnum.STANDARD, 160, 50);
      expect(result.weight).toBe(10); // 160 / 16 = 10
      expect(result.isValid).toBe(true);
    });

    it('should calculate ferro-fibrous armor weight', () => {
      // Ferro-fibrous: ~12% lighter
      const result = calculateArmor(ArmorTypeEnum.FERRO_FIBROUS_IS, 160, 50);
      expect(result.weight).toBeLessThan(10);
    });

    it('should include armor critical slots', () => {
      const ferroResult = calculateArmor(
        ArmorTypeEnum.FERRO_FIBROUS_IS,
        160,
        50,
      );
      expect(ferroResult.criticalSlots).toBe(14);
    });

    it('should return step 7', () => {
      const result = calculateArmor(ArmorTypeEnum.STANDARD, 100, 50);
      expect(result.step).toBe(7);
      expect(result.name).toBe('Armor');
    });
  });

  // ============================================================================
  // calculateStructuralWeight
  // ============================================================================
  describe('calculateStructuralWeight', () => {
    it('should sum all structural component weights', () => {
      const config = createValidConfig();
      const weight = calculateStructuralWeight(config);

      // Should be positive and reasonable for a 50-ton mech
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(50);
    });

    it('should vary by engine type', () => {
      const standardEngine = createValidConfig({
        engineType: EngineType.STANDARD,
      });
      const xlEngine = createValidConfig({ engineType: EngineType.XL_IS });

      const standardWeight = calculateStructuralWeight(standardEngine);
      const xlWeight = calculateStructuralWeight(xlEngine);

      expect(xlWeight).toBeLessThan(standardWeight);
    });

    it('should vary by structure type', () => {
      const standard = createValidConfig({
        internalStructureType: InternalStructureType.STANDARD,
      });
      const endo = createValidConfig({
        internalStructureType: InternalStructureType.ENDO_STEEL_IS,
      });

      const standardWeight = calculateStructuralWeight(standard);
      const endoWeight = calculateStructuralWeight(endo);

      expect(endoWeight).toBeLessThan(standardWeight);
    });
  });

  // ============================================================================
  // calculateRemainingTonnage
  // ============================================================================
  describe('calculateRemainingTonnage', () => {
    it('should return tonnage minus structural weight', () => {
      const config = createValidConfig();
      const remaining = calculateRemainingTonnage(config);
      const structural = calculateStructuralWeight(config);

      expect(remaining).toBe(config.tonnage - structural);
    });

    it('should never be negative', () => {
      const config = createValidConfig({
        totalArmorPoints: 200,
        totalHeatSinks: 20,
      });
      const remaining = calculateRemainingTonnage(config);

      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // validateConstruction (full validation)
  // ============================================================================
  describe('validateConstruction', () => {
    it('should validate a proper mech configuration', () => {
      const config = createValidConfig();
      const result = validateConstruction(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.steps).toHaveLength(7);
    });

    it('should aggregate errors from all steps', () => {
      const config = createValidConfig({
        tonnage: 15, // Invalid
        totalHeatSinks: 5, // Invalid
      });
      const result = validateConstruction(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate total weight correctly', () => {
      const config = createValidConfig();
      const result = validateConstruction(config);

      let expectedWeight = 0;
      for (const step of result.steps) {
        expectedWeight += step.weight;
      }

      expect(result.totalWeight).toBe(expectedWeight);
    });

    it('should calculate remaining tonnage', () => {
      const config = createValidConfig();
      const result = validateConstruction(config);

      expect(result.remainingTonnage).toBe(config.tonnage - result.totalWeight);
    });

    it('should error when weight exceeds tonnage', () => {
      const config = createValidConfig({
        tonnage: 20,
        engineRating: 200,
        totalArmorPoints: 200,
        totalHeatSinks: 20,
      });
      const result = validateConstruction(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds tonnage'))).toBe(
        true,
      );
    });

    it('should calculate total critical slots', () => {
      const config = createValidConfig();
      const result = validateConstruction(config);

      let expectedSlots = 0;
      for (const step of result.steps) {
        expectedSlots += step.criticalSlots;
      }

      expect(result.totalCriticalSlots).toBe(expectedSlots);
    });

    it('should pass warnings through', () => {
      const config = createValidConfig({
        totalHeatSinks: 25, // Will generate warning about external heat sinks
      });
      const result = validateConstruction(config);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
