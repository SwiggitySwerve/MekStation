/**
 * Validation Orchestrator Tests
 * 
 * Tests for validation orchestration and aggregation.
 * 
 * @spec openspec/specs/validation-patterns/spec.md
 */

import { createValidationOrchestrator } from '@/utils/validation/rules/ValidationOrchestrator';
import { createValidationRuleRegistry } from '@/utils/validation/rules/ValidationRuleRegistry';
import {
  IValidationOrchestrator,
  IValidationRuleRegistry,
  IValidationRuleDefinition,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

/**
 * Create a simple passing rule
 */
function createPassingRule(id: string, category: ValidationCategory): IValidationRuleDefinition {
  return {
    id,
    name: `Passing Rule ${id}`,
    description: `Always passes`,
    category,
    validate: () => ({
      ruleId: id,
      passed: true,
      errors: [],
      warnings: [],
      infos: [],
      executionTime: 0,
    }),
  };
}

/**
 * Create a failing rule
 */
function createFailingRule(id: string, category: ValidationCategory): IValidationRuleDefinition {
  return {
    id,
    name: `Failing Rule ${id}`,
    description: `Always fails`,
    category,
    validate: () => ({
      ruleId: id,
      passed: false,
      errors: [{
        ruleId: id,
        ruleName: `Failing Rule ${id}`,
        severity: ValidationSeverity.ERROR,
        category,
        message: 'Test error',
      }],
      warnings: [],
      infos: [],
      executionTime: 0,
    }),
  };
}

/**
 * Create a warning rule
 */
function createWarningRule(id: string, category: ValidationCategory): IValidationRuleDefinition {
  return {
    id,
    name: `Warning Rule ${id}`,
    description: `Produces warnings`,
    category,
    validate: () => ({
      ruleId: id,
      passed: true,
      errors: [],
      warnings: [{
        ruleId: id,
        ruleName: `Warning Rule ${id}`,
        severity: ValidationSeverity.WARNING,
        category,
        message: 'Test warning',
      }],
      infos: [],
      executionTime: 0,
    }),
  };
}

/**
 * Create a conditional rule
 */
function createConditionalRule(id: string, category: ValidationCategory): IValidationRuleDefinition {
  return {
    id,
    name: `Conditional Rule ${id}`,
    description: `Only validates when unit has tonnage`,
    category,
    canValidate: (ctx) => {
      const unit = ctx.unit as { tonnage?: number };
      return unit.tonnage !== undefined;
    },
    validate: (ctx) => {
      const unit = ctx.unit as { tonnage?: number };
      if (unit.tonnage && unit.tonnage > 100) {
        return {
          ruleId: id,
          passed: false,
          errors: [{
            ruleId: id,
            ruleName: `Conditional Rule ${id}`,
            severity: ValidationSeverity.ERROR,
            category,
            message: 'Tonnage exceeds 100',
          }],
          warnings: [],
          infos: [],
          executionTime: 0,
        };
      }
      return {
        ruleId: id,
        passed: true,
        errors: [],
        warnings: [],
        infos: [],
        executionTime: 0,
      };
    },
  };
}

describe('ValidationOrchestrator', () => {
  let registry: IValidationRuleRegistry;
  let orchestrator: IValidationOrchestrator;

  beforeEach(() => {
    registry = createValidationRuleRegistry();
    orchestrator = createValidationOrchestrator(registry);
  });

  // ============================================================================
  // validate
  // ============================================================================
  describe('validate', () => {
    it('should return valid result when no rules registered', () => {
      const result = orchestrator.validate({});
      
      expect(result.isValid).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.errorCount).toBe(0);
    });

    it('should run all registered rules', () => {
      registry.register(createPassingRule('rule-1', ValidationCategory.WEIGHT));
      registry.register(createPassingRule('rule-2', ValidationCategory.SLOTS));
      registry.register(createPassingRule('rule-3', ValidationCategory.CONSTRUCTION));
      
      const result = orchestrator.validate({});
      
      expect(result.results.length).toBe(3);
      expect(result.isValid).toBe(true);
    });

    it('should mark as invalid when any rule fails', () => {
      registry.register(createPassingRule('pass-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('fail-1', ValidationCategory.WEIGHT));
      registry.register(createPassingRule('pass-2', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
    });

    it('should aggregate error counts', () => {
      registry.register(createFailingRule('fail-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('fail-2', ValidationCategory.SLOTS));
      registry.register(createFailingRule('fail-3', ValidationCategory.CONSTRUCTION));
      
      const result = orchestrator.validate({});
      
      expect(result.errorCount).toBe(3);
      expect(result.isValid).toBe(false);
    });

    it('should aggregate warning counts', () => {
      registry.register(createWarningRule('warn-1', ValidationCategory.WEIGHT));
      registry.register(createWarningRule('warn-2', ValidationCategory.WEIGHT));
      registry.register(createPassingRule('pass-1', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({});
      
      expect(result.warningCount).toBe(2);
      expect(result.isValid).toBe(true);
    });

    it('should skip disabled rules', () => {
      registry.register(createPassingRule('rule-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('rule-2', ValidationCategory.WEIGHT));
      registry.disableRule('rule-2');
      
      const result = orchestrator.validate({});
      
      expect(result.results.length).toBe(1);
      expect(result.isValid).toBe(true);
    });

    it('should respect skipRules option', () => {
      registry.register(createPassingRule('rule-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('rule-2', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({}, { skipRules: ['rule-2'] });
      
      expect(result.results.length).toBe(1);
      expect(result.isValid).toBe(true);
    });

    it('should respect categories option', () => {
      registry.register(createPassingRule('weight-1', ValidationCategory.WEIGHT));
      registry.register(createPassingRule('slots-1', ValidationCategory.SLOTS));
      registry.register(createPassingRule('construction-1', ValidationCategory.CONSTRUCTION));
      
      const result = orchestrator.validate({}, { categories: [ValidationCategory.WEIGHT] });
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].ruleId).toBe('weight-1');
    });

    it('should respect maxErrors option', () => {
      registry.register(createFailingRule('fail-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('fail-2', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('fail-3', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({}, { maxErrors: 2 });
      
      // Should stop after 2 errors
      expect(result.errorCount).toBe(2);
    });

    it('should use canValidate to filter rules', () => {
      registry.register(createConditionalRule('conditional-1', ValidationCategory.WEIGHT));
      
      // Without tonnage, rule should not run
      const result1 = orchestrator.validate({});
      expect(result1.results.length).toBe(0);
      
      // With tonnage, rule should run
      const result2 = orchestrator.validate({ tonnage: 50 });
      expect(result2.results.length).toBe(1);
      expect(result2.isValid).toBe(true);
      
      // With high tonnage, rule should fail
      const result3 = orchestrator.validate({ tonnage: 150 });
      expect(result3.isValid).toBe(false);
    });

    it('should include timestamp', () => {
      const result = orchestrator.validate({});
      expect(result.validatedAt).toBeDefined();
      expect(() => new Date(result.validatedAt)).not.toThrow();
    });

    it('should track execution time', () => {
      registry.register(createPassingRule('rule-1', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({});
      
      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // validateCategory
  // ============================================================================
  describe('validateCategory', () => {
    beforeEach(() => {
      registry.register(createPassingRule('weight-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('weight-2', ValidationCategory.WEIGHT));
      registry.register(createPassingRule('slots-1', ValidationCategory.SLOTS));
      registry.register(createFailingRule('construction-1', ValidationCategory.CONSTRUCTION));
    });

    it('should only run rules in the specified category', () => {
      const result = orchestrator.validateCategory({}, ValidationCategory.SLOTS);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].ruleId).toBe('slots-1');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for category with failing rules', () => {
      const result = orchestrator.validateCategory({}, ValidationCategory.WEIGHT);
      
      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
    });

    it('should return valid for category with no rules', () => {
      const result = orchestrator.validateCategory({}, ValidationCategory.HEAT);
      
      expect(result.isValid).toBe(true);
      expect(result.results).toEqual([]);
    });
  });

  // ============================================================================
  // validateRule
  // ============================================================================
  describe('validateRule', () => {
    beforeEach(() => {
      registry.register(createPassingRule('pass-1', ValidationCategory.WEIGHT));
      registry.register(createFailingRule('fail-1', ValidationCategory.WEIGHT));
      registry.register(createConditionalRule('conditional-1', ValidationCategory.WEIGHT));
    });

    it('should run a single rule by ID', () => {
      const result = orchestrator.validateRule({}, 'pass-1');
      
      expect(result).not.toBeNull();
      expect(result?.ruleId).toBe('pass-1');
      expect(result?.passed).toBe(true);
    });

    it('should return null for unknown rule', () => {
      const result = orchestrator.validateRule({}, 'unknown');
      expect(result).toBeNull();
    });

    it('should return empty result when canValidate returns false', () => {
      const result = orchestrator.validateRule({}, 'conditional-1');
      
      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
      expect(result?.errors).toEqual([]);
    });

    it('should validate when canValidate returns true', () => {
      const result = orchestrator.validateRule({ tonnage: 150 }, 'conditional-1');
      
      expect(result?.passed).toBe(false);
      expect(result?.errors.length).toBe(1);
    });

    it('should track execution time', () => {
      const result = orchestrator.validateRule({}, 'pass-1');
      
      expect(result?.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // getRegistry
  // ============================================================================
  describe('getRegistry', () => {
    it('should return the underlying registry', () => {
      const returned = orchestrator.getRegistry();
      expect(returned).toBe(registry);
    });

    it('should allow modifying rules through registry', () => {
      const returned = orchestrator.getRegistry();
      returned.register(createPassingRule('new-rule', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({});
      expect(result.results.length).toBe(1);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle rule that throws exception', () => {
      const throwingRule: IValidationRuleDefinition = {
        id: 'throwing-rule',
        name: 'Throwing Rule',
        description: 'Throws an exception',
        category: ValidationCategory.WEIGHT,
        validate: () => {
          throw new Error('Intentional error');
        },
      };
      
      registry.register(throwingRule);
      
      const result = orchestrator.validate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.results[0].errors[0].message).toContain('Rule execution failed');
    });

    it('should continue with other rules after one throws', () => {
      const throwingRule: IValidationRuleDefinition = {
        id: 'throwing-rule',
        name: 'Throwing Rule',
        description: 'Throws an exception',
        category: ValidationCategory.WEIGHT,
        priority: 50,
        validate: () => {
          throw new Error('Intentional error');
        },
      };
      
      registry.register(createPassingRule('before', ValidationCategory.WEIGHT));
      registry.register(throwingRule);
      registry.register(createPassingRule('after', ValidationCategory.WEIGHT));
      
      const result = orchestrator.validate({});
      
      expect(result.results.length).toBe(3);
    });
  });

  // ============================================================================
  // Real-World Integration
  // ============================================================================
  describe('Real-World Integration', () => {
    it('should validate a simple mech configuration', () => {
      // Register weight rule
      registry.register({
        id: 'weight.total',
        name: 'Total Weight',
        description: 'Validates total weight',
        category: ValidationCategory.WEIGHT,
        validate: (ctx) => {
          const unit = ctx.unit as { tonnage?: number; totalWeight?: number };
          if (unit.totalWeight && unit.tonnage && unit.totalWeight > unit.tonnage) {
            return {
              ruleId: 'weight.total',
              passed: false,
              errors: [{
                ruleId: 'weight.total',
                ruleName: 'Total Weight',
                severity: ValidationSeverity.ERROR,
                category: ValidationCategory.WEIGHT,
                message: `Weight ${unit.totalWeight} exceeds tonnage ${unit.tonnage}`,
              }],
              warnings: [],
              infos: [],
              executionTime: 0,
            };
          }
          return {
            ruleId: 'weight.total',
            passed: true,
            errors: [],
            warnings: [],
            infos: [],
            executionTime: 0,
          };
        },
      });

      // Valid mech
      const validResult = orchestrator.validate({ tonnage: 50, totalWeight: 49.5 });
      expect(validResult.isValid).toBe(true);

      // Invalid mech
      const invalidResult = orchestrator.validate({ tonnage: 50, totalWeight: 52 });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errorCount).toBe(1);
      expect(invalidResult.results[0].errors[0]?.message).toContain('exceeds tonnage');
    });
  });
});

