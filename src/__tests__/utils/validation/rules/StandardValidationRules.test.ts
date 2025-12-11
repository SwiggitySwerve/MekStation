/**
 * Tests for Standard Validation Rules
 * 
 * @spec openspec/specs/validation-rules-master/spec.md
 */

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
import { IValidationContext, ValidationCategory, ValidationSeverity } from '@/types/validation/rules/ValidationRuleInterfaces';

// Helper to create a validation context
function createContext(unit: Record<string, unknown>): IValidationContext {
  return {
    unit,
    options: {},
    cache: new Map(),
  };
}

describe('Standard Validation Rules', () => {
  describe('TotalWeightRule', () => {
    it('should pass when total weight equals tonnage', () => {
      const context = createContext({
        tonnage: 50,
        totalWeight: 50,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when total weight is under tonnage', () => {
      const context = createContext({
        tonnage: 75,
        totalWeight: 70,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should fail when total weight exceeds tonnage', () => {
      const context = createContext({
        tonnage: 50,
        totalWeight: 55,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe(ValidationSeverity.ERROR);
      expect(result.errors[0].message).toContain('exceeds tonnage');
    });

    it('should warn when remaining weight is very small', () => {
      const context = createContext({
        tonnage: 50,
        totalWeight: 49.7,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('remaining');
    });

    it('should pass when tonnage is undefined', () => {
      const context = createContext({
        totalWeight: 50,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should pass when totalWeight is undefined', () => {
      const context = createContext({
        tonnage: 50,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should have correct rule metadata', () => {
      expect(TotalWeightRule.id).toBe('weight.total');
      expect(TotalWeightRule.name).toBe('Total Weight');
      expect(TotalWeightRule.category).toBe(ValidationCategory.WEIGHT);
    });

    it('should include suggestion in error', () => {
      const context = createContext({
        tonnage: 50,
        totalWeight: 55,
      });
      
      const result = TotalWeightRule.validate(context);
      
      expect(result.errors[0].suggestion).toContain('Remove');
      expect(result.errors[0].suggestion).toContain('5');
    });
  });

  describe('WeightRoundingRule', () => {
    it('should pass for properly rounded weight (0.5)', () => {
      const context = createContext({
        totalWeight: 50.5,
      });
      
      const result = WeightRoundingRule.validate(context);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass for whole number weight', () => {
      const context = createContext({
        totalWeight: 75,
      });
      
      const result = WeightRoundingRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should warn for improperly rounded weight', () => {
      const context = createContext({
        totalWeight: 50.3,
      });
      
      const result = WeightRoundingRule.validate(context);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('not properly rounded');
    });

    it('should pass when totalWeight is undefined', () => {
      const context = createContext({});
      
      const result = WeightRoundingRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should have correct rule metadata', () => {
      expect(WeightRoundingRule.id).toBe('weight.rounding');
      expect(WeightRoundingRule.category).toBe(ValidationCategory.WEIGHT);
    });
  });

  describe('TotalSlotsRule', () => {
    it('should pass when no criticalSlots defined', () => {
      const context = createContext({});
      
      const result = TotalSlotsRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should pass when slots under limit', () => {
      const context = createContext({
        criticalSlots: [
          { location: 'leftArm', slots: [{ content: 'item' }] },
        ],
      });
      
      const result = TotalSlotsRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should have correct rule metadata', () => {
      expect(TotalSlotsRule.id).toBe('slots.total');
      expect(TotalSlotsRule.category).toBe(ValidationCategory.SLOTS);
    });
  });

  describe('MinimumHeatSinksRule', () => {
    it('should pass with 10 heat sinks', () => {
      const context = createContext({
        heatSinks: { total: 10, type: 'Single' },
      });
      
      const result = MinimumHeatSinksRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should pass with more than 10 heat sinks', () => {
      const context = createContext({
        heatSinks: { total: 15, type: 'Double' },
      });
      
      const result = MinimumHeatSinksRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should fail with fewer than 10 heat sinks', () => {
      const context = createContext({
        heatSinks: { total: 8, type: 'Single' },
      });
      
      const result = MinimumHeatSinksRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Minimum 10');
    });

    it('should fail when heatSinks is missing', () => {
      const context = createContext({});
      
      const result = MinimumHeatSinksRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('missing');
    });

    it('should have correct rule metadata', () => {
      expect(MinimumHeatSinksRule.id).toBe('construction.min_heat_sinks');
      expect(MinimumHeatSinksRule.category).toBe(ValidationCategory.CONSTRUCTION);
    });
  });

  describe('ArmorMaximumRule', () => {
    it('should pass when armor is within limits', () => {
      const context = createContext({
        armorAllocation: {
          head: 9,
          centerTorso: 30,
        },
        structure: {
          points: {
            head: 3,
            centerTorso: 20,
          },
        },
      });
      
      const result = ArmorMaximumRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should fail when armor exceeds maximum', () => {
      const context = createContext({
        armorAllocation: {
          centerTorso: 50,
        },
        structure: {
          points: {
            centerTorso: 20,
          },
        },
      });
      
      const result = ArmorMaximumRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('exceeds maximum');
    });

    it('should enforce head max of 9', () => {
      const context = createContext({
        armorAllocation: {
          head: 12,
        },
        structure: {
          points: {
            head: 3,
          },
        },
      });
      
      const result = ArmorMaximumRule.validate(context);
      
      expect(result.passed).toBe(false);
    });

    it('should pass when no armor allocation', () => {
      const context = createContext({});
      
      const result = ArmorMaximumRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should have correct rule metadata', () => {
      expect(ArmorMaximumRule.id).toBe('construction.armor_max');
      expect(ArmorMaximumRule.category).toBe(ValidationCategory.ARMOR);
    });
  });

  describe('EngineRatingRule', () => {
    it('should pass for valid engine rating', () => {
      const context = createContext({
        engine: { rating: 300 },
      });
      
      const result = EngineRatingRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should fail when engine rating exceeds max (500)', () => {
      const context = createContext({
        engine: { rating: 550 },
      });
      
      const result = EngineRatingRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('between 10 and 500');
    });

    it('should fail when engine rating is below minimum (10)', () => {
      const context = createContext({
        engine: { rating: 5 },
      });
      
      const result = EngineRatingRule.validate(context);
      
      expect(result.passed).toBe(false);
    });

    it('should fail when engine rating is not multiple of 5', () => {
      const context = createContext({
        engine: { rating: 123 },
      });
      
      const result = EngineRatingRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('multiple of 5');
    });

    it('should fail when engine is missing', () => {
      const context = createContext({});
      
      const result = EngineRatingRule.validate(context);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('missing');
    });

    it('should fail when engine rating is undefined', () => {
      const context = createContext({
        engine: {},
      });
      
      const result = EngineRatingRule.validate(context);
      
      expect(result.passed).toBe(false);
    });

    it('should have correct rule metadata', () => {
      expect(EngineRatingRule.id).toBe('construction.engine_rating');
      expect(EngineRatingRule.category).toBe(ValidationCategory.CONSTRUCTION);
    });
  });

  describe('TechBaseCompatibilityRule', () => {
    it('should pass when techBase is defined', () => {
      const context = createContext({
        techBase: 'Inner Sphere',
      });
      
      const result = TechBaseCompatibilityRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should pass when techBase is undefined', () => {
      const context = createContext({});
      
      const result = TechBaseCompatibilityRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should have correct rule metadata', () => {
      expect(TechBaseCompatibilityRule.id).toBe('tech.compatibility');
      expect(TechBaseCompatibilityRule.category).toBe(ValidationCategory.TECH_BASE);
    });
  });

  describe('EraAvailabilityRule', () => {
    it('should pass when year is defined', () => {
      const context = createContext({
        year: 3025,
      });
      
      const result = EraAvailabilityRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should pass when year is undefined', () => {
      const context = createContext({});
      
      const result = EraAvailabilityRule.validate(context);
      
      expect(result.passed).toBe(true);
    });

    it('should have correct rule metadata', () => {
      expect(EraAvailabilityRule.id).toBe('era.availability');
      expect(EraAvailabilityRule.category).toBe(ValidationCategory.ERA);
    });
  });

  describe('Rule Priorities', () => {
    it('should have increasing priority values', () => {
      expect(TotalWeightRule.priority ?? 0).toBeLessThan(WeightRoundingRule.priority ?? 0);
    });

    it('should have category assignments', () => {
      expect(TotalWeightRule.category).toBe(ValidationCategory.WEIGHT);
      expect(ArmorMaximumRule.category).toBe(ValidationCategory.ARMOR);
      expect(EngineRatingRule.category).toBe(ValidationCategory.CONSTRUCTION);
    });
  });

  describe('getStandardValidationRules', () => {
    it('should return all standard rules', () => {
      const rules = getStandardValidationRules();
      
      expect(rules).toContain(TotalWeightRule);
      expect(rules).toContain(WeightRoundingRule);
      expect(rules).toContain(TotalSlotsRule);
      expect(rules).toContain(MinimumHeatSinksRule);
      expect(rules).toContain(ArmorMaximumRule);
      expect(rules).toContain(EngineRatingRule);
      expect(rules).toContain(TechBaseCompatibilityRule);
      expect(rules).toContain(EraAvailabilityRule);
    });

    it('should return 8 rules', () => {
      const rules = getStandardValidationRules();
      expect(rules).toHaveLength(8);
    });
  });

  describe('registerStandardRules', () => {
    it('should register all rules with registry', () => {
      const mockRegister = jest.fn();
      const mockRegistry = { register: mockRegister };
      
      registerStandardRules(mockRegistry);
      
      expect(mockRegister).toHaveBeenCalledTimes(8);
      expect(mockRegister).toHaveBeenCalledWith(TotalWeightRule);
      expect(mockRegister).toHaveBeenCalledWith(EngineRatingRule);
    });
  });
});
