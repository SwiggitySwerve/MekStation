/**
 * Unit Validation Orchestrator Tests
 *
 * Tests the orchestrator's ability to execute validation rules,
 * aggregate results, and handle filtering options.
 */

import {
  UnitValidationOrchestrator,
  getUnitValidationOrchestrator,
  resetUnitValidationOrchestrator,
  validateUnit,
} from '../UnitValidationOrchestrator';
import { UnitValidationRegistry, resetUnitValidationRegistry } from '../UnitValidationRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  UnitCategory,
  IValidatableUnit,
  IUnitValidationRuleDefinition,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  createPassingResult,
} from '@/types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { TechBase, RulesLevel, Era } from '@/types/enums';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestUnit(overrides: Partial<IValidatableUnit> = {}): IValidatableUnit {
  return {
    id: 'test-unit-1',
    name: 'Test Mech',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 5000000,
    battleValue: 1000,
    ...overrides,
  };
}

function createPassingRule(id: string, category: ValidationCategory = ValidationCategory.WEIGHT): IUnitValidationRuleDefinition {
  return {
    id,
    name: `Passing Rule ${id}`,
    description: `Test passing rule ${id}`,
    category,
    priority: 100,
    validate: () => createPassingResult(id, `Passing Rule ${id}`),
  };
}

function createFailingRule(
  id: string,
  severity: UnitValidationSeverity = UnitValidationSeverity.ERROR,
  category: ValidationCategory = ValidationCategory.WEIGHT
): IUnitValidationRuleDefinition {
  return {
    id,
    name: `Failing Rule ${id}`,
    description: `Test failing rule ${id}`,
    category,
    priority: 100,
    validate: () =>
      createUnitValidationRuleResult(
        id,
        `Failing Rule ${id}`,
        [
          createUnitValidationError(
            id,
            `Failing Rule ${id}`,
            severity,
            category,
            `Validation failed for ${id}`
          ),
        ],
        [],
        [],
        1
      ),
  };
}

function createWarningRule(id: string, category: ValidationCategory = ValidationCategory.WEIGHT): IUnitValidationRuleDefinition {
  return {
    id,
    name: `Warning Rule ${id}`,
    description: `Test warning rule ${id}`,
    category,
    priority: 100,
    validate: () =>
      createUnitValidationRuleResult(
        id,
        `Warning Rule ${id}`,
        [],
        [
          createUnitValidationError(
            id,
            `Warning Rule ${id}`,
            UnitValidationSeverity.WARNING,
            category,
            `Warning for ${id}`
          ),
        ],
        [],
        1
      ),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('UnitValidationOrchestrator', () => {
  let registry: UnitValidationRegistry;
  let orchestrator: UnitValidationOrchestrator;

  beforeEach(() => {
    // Reset singletons before each test
    resetUnitValidationRegistry();
    resetUnitValidationOrchestrator();

    // Create fresh instances
    registry = new UnitValidationRegistry();
    orchestrator = new UnitValidationOrchestrator(registry);
  });

  // ===========================================================================
  // Basic Validation
  // ===========================================================================

  describe('validate', () => {
    it('should validate unit with passing rules', () => {
      registry.registerUniversalRule(createPassingRule('PASS-001'));
      registry.registerUniversalRule(createPassingRule('PASS-002'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(true);
      expect(result.hasCriticalErrors).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.results.length).toBe(2);
    });

    it('should validate unit with failing rules', () => {
      registry.registerUniversalRule(createPassingRule('PASS-001'));
      registry.registerUniversalRule(createFailingRule('FAIL-001'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.results.length).toBe(2);
    });

    it('should detect critical errors', () => {
      registry.registerUniversalRule(
        createFailingRule('CRIT-001', UnitValidationSeverity.CRITICAL_ERROR)
      );

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(false);
      expect(result.hasCriticalErrors).toBe(true);
      expect(result.criticalErrorCount).toBe(1);
    });

    it('should count warnings separately', () => {
      registry.registerUniversalRule(createWarningRule('WARN-001'));
      registry.registerUniversalRule(createWarningRule('WARN-002'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(true); // Warnings don't affect validity
      expect(result.warningCount).toBe(2);
    });

    it('should include validation timestamp', () => {
      registry.registerUniversalRule(createPassingRule('PASS-001'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.validatedAt).toBeDefined();
      expect(new Date(result.validatedAt).getTime()).not.toBeNaN();
    });

    it('should track total execution time', () => {
      registry.registerUniversalRule(createPassingRule('PASS-001'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // Rule Filtering
  // ===========================================================================

  describe('rule filtering', () => {
    it('should filter rules by unit type', () => {
      registry.registerUniversalRule(createPassingRule('UNIV-001'));
      registry.registerUnitTypeRule(UnitType.BATTLEMECH, createPassingRule('BM-001'));
      registry.registerUnitTypeRule(UnitType.VEHICLE, createPassingRule('VEH-001'));

      const mechUnit = createTestUnit({ unitType: UnitType.BATTLEMECH });
      const result = orchestrator.validate(mechUnit);

      // Should have universal + mech-specific rules, not vehicle rule
      expect(result.results.map((r) => r.ruleId).sort()).toEqual(['BM-001', 'UNIV-001']);
    });

    it('should skip rules by ID', () => {
      registry.registerUniversalRule(createPassingRule('PASS-001'));
      registry.registerUniversalRule(createFailingRule('SKIP-ME'));
      registry.registerUniversalRule(createPassingRule('PASS-002'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit, { skipRules: ['SKIP-ME'] });

      expect(result.isValid).toBe(true);
      expect(result.results.map((r) => r.ruleId).sort()).toEqual(['PASS-001', 'PASS-002']);
    });

    it('should filter rules by validation category', () => {
      registry.registerUniversalRule(createPassingRule('WEIGHT-001', ValidationCategory.WEIGHT));
      registry.registerUniversalRule(createPassingRule('ARMOR-001', ValidationCategory.ARMOR));
      registry.registerUniversalRule(createPassingRule('SLOTS-001', ValidationCategory.SLOTS));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit, {
        categories: [ValidationCategory.WEIGHT, ValidationCategory.ARMOR],
      });

      expect(result.results.map((r) => r.ruleId).sort()).toEqual(['ARMOR-001', 'WEIGHT-001']);
    });

    it('should respect canValidate returning false', () => {
      registry.registerUniversalRule({
        ...createPassingRule('ALWAYS-RUN'),
      });
      registry.registerUniversalRule({
        ...createPassingRule('NEVER-RUN'),
        canValidate: () => false,
      });

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.results.length).toBe(1);
      expect(result.results[0].ruleId).toBe('ALWAYS-RUN');
    });
  });

  // ===========================================================================
  // Max Errors
  // ===========================================================================

  describe('max errors handling', () => {
    it('should stop after maxErrors is reached', () => {
      // Register 5 failing rules
      for (let i = 1; i <= 5; i++) {
        registry.registerUniversalRule(createFailingRule(`FAIL-00${i}`));
      }

      const unit = createTestUnit();
      const result = orchestrator.validate(unit, { maxErrors: 3 });

      // Should only execute 3 rules before stopping
      expect(result.errorCount).toBeLessThanOrEqual(3);
      expect(result.truncated).toBe(true);
    });

    it('should not truncate when under maxErrors', () => {
      registry.registerUniversalRule(createFailingRule('FAIL-001'));
      registry.registerUniversalRule(createPassingRule('PASS-001'));

      const unit = createTestUnit();
      const result = orchestrator.validate(unit, { maxErrors: 10 });

      expect(result.truncated).toBe(false);
    });
  });

  // ===========================================================================
  // Rule Priority
  // ===========================================================================

  describe('rule priority', () => {
    it('should execute rules in priority order', () => {
      const executionOrder: string[] = [];

      registry.registerUniversalRule({
        id: 'LOW-PRIORITY',
        name: 'Low Priority',
        description: 'Test',
        category: ValidationCategory.WEIGHT,
        priority: 300,
        validate: () => {
          executionOrder.push('LOW');
          return createPassingResult('LOW-PRIORITY', 'Low Priority');
        },
      });

      registry.registerUniversalRule({
        id: 'HIGH-PRIORITY',
        name: 'High Priority',
        description: 'Test',
        category: ValidationCategory.WEIGHT,
        priority: 50,
        validate: () => {
          executionOrder.push('HIGH');
          return createPassingResult('HIGH-PRIORITY', 'High Priority');
        },
      });

      registry.registerUniversalRule({
        id: 'MED-PRIORITY',
        name: 'Medium Priority',
        description: 'Test',
        category: ValidationCategory.WEIGHT,
        priority: 150,
        validate: () => {
          executionOrder.push('MED');
          return createPassingResult('MED-PRIORITY', 'Medium Priority');
        },
      });

      const unit = createTestUnit();
      orchestrator.validate(unit);

      expect(executionOrder).toEqual(['HIGH', 'MED', 'LOW']);
    });
  });

  // ===========================================================================
  // Category Validation
  // ===========================================================================

  describe('validateCategory', () => {
    it('should validate only rules from specified category', () => {
      registry.registerUniversalRule(createPassingRule('WEIGHT-001', ValidationCategory.WEIGHT));
      registry.registerUniversalRule(createFailingRule('ARMOR-001', UnitValidationSeverity.ERROR, ValidationCategory.ARMOR));

      const unit = createTestUnit();
      const result = orchestrator.validateCategory(unit, ValidationCategory.WEIGHT);

      expect(result.isValid).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].ruleId).toBe('WEIGHT-001');
    });
  });

  // ===========================================================================
  // Single Rule Validation
  // ===========================================================================

  describe('validateRule', () => {
    it('should run specific rule by ID', () => {
      registry.registerUniversalRule(createPassingRule('PASS-001'));
      registry.registerUniversalRule(createFailingRule('FAIL-001'));

      const unit = createTestUnit();
      const result = orchestrator.validateRule(unit, 'FAIL-001');

      expect(result).not.toBeNull();
      expect(result!.ruleId).toBe('FAIL-001');
      expect(result!.passed).toBe(false);
    });

    it('should return null for unknown rule', () => {
      const unit = createTestUnit();
      const result = orchestrator.validateRule(unit, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if rule cannot validate context', () => {
      registry.registerUniversalRule({
        ...createPassingRule('RESTRICTED'),
        canValidate: () => false,
      });

      const unit = createTestUnit();
      const result = orchestrator.validateRule(unit, 'RESTRICTED');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should handle rule execution errors gracefully', () => {
      registry.registerUniversalRule({
        id: 'THROWS-ERROR',
        name: 'Throws Error',
        description: 'Test',
        category: ValidationCategory.WEIGHT,
        priority: 100,
        validate: () => {
          throw new Error('Rule execution failed');
        },
      });

      const unit = createTestUnit();
      const result = orchestrator.validate(unit);

      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.results[0].errors[0].message).toContain('Rule execution failed');
    });
  });

  // ===========================================================================
  // Registry Access
  // ===========================================================================

  describe('getRegistry', () => {
    it('should return the registry instance', () => {
      const returnedRegistry = orchestrator.getRegistry();
      expect(returnedRegistry).toBe(registry);
    });
  });
});

// =============================================================================
// Singleton Tests
// =============================================================================

describe('getUnitValidationOrchestrator', () => {
  beforeEach(() => {
    resetUnitValidationOrchestrator();
  });

  it('should return singleton instance', () => {
    const orchestrator1 = getUnitValidationOrchestrator();
    const orchestrator2 = getUnitValidationOrchestrator();

    expect(orchestrator1).toBe(orchestrator2);
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('validateUnit', () => {
  beforeEach(() => {
    resetUnitValidationOrchestrator();
    resetUnitValidationRegistry();
  });

  it('should validate unit using singleton orchestrator', () => {
    const unit = createTestUnit();
    const result = validateUnit(unit);

    expect(result).toBeDefined();
    expect(result.unitType).toBe(UnitType.BATTLEMECH);
    expect(result.unitCategory).toBe(UnitCategory.MECH);
  });
});
