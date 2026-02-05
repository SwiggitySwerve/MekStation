/**
 * Standard Validation Rules Tests
 *
 * Tests for BattleMech construction validation rules.
 *
 * @spec openspec/specs/validation-rules-master/spec.md
 */

import {
  IValidationContext,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  TotalWeightRule,
  WeightRoundingRule,
  TotalSlotsRule,
  MinimumHeatSinksRule,
  ArmorMaximumRule,
  EngineRatingRule,
  TechBaseCompatibilityRule,
  EraAvailabilityRule,
  getStandardValidationRules,
  registerStandardRules,
} from '@/utils/validation/rules/StandardValidationRules';

describe('StandardValidationRules', () => {
  /**
   * Create a mock validation context
   */
  function createContext(unit: Record<string, unknown>): IValidationContext {
    return {
      unit,
      options: { strictMode: false },
      cache: new Map<string, unknown>(),
    };
  }

  // ============================================================================
  // TotalWeightRule
  // ============================================================================
  describe('TotalWeightRule', () => {
    it('should pass when total weight is under tonnage', () => {
      const context = createContext({ tonnage: 50, totalWeight: 49 });
      const result = TotalWeightRule.validate(context);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when total weight equals tonnage', () => {
      const context = createContext({ tonnage: 50, totalWeight: 50 });
      const result = TotalWeightRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail when total weight exceeds tonnage', () => {
      const context = createContext({ tonnage: 50, totalWeight: 55 });
      const result = TotalWeightRule.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].severity).toBe(ValidationSeverity.ERROR);
    });

    it('should warn when close to limit', () => {
      const context = createContext({ tonnage: 50, totalWeight: 49.7 });
      const result = TotalWeightRule.validate(context);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should pass when fields are missing', () => {
      const context = createContext({});
      const result = TotalWeightRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should include suggestion in error', () => {
      const context = createContext({ tonnage: 50, totalWeight: 55 });
      const result = TotalWeightRule.validate(context);

      expect(result.errors[0].suggestion).toBeDefined();
      expect(result.errors[0].suggestion).toContain('5');
    });
  });

  // ============================================================================
  // WeightRoundingRule
  // ============================================================================
  describe('WeightRoundingRule', () => {
    it('should pass for properly rounded weight', () => {
      const context = createContext({ totalWeight: 49.5 });
      const result = WeightRoundingRule.validate(context);

      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass for whole number weight', () => {
      const context = createContext({ totalWeight: 50 });
      const result = WeightRoundingRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should warn for improperly rounded weight', () => {
      const context = createContext({ totalWeight: 49.3 });
      const result = WeightRoundingRule.validate(context);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should pass when weight is missing', () => {
      const context = createContext({});
      const result = WeightRoundingRule.validate(context);

      expect(result.passed).toBe(true);
    });
  });

  // ============================================================================
  // TotalSlotsRule
  // ============================================================================
  describe('TotalSlotsRule', () => {
    it('should pass when slots are within limit', () => {
      const context = createContext({
        criticalSlots: [
          { location: 'HEAD', slots: [{ content: null }, { content: null }] },
        ],
      });
      const result = TotalSlotsRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should pass when critical slots are missing', () => {
      const context = createContext({});
      const result = TotalSlotsRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should count only non-null slots', () => {
      const context = createContext({
        criticalSlots: [
          {
            location: 'HEAD',
            slots: [
              { content: { name: 'Life Support' } },
              { content: null },
              { content: { name: 'Sensors' } },
            ],
          },
        ],
      });
      const result = TotalSlotsRule.validate(context);

      expect(result.passed).toBe(true);
    });
  });

  // ============================================================================
  // MinimumHeatSinksRule
  // ============================================================================
  describe('MinimumHeatSinksRule', () => {
    it('should pass with 10 or more heat sinks', () => {
      const context = createContext({ heatSinks: { total: 10 } });
      const result = MinimumHeatSinksRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail with less than 10 heat sinks', () => {
      const context = createContext({ heatSinks: { total: 5 } });
      const result = MinimumHeatSinksRule.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when heat sinks are missing', () => {
      const context = createContext({});
      const result = MinimumHeatSinksRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when total is undefined', () => {
      const context = createContext({ heatSinks: {} });
      const result = MinimumHeatSinksRule.validate(context);

      expect(result.passed).toBe(false);
    });
  });

  // ============================================================================
  // ArmorMaximumRule
  // ============================================================================
  describe('ArmorMaximumRule', () => {
    it('should pass when armor is missing', () => {
      const context = createContext({});
      const result = ArmorMaximumRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should pass when structure is missing', () => {
      const context = createContext({ armorAllocation: { head: 9 } });
      const result = ArmorMaximumRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should pass for valid armor allocation', () => {
      const context = createContext({
        armorAllocation: {
          head: 9,
          leftArm: 20,
        },
        structure: {
          points: {
            head: 3,
            leftArm: 12,
          },
        },
      });
      const result = ArmorMaximumRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail when head armor exceeds 9', () => {
      const context = createContext({
        armorAllocation: { head: 15 },
        structure: { points: { head: 3 } },
      });
      const result = ArmorMaximumRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when location armor exceeds 2x structure', () => {
      const context = createContext({
        armorAllocation: { leftArm: 30 },
        structure: { points: { leftArm: 10 } }, // Max is 20
      });
      const result = ArmorMaximumRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should skip rear armor locations', () => {
      const context = createContext({
        armorAllocation: {
          centerTorsoRear: 15,
        },
        structure: { points: { centerTorso: 10 } },
      });
      const result = ArmorMaximumRule.validate(context);

      // Rear armor is skipped in this implementation
      expect(result.passed).toBe(true);
    });
  });

  // ============================================================================
  // EngineRatingRule
  // ============================================================================
  describe('EngineRatingRule', () => {
    it('should pass for valid engine rating', () => {
      const context = createContext({ engine: { rating: 200 } });
      const result = EngineRatingRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail when engine is missing', () => {
      const context = createContext({});
      const result = EngineRatingRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when rating is missing', () => {
      const context = createContext({ engine: {} });
      const result = EngineRatingRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when rating is below 10', () => {
      const context = createContext({ engine: { rating: 5 } });
      const result = EngineRatingRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when rating is above 500', () => {
      const context = createContext({ engine: { rating: 550 } });
      const result = EngineRatingRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when rating is not multiple of 5', () => {
      const context = createContext({ engine: { rating: 203 } });
      const result = EngineRatingRule.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should pass boundary values', () => {
      expect(
        EngineRatingRule.validate(createContext({ engine: { rating: 10 } }))
          .passed,
      ).toBe(true);
      expect(
        EngineRatingRule.validate(createContext({ engine: { rating: 500 } }))
          .passed,
      ).toBe(true);
    });
  });

  // ============================================================================
  // TechBaseCompatibilityRule
  // ============================================================================
  describe('TechBaseCompatibilityRule', () => {
    it('should pass when tech base is missing', () => {
      const context = createContext({});
      const result = TechBaseCompatibilityRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should pass for valid tech base', () => {
      const context = createContext({ techBase: 'Inner Sphere' });
      const result = TechBaseCompatibilityRule.validate(context);

      expect(result.passed).toBe(true);
    });
  });

  // ============================================================================
  // EraAvailabilityRule
  // ============================================================================
  describe('EraAvailabilityRule', () => {
    it('should pass when year is missing', () => {
      const context = createContext({});
      const result = EraAvailabilityRule.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should pass for valid year', () => {
      const context = createContext({ year: 3025 });
      const result = EraAvailabilityRule.validate(context);

      expect(result.passed).toBe(true);
    });
  });

  // ============================================================================
  // getStandardValidationRules()
  // ============================================================================
  describe('getStandardValidationRules()', () => {
    it('should return all standard rules', () => {
      const rules = getStandardValidationRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should include weight rules', () => {
      const rules = getStandardValidationRules();

      expect(rules.some((r) => r.id === 'weight.total')).toBe(true);
      expect(rules.some((r) => r.id === 'weight.rounding')).toBe(true);
    });

    it('should include slot rules', () => {
      const rules = getStandardValidationRules();

      expect(rules.some((r) => r.id === 'slots.total')).toBe(true);
    });

    it('should include construction rules', () => {
      const rules = getStandardValidationRules();

      expect(rules.some((r) => r.id === 'construction.min_heat_sinks')).toBe(
        true,
      );
      expect(rules.some((r) => r.id === 'construction.armor_max')).toBe(true);
      expect(rules.some((r) => r.id === 'construction.engine_rating')).toBe(
        true,
      );
    });

    it('should include tech base rules', () => {
      const rules = getStandardValidationRules();

      expect(rules.some((r) => r.id === 'tech.compatibility')).toBe(true);
    });

    it('should include era rules', () => {
      const rules = getStandardValidationRules();

      expect(rules.some((r) => r.id === 'era.availability')).toBe(true);
    });
  });

  // ============================================================================
  // registerStandardRules()
  // ============================================================================
  describe('registerStandardRules()', () => {
    it('should register all rules with provided registry', () => {
      const registered: string[] = [];
      const mockRegistry = {
        register: (rule: { id: string }) => {
          registered.push(rule.id);
        },
      };

      registerStandardRules(mockRegistry);

      expect(registered.length).toBe(getStandardValidationRules().length);
    });
  });
});
