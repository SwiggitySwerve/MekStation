/**
 * Unit Validation Registry Tests
 */

import { TechBase, RulesLevel, Era } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitCategory,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  UnitValidationRegistry,
  getUnitValidationRegistry,
} from '../UnitValidationRegistry';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestRuleResult(
  ruleId: string,
  passed: boolean,
  message?: string,
): IUnitValidationRuleResult {
  return {
    ruleId,
    ruleName: `Test Rule ${ruleId}`,
    passed,
    errors: passed
      ? []
      : [
          {
            ruleId,
            ruleName: `Test Rule ${ruleId}`,
            severity: UnitValidationSeverity.ERROR,
            category: ValidationCategory.WEIGHT,
            message: message || 'Test error',
            field: 'test',
          },
        ],
    warnings: [],
    infos: [],
    executionTime: 1,
  };
}

function createTestContext(
  overrides: Partial<IUnitValidationContext> = {},
): IUnitValidationContext {
  return {
    unit: {
      id: 'test-unit-1',
      name: 'Test Unit',
      unitType: UnitType.BATTLEMECH,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      introductionYear: 3025,
      era: Era.LATE_SUCCESSION_WARS,
      weight: 50,
      cost: 5000000,
      battleValue: 1000,
    },
    unitType: UnitType.BATTLEMECH,
    unitCategory: UnitCategory.MECH,
    techBase: TechBase.INNER_SPHERE,
    options: {},
    cache: new Map(),
    ...overrides,
  };
}

function createTestRule(
  id: string,
  overrides: Partial<IUnitValidationRuleDefinition> = {},
): IUnitValidationRuleDefinition {
  return {
    id,
    name: `Test Rule ${id}`,
    description: `Test rule for ${id}`,
    category: ValidationCategory.WEIGHT,
    priority: 100,
    validate: () => createTestRuleResult(id, true),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('UnitValidationRegistry', () => {
  let registry: UnitValidationRegistry;

  beforeEach(() => {
    registry = new UnitValidationRegistry();
  });

  // ===========================================================================
  // Rule Registration
  // ===========================================================================

  describe('registerUniversalRule', () => {
    it('should register a universal rule', () => {
      const rule = createTestRule('VAL-UNIV-TEST-001');

      registry.registerUniversalRule(rule);

      const retrieved = registry.getRule('VAL-UNIV-TEST-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('VAL-UNIV-TEST-001');
    });

    it('should make universal rule available for all unit types', () => {
      const rule = createTestRule('VAL-UNIV-TEST-002');
      registry.registerUniversalRule(rule);

      const mechRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const vehicleRules = registry.getRulesForUnitType(UnitType.VEHICLE);

      expect(mechRules.some((r) => r.id === 'VAL-UNIV-TEST-002')).toBe(true);
      expect(vehicleRules.some((r) => r.id === 'VAL-UNIV-TEST-002')).toBe(true);
    });
  });

  describe('registerCategoryRule', () => {
    it('should register a category rule', () => {
      const rule = createTestRule('VAL-MECH-TEST-001');

      registry.registerCategoryRule(UnitCategory.MECH, rule);

      const categoryRules = registry.getCategoryRules(UnitCategory.MECH);
      expect(categoryRules.some((r) => r.id === 'VAL-MECH-TEST-001')).toBe(
        true,
      );
    });

    it('should make category rule available for unit types in that category', () => {
      const rule = createTestRule('VAL-MECH-TEST-002');
      registry.registerCategoryRule(UnitCategory.MECH, rule);

      const mechRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const vehicleRules = registry.getRulesForUnitType(UnitType.VEHICLE);

      expect(mechRules.some((r) => r.id === 'VAL-MECH-TEST-002')).toBe(true);
      // Vehicles are not in MECH category
      expect(vehicleRules.some((r) => r.id === 'VAL-MECH-TEST-002')).toBe(
        false,
      );
    });
  });

  describe('registerUnitTypeRule', () => {
    it('should register a unit-type-specific rule', () => {
      const rule = createTestRule('VAL-BM-TEST-001');

      registry.registerUnitTypeRule(UnitType.BATTLEMECH, rule);

      const unitTypeRules = registry.getUnitTypeRules(UnitType.BATTLEMECH);
      expect(unitTypeRules.some((r) => r.id === 'VAL-BM-TEST-001')).toBe(true);
    });

    it('should only make rule available for specific unit type', () => {
      const rule = createTestRule('VAL-BM-TEST-002');
      registry.registerUnitTypeRule(UnitType.BATTLEMECH, rule);

      const mechRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const omniRules = registry.getRulesForUnitType(UnitType.OMNIMECH);

      expect(mechRules.some((r) => r.id === 'VAL-BM-TEST-002')).toBe(true);
      expect(omniRules.some((r) => r.id === 'VAL-BM-TEST-002')).toBe(false);
    });
  });

  // ===========================================================================
  // Rule Retrieval
  // ===========================================================================

  describe('getRule', () => {
    it('should return rule by ID', () => {
      const rule = createTestRule('VAL-TEST-001');
      registry.registerUniversalRule(rule);

      const retrieved = registry.getRule('VAL-TEST-001');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Rule VAL-TEST-001');
    });

    it('should return undefined for unknown rule', () => {
      const retrieved = registry.getRule('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getRulesForUnitType', () => {
    it('should return all applicable rules for unit type', () => {
      registry.registerUniversalRule(createTestRule('UNIV-001'));
      registry.registerCategoryRule(
        UnitCategory.MECH,
        createTestRule('MECH-001'),
      );
      registry.registerUnitTypeRule(
        UnitType.BATTLEMECH,
        createTestRule('BM-001'),
      );

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      expect(rules.length).toBe(3);
      expect(rules.map((r) => r.id).sort()).toEqual([
        'BM-001',
        'MECH-001',
        'UNIV-001',
      ]);
    });

    it('should sort rules by priority', () => {
      registry.registerUniversalRule(createTestRule('LOW', { priority: 300 }));
      registry.registerUniversalRule(createTestRule('HIGH', { priority: 50 }));
      registry.registerUniversalRule(createTestRule('MED', { priority: 150 }));

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      expect(rules[0].id).toBe('HIGH');
      expect(rules[1].id).toBe('MED');
      expect(rules[2].id).toBe('LOW');
    });

    it('should cache resolved rules', () => {
      registry.registerUniversalRule(createTestRule('CACHE-TEST'));

      const rules1 = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const rules2 = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      // Should return same array (cached)
      expect(rules1).toBe(rules2);
    });
  });

  describe('getUniversalRules', () => {
    it('should return all universal rules', () => {
      registry.registerUniversalRule(createTestRule('UNIV-001'));
      registry.registerUniversalRule(createTestRule('UNIV-002'));
      registry.registerCategoryRule(
        UnitCategory.MECH,
        createTestRule('MECH-001'),
      );

      const universalRules = registry.getUniversalRules();

      expect(universalRules.length).toBe(2);
    });
  });

  describe('getCategoryRules', () => {
    it('should return rules for specific category', () => {
      registry.registerCategoryRule(
        UnitCategory.MECH,
        createTestRule('MECH-001'),
      );
      registry.registerCategoryRule(
        UnitCategory.VEHICLE,
        createTestRule('VEH-001'),
      );

      const mechRules = registry.getCategoryRules(UnitCategory.MECH);
      const vehicleRules = registry.getCategoryRules(UnitCategory.VEHICLE);

      expect(mechRules.length).toBe(1);
      expect(mechRules[0].id).toBe('MECH-001');
      expect(vehicleRules.length).toBe(1);
      expect(vehicleRules[0].id).toBe('VEH-001');
    });
  });

  // ===========================================================================
  // Rule Unregistration
  // ===========================================================================

  describe('unregister', () => {
    it('should remove universal rule', () => {
      registry.registerUniversalRule(createTestRule('TO-REMOVE'));

      registry.unregister('TO-REMOVE');

      expect(registry.getRule('TO-REMOVE')).toBeUndefined();
    });

    it('should remove category rule', () => {
      registry.registerCategoryRule(
        UnitCategory.MECH,
        createTestRule('TO-REMOVE'),
      );

      registry.unregister('TO-REMOVE');

      expect(registry.getRule('TO-REMOVE')).toBeUndefined();
      expect(registry.getCategoryRules(UnitCategory.MECH).length).toBe(0);
    });

    it('should invalidate cache after unregister', () => {
      registry.registerUniversalRule(createTestRule('CACHED'));

      const rules1 = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      expect(rules1.length).toBe(1);

      registry.unregister('CACHED');

      const rules2 = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      expect(rules2.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all rules', () => {
      registry.registerUniversalRule(createTestRule('UNIV-001'));
      registry.registerCategoryRule(
        UnitCategory.MECH,
        createTestRule('MECH-001'),
      );
      registry.registerUnitTypeRule(
        UnitType.BATTLEMECH,
        createTestRule('BM-001'),
      );

      registry.clear();

      expect(registry.getUniversalRules().length).toBe(0);
      expect(registry.getCategoryRules(UnitCategory.MECH).length).toBe(0);
      expect(registry.getUnitTypeRules(UnitType.BATTLEMECH).length).toBe(0);
    });
  });

  // ===========================================================================
  // Rule Enable/Disable
  // ===========================================================================

  describe('enableRule / disableRule', () => {
    it('should disable rule from execution', () => {
      const rule = createTestRule('TOGGLE-001', {
        validate: () =>
          createTestRuleResult(
            'TOGGLE-001',
            false,
            'Should not run when disabled',
          ),
      });
      registry.registerUniversalRule(rule);

      registry.disableRule('TOGGLE-001');

      const registeredRule = registry.getRule('TOGGLE-001');
      const context = createTestContext();

      // canValidate should return false for disabled rule
      expect(registeredRule?.canValidate(context)).toBe(false);
    });

    it('should re-enable disabled rule', () => {
      registry.registerUniversalRule(createTestRule('TOGGLE-002'));

      registry.disableRule('TOGGLE-002');
      registry.enableRule('TOGGLE-002');

      const registeredRule = registry.getRule('TOGGLE-002');
      const context = createTestContext();

      expect(registeredRule?.canValidate(context)).toBe(true);
    });
  });

  // ===========================================================================
  // Rule Inheritance
  // ===========================================================================

  describe('rule inheritance', () => {
    it('should handle rule override', () => {
      // Register base universal rule
      registry.registerUniversalRule(
        createTestRule('OVERRIDE-TARGET', {
          validate: () =>
            createTestRuleResult('OVERRIDE-TARGET', false, 'Base rule'),
        }),
      );

      // Register overriding unit-type rule
      registry.registerUnitTypeRule(
        UnitType.BATTLEMECH,
        createTestRule('BM-OVERRIDE', {
          overrides: 'OVERRIDE-TARGET',
          validate: () =>
            createTestRuleResult('BM-OVERRIDE', true, 'Override rule'),
        }),
      );

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const baseRule = rules.find((r) => r.id === 'OVERRIDE-TARGET');
      const overrideRule = rules.find((r) => r.id === 'BM-OVERRIDE');

      // Override rule should be present
      expect(overrideRule).toBeDefined();
      // Base rule should be removed due to override
      expect(baseRule).toBeUndefined();
    });

    it('should handle rule extension by chaining', () => {
      // Track which rules were executed
      const executionLog: string[] = [];

      // Register base category rule
      registry.registerCategoryRule(
        UnitCategory.MECH,
        createTestRule('EXTEND-TARGET', {
          priority: 100,
          validate: () => {
            executionLog.push('base');
            return createTestRuleResult('EXTEND-TARGET', true);
          },
        }),
      );

      // Register extending unit-type rule
      registry.registerUnitTypeRule(
        UnitType.BATTLEMECH,
        createTestRule('BM-EXTEND', {
          extends: 'EXTEND-TARGET',
          priority: 101,
          validate: () => {
            executionLog.push('extend');
            return createTestRuleResult('BM-EXTEND', true);
          },
        }),
      );

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const baseRule = rules.find((r) => r.id === 'EXTEND-TARGET');

      // Base rule should be present (chained with extension)
      expect(baseRule).toBeDefined();

      // Execute the chained rule to verify both run
      const context = createTestContext();
      baseRule!.validate(context);

      // Both base and extend rules should have executed
      expect(executionLog).toContain('base');
      expect(executionLog).toContain('extend');
    });
  });
});

// =============================================================================
// Singleton Tests
// =============================================================================

describe('getUnitValidationRegistry', () => {
  it('should return singleton instance', () => {
    const registry1 = getUnitValidationRegistry();
    const registry2 = getUnitValidationRegistry();

    expect(registry1).toBe(registry2);
  });
});
