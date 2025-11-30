/**
 * Validation Rule Registry Tests
 * 
 * Tests for validation rule registration and management.
 * 
 * @spec openspec/specs/validation-rules-master/spec.md
 */

import {
  createValidationRuleRegistry,
  getDefaultValidationRuleRegistry,
  resetDefaultValidationRuleRegistry,
} from '@/utils/validation/rules/ValidationRuleRegistry';
import {
  IValidationRuleDefinition,
  IValidationRuleRegistry,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

/**
 * Create a simple test rule
 */
function createTestRule(id: string, category: ValidationCategory, priority?: number): IValidationRuleDefinition {
  return {
    id,
    name: `Test Rule ${id}`,
    description: `Description for ${id}`,
    category,
    priority,
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
 * Create a failing test rule
 */
function createFailingRule(id: string, category: ValidationCategory): IValidationRuleDefinition {
  return {
    id,
    name: `Failing Rule ${id}`,
    description: `Failing rule ${id}`,
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

describe('ValidationRuleRegistry', () => {
  let registry: IValidationRuleRegistry;

  beforeEach(() => {
    registry = createValidationRuleRegistry();
  });

  // ============================================================================
  // register
  // ============================================================================
  describe('register', () => {
    it('should register a valid rule', () => {
      const rule = createTestRule('test-1', ValidationCategory.WEIGHT);
      expect(() => registry.register(rule)).not.toThrow();
    });

    it('should throw for duplicate rule ID', () => {
      const rule = createTestRule('test-1', ValidationCategory.WEIGHT);
      registry.register(rule);
      expect(() => registry.register(rule)).toThrow("Rule with ID 'test-1' is already registered");
    });

    it('should register multiple rules with different IDs', () => {
      registry.register(createTestRule('rule-1', ValidationCategory.WEIGHT));
      registry.register(createTestRule('rule-2', ValidationCategory.SLOTS));
      registry.register(createTestRule('rule-3', ValidationCategory.CONSTRUCTION));
      
      expect(registry.getAllRules().length).toBe(3);
    });
  });

  // ============================================================================
  // unregister
  // ============================================================================
  describe('unregister', () => {
    it('should remove a registered rule', () => {
      const rule = createTestRule('test-1', ValidationCategory.WEIGHT);
      registry.register(rule);
      expect(registry.getRule('test-1')).toBeDefined();
      
      registry.unregister('test-1');
      expect(registry.getRule('test-1')).toBeUndefined();
    });

    it('should not throw for non-existent rule', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  // ============================================================================
  // getRule
  // ============================================================================
  describe('getRule', () => {
    it('should return registered rule', () => {
      const rule = createTestRule('test-1', ValidationCategory.WEIGHT);
      registry.register(rule);
      
      const retrieved = registry.getRule('test-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-1');
      expect(retrieved?.name).toBe('Test Rule test-1');
    });

    it('should return undefined for unknown rule', () => {
      expect(registry.getRule('unknown')).toBeUndefined();
    });

    it('should reflect enabled/disabled state', () => {
      const rule = createTestRule('test-1', ValidationCategory.WEIGHT);
      registry.register(rule);
      
      expect(registry.getRule('test-1')?.isEnabled).toBe(true);
      
      registry.disableRule('test-1');
      expect(registry.getRule('test-1')?.isEnabled).toBe(false);
      
      registry.enableRule('test-1');
      expect(registry.getRule('test-1')?.isEnabled).toBe(true);
    });
  });

  // ============================================================================
  // getAllRules
  // ============================================================================
  describe('getAllRules', () => {
    it('should return empty array initially', () => {
      expect(registry.getAllRules()).toEqual([]);
    });

    it('should return all registered rules', () => {
      registry.register(createTestRule('rule-1', ValidationCategory.WEIGHT));
      registry.register(createTestRule('rule-2', ValidationCategory.SLOTS));
      
      const rules = registry.getAllRules();
      expect(rules.length).toBe(2);
      expect(rules.map(r => r.id)).toContain('rule-1');
      expect(rules.map(r => r.id)).toContain('rule-2');
    });

    it('should sort rules by priority', () => {
      registry.register(createTestRule('rule-c', ValidationCategory.WEIGHT, 300));
      registry.register(createTestRule('rule-a', ValidationCategory.WEIGHT, 100));
      registry.register(createTestRule('rule-b', ValidationCategory.WEIGHT, 200));
      
      const rules = registry.getAllRules();
      expect(rules[0].id).toBe('rule-a');
      expect(rules[1].id).toBe('rule-b');
      expect(rules[2].id).toBe('rule-c');
    });

    it('should use default priority (100) when not specified', () => {
      registry.register(createTestRule('rule-a', ValidationCategory.WEIGHT, 50));
      registry.register(createTestRule('rule-b', ValidationCategory.WEIGHT)); // Default 100
      registry.register(createTestRule('rule-c', ValidationCategory.WEIGHT, 150));
      
      const rules = registry.getAllRules();
      expect(rules[0].id).toBe('rule-a');
      expect(rules[1].id).toBe('rule-b');
      expect(rules[2].id).toBe('rule-c');
    });
  });

  // ============================================================================
  // getRulesByCategory
  // ============================================================================
  describe('getRulesByCategory', () => {
    beforeEach(() => {
      registry.register(createTestRule('weight-1', ValidationCategory.WEIGHT));
      registry.register(createTestRule('weight-2', ValidationCategory.WEIGHT));
      registry.register(createTestRule('slots-1', ValidationCategory.SLOTS));
      registry.register(createTestRule('construction-1', ValidationCategory.CONSTRUCTION));
    });

    it('should filter by category', () => {
      const weightRules = registry.getRulesByCategory(ValidationCategory.WEIGHT);
      expect(weightRules.length).toBe(2);
      expect(weightRules.every(r => r.category === ValidationCategory.WEIGHT)).toBe(true);
    });

    it('should return empty array for category with no rules', () => {
      const heatRules = registry.getRulesByCategory(ValidationCategory.HEAT);
      expect(heatRules).toEqual([]);
    });

    it('should also sort by priority', () => {
      registry.clear();
      registry.register(createTestRule('weight-b', ValidationCategory.WEIGHT, 200));
      registry.register(createTestRule('weight-a', ValidationCategory.WEIGHT, 100));
      
      const rules = registry.getRulesByCategory(ValidationCategory.WEIGHT);
      expect(rules[0].id).toBe('weight-a');
      expect(rules[1].id).toBe('weight-b');
    });
  });

  // ============================================================================
  // enableRule / disableRule
  // ============================================================================
  describe('enableRule / disableRule', () => {
    beforeEach(() => {
      registry.register(createTestRule('test-1', ValidationCategory.WEIGHT));
    });

    it('should disable a rule', () => {
      registry.disableRule('test-1');
      expect(registry.getRule('test-1')?.isEnabled).toBe(false);
    });

    it('should enable a disabled rule', () => {
      registry.disableRule('test-1');
      registry.enableRule('test-1');
      expect(registry.getRule('test-1')?.isEnabled).toBe(true);
    });

    it('should not throw for non-existent rule', () => {
      expect(() => registry.disableRule('unknown')).not.toThrow();
      expect(() => registry.enableRule('unknown')).not.toThrow();
    });

    it('should reflect in getAllRules', () => {
      registry.disableRule('test-1');
      const rules = registry.getAllRules();
      expect(rules.find(r => r.id === 'test-1')?.isEnabled).toBe(false);
    });
  });

  // ============================================================================
  // clear
  // ============================================================================
  describe('clear', () => {
    it('should remove all rules', () => {
      registry.register(createTestRule('rule-1', ValidationCategory.WEIGHT));
      registry.register(createTestRule('rule-2', ValidationCategory.SLOTS));
      registry.register(createTestRule('rule-3', ValidationCategory.CONSTRUCTION));
      
      expect(registry.getAllRules().length).toBe(3);
      
      registry.clear();
      expect(registry.getAllRules()).toEqual([]);
    });
  });

  // ============================================================================
  // Default Registry
  // ============================================================================
  describe('Default Registry', () => {
    beforeEach(() => {
      resetDefaultValidationRuleRegistry();
    });

    it('should return a singleton instance', () => {
      const first = getDefaultValidationRuleRegistry();
      const second = getDefaultValidationRuleRegistry();
      expect(first).toBe(second);
    });

    it('should reset to a new instance', () => {
      const first = getDefaultValidationRuleRegistry();
      first.register(createTestRule('test-1', ValidationCategory.WEIGHT));
      
      resetDefaultValidationRuleRegistry();
      
      const second = getDefaultValidationRuleRegistry();
      expect(second.getAllRules()).toEqual([]);
    });
  });

  // ============================================================================
  // Rule Validation (validate method)
  // ============================================================================
  describe('Rule Validation', () => {
    it('should create a rule that can validate', () => {
      registry.register(createTestRule('test-1', ValidationCategory.WEIGHT));
      
      const rule = registry.getRule('test-1');
      const context = { unit: {}, options: {}, cache: new Map() };
      const result = rule?.validate(context);
      
      expect(result?.passed).toBe(true);
      expect(result?.errors).toEqual([]);
    });

    it('should create a failing rule correctly', () => {
      registry.register(createFailingRule('fail-1', ValidationCategory.WEIGHT));
      
      const rule = registry.getRule('fail-1');
      const context = { unit: {}, options: {}, cache: new Map() };
      const result = rule?.validate(context);
      
      expect(result?.passed).toBe(false);
      expect(result?.errors.length).toBe(1);
      expect(result?.errors[0].message).toBe('Test error');
    });

    it('should use canValidate when provided', () => {
      const rule: IValidationRuleDefinition = {
        ...createTestRule('test-1', ValidationCategory.WEIGHT),
        canValidate: (ctx) => {
          const unit = ctx.unit as { tonnage?: number };
          return unit.tonnage !== undefined;
        },
      };
      
      registry.register(rule);
      const registeredRule = registry.getRule('test-1');
      
      expect(registeredRule?.canValidate({ unit: {}, options: {}, cache: new Map() })).toBe(false);
      expect(registeredRule?.canValidate({ unit: { tonnage: 50 }, options: {}, cache: new Map() })).toBe(true);
    });
  });
});

