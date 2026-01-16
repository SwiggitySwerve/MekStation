/**
 * Unit tests for UnitValidationOrchestrator
 * 
 * Tests the validation orchestrator including rule execution,
 * result aggregation, options handling, and error handling.
 */

import {
  UnitValidationOrchestrator,
  getUnitValidationOrchestrator,
  resetUnitValidationOrchestrator,
  validateUnit,
} from '@/services/validation/UnitValidationOrchestrator';
import {
  UnitValidationRegistry,
  resetUnitValidationRegistry,
} from '@/services/validation/UnitValidationRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  UnitCategory,
  IValidatableUnit,
  IUnitValidationRuleDefinition,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';

describe('UnitValidationOrchestrator', () => {
  let registry: UnitValidationRegistry;
  let orchestrator: UnitValidationOrchestrator;

  // Helper to create a mock unit
  const createMockUnit = (overrides: Partial<IValidatableUnit> = {}): IValidatableUnit => ({
    id: 'test-unit',
    name: 'Test Unit',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 5000000,
    battleValue: 1000,
    ...overrides,
  });

  // Helper to create a passing rule
  const createPassingRule = (id: string): IUnitValidationRuleDefinition => ({
    id,
    name: `Passing Rule ${id}`,
    description: `Description for ${id}`,
    category: ValidationCategory.CONSTRUCTION,
    priority: 50,
    validate: () => createUnitValidationRuleResult(id, `Passing Rule ${id}`, [], [], [], 0),
  });

  // Helper to create a failing rule with error
  const createFailingRule = (
    id: string,
    severity: UnitValidationSeverity = UnitValidationSeverity.ERROR
  ): IUnitValidationRuleDefinition => ({
    id,
    name: `Failing Rule ${id}`,
    description: `Description for ${id}`,
    category: ValidationCategory.CONSTRUCTION,
    priority: 50,
    validate() {
      return createUnitValidationRuleResult(
        id,
        `Failing Rule ${id}`,
        [
          createUnitValidationError(
            id,
            `Failing Rule ${id}`,
            severity,
            ValidationCategory.CONSTRUCTION,
            `Error from ${id}`
          ),
        ],
        [],
        [],
        0
      );
    },
  });

  // Helper to create a warning rule
  const createWarningRule = (id: string): IUnitValidationRuleDefinition => ({
    id,
    name: `Warning Rule ${id}`,
    description: `Description for ${id}`,
    category: ValidationCategory.CONSTRUCTION,
    priority: 50,
    validate() {
      return createUnitValidationRuleResult(
        id,
        `Warning Rule ${id}`,
        [],
        [
          createUnitValidationError(
            id,
            `Warning Rule ${id}`,
            UnitValidationSeverity.WARNING,
            ValidationCategory.CONSTRUCTION,
            `Warning from ${id}`
          ),
        ],
        [],
        0
      );
    },
  });

  beforeEach(() => {
    resetUnitValidationRegistry();
    resetUnitValidationOrchestrator();
    registry = new UnitValidationRegistry();
    orchestrator = new UnitValidationOrchestrator(registry);
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getUnitValidationOrchestrator();
      const instance2 = getUnitValidationOrchestrator();
      expect(instance1).toBe(instance2);
    });

    it('should reset to a new instance', () => {
      const instance1 = getUnitValidationOrchestrator();
      resetUnitValidationOrchestrator();
      const instance2 = getUnitValidationOrchestrator();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('validate', () => {
    it('should return valid result when no rules exist', () => {
      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should return valid result when all rules pass', () => {
      registry.registerUniversalRule(createPassingRule('VAL-PASS-001'));
      registry.registerUniversalRule(createPassingRule('VAL-PASS-002'));

      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should return invalid result when a rule fails', () => {
      registry.registerUniversalRule(createFailingRule('VAL-FAIL-001'));

      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
    });

    it('should track critical errors separately', () => {
      registry.registerUniversalRule(
        createFailingRule('VAL-CRIT-001', UnitValidationSeverity.CRITICAL_ERROR)
      );
      registry.registerUniversalRule(
        createFailingRule('VAL-ERR-001', UnitValidationSeverity.ERROR)
      );

      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(false);
      expect(result.hasCriticalErrors).toBe(true);
      expect(result.criticalErrorCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it('should count warnings', () => {
      registry.registerUniversalRule(createWarningRule('VAL-WARN-001'));
      registry.registerUniversalRule(createWarningRule('VAL-WARN-002'));

      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(true);
      expect(result.warningCount).toBe(2);
    });

    it('should include execution time', () => {
      registry.registerUniversalRule(createPassingRule('VAL-TIME-001'));

      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
      expect(result.results[0].executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include unit metadata in result', () => {
      const unit = createMockUnit({ unitType: UnitType.VEHICLE });
      const result = orchestrator.validate(unit);

      expect(result.unitType).toBe(UnitType.VEHICLE);
      expect(result.unitCategory).toBe(UnitCategory.VEHICLE);
      expect(result.validatedAt).toBeDefined();
    });
  });

  describe('Options', () => {
    it('should skip rules specified in skipRules', () => {
      registry.registerUniversalRule(createFailingRule('VAL-SKIP-001'));
      registry.registerUniversalRule(createPassingRule('VAL-KEEP-001'));

      const unit = createMockUnit();
      const result = orchestrator.validate(unit, { skipRules: ['VAL-SKIP-001'] });

      expect(result.isValid).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].ruleId).toBe('VAL-KEEP-001');
    });

    it('should filter by validation category', () => {
      const weightRule: IUnitValidationRuleDefinition = {
        ...createPassingRule('VAL-WEIGHT-001'),
        category: ValidationCategory.WEIGHT,
      };
      const slotRule: IUnitValidationRuleDefinition = {
        ...createPassingRule('VAL-SLOT-001'),
        category: ValidationCategory.SLOTS,
      };

      registry.registerUniversalRule(weightRule);
      registry.registerUniversalRule(slotRule);

      const unit = createMockUnit();
      const result = orchestrator.validate(unit, { categories: [ValidationCategory.WEIGHT] });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ruleId).toBe('VAL-WEIGHT-001');
    });

    it('should respect maxErrors option', () => {
      // Register 10 failing rules
      for (let i = 0; i < 10; i++) {
        registry.registerUniversalRule(createFailingRule(`VAL-FAIL-${i}`, UnitValidationSeverity.ERROR));
      }

      const unit = createMockUnit();
      const result = orchestrator.validate(unit, { maxErrors: 3 });

      // Should stop after 3 errors
      expect(result.errorCount).toBeLessThanOrEqual(3);
      expect(result.truncated).toBe(true);
    });
  });

  describe('validateCategory', () => {
    it('should only validate rules from specified category', () => {
      const weightRule: IUnitValidationRuleDefinition = {
        ...createFailingRule('VAL-WEIGHT-001'),
        category: ValidationCategory.WEIGHT,
      };
      const slotRule: IUnitValidationRuleDefinition = {
        ...createFailingRule('VAL-SLOT-001'),
        category: ValidationCategory.SLOTS,
      };

      registry.registerUniversalRule(weightRule);
      registry.registerUniversalRule(slotRule);

      const unit = createMockUnit();
      const result = orchestrator.validateCategory(unit, ValidationCategory.WEIGHT);

      expect(result.results).toHaveLength(1);
      expect(result.errorCount).toBe(1);
    });
  });

  describe('validateRule', () => {
    it('should validate a specific rule by ID', () => {
      registry.registerUniversalRule(createPassingRule('VAL-SPECIFIC-001'));
      registry.registerUniversalRule(createFailingRule('VAL-SPECIFIC-002'));

      const unit = createMockUnit();
      const result = orchestrator.validateRule(unit, 'VAL-SPECIFIC-002');

      expect(result).not.toBeNull();
      expect(result?.ruleId).toBe('VAL-SPECIFIC-002');
      expect(result?.passed).toBe(false);
    });

    it('should return null for unknown rule ID', () => {
      const unit = createMockUnit();
      const result = orchestrator.validateRule(unit, 'UNKNOWN-RULE');

      expect(result).toBeNull();
    });

    it('should return null if rule cannot validate the context', () => {
      const mechOnlyRule: IUnitValidationRuleDefinition = {
        ...createPassingRule('VAL-MECH-ONLY'),
        applicableUnitTypes: [UnitType.BATTLEMECH],
      };
      registry.registerCategoryRule(UnitCategory.MECH, mechOnlyRule);

      const vehicleUnit = createMockUnit({ unitType: UnitType.VEHICLE });
      const result = orchestrator.validateRule(vehicleUnit, 'VAL-MECH-ONLY');

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should catch and report rule execution errors', () => {
      const throwingRule: IUnitValidationRuleDefinition = {
        id: 'VAL-THROW-001',
        name: 'Throwing Rule',
        description: 'A rule that throws',
        category: ValidationCategory.CONSTRUCTION,
        priority: 50,
        validate: () => {
          throw new Error('Test error');
        },
      };
      registry.registerUniversalRule(throwingRule);

      const unit = createMockUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.results[0].errors[0].message).toContain('Rule execution failed');
      expect(result.results[0].errors[0].message).toContain('Test error');
    });
  });

  describe('validateUnit convenience function', () => {
    it('should validate using the singleton orchestrator', () => {
      // Use the global registry
      const globalRegistry = new UnitValidationRegistry();
      // Note: validateUnit uses the singleton which has its own registry
      resetUnitValidationOrchestrator();
      
      const unit = createMockUnit();
      const result = validateUnit(unit);

      expect(result.isValid).toBe(true);
      expect(result.unitType).toBe(UnitType.BATTLEMECH);
    });
  });

  describe('getRegistry', () => {
    it('should return the associated registry', () => {
      expect(orchestrator.getRegistry()).toBe(registry);
    });
  });
});
