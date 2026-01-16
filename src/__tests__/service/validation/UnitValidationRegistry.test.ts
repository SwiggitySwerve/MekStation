/**
 * Unit tests for UnitValidationRegistry
 * 
 * Tests the hierarchical registry for unit validation rules including
 * registration, retrieval, inheritance, and caching.
 */

import {
  UnitValidationRegistry,
  getUnitValidationRegistry,
  resetUnitValidationRegistry,
} from '@/services/validation/UnitValidationRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  UnitCategory,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  createUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';

describe('UnitValidationRegistry', () => {
  let registry: UnitValidationRegistry;

  // Helper to create a mock rule definition
  const createMockRule = (
    id: string,
    options: Partial<IUnitValidationRuleDefinition> = {}
  ): IUnitValidationRuleDefinition => ({
    id,
    name: `Test Rule ${id}`,
    description: `Description for ${id}`,
    category: ValidationCategory.CONSTRUCTION,
    priority: options.priority ?? 50,
    applicableUnitTypes: options.applicableUnitTypes,
    overrides: options.overrides,
    extends: options.extends,
    canValidate: options.canValidate,
    validate: () => createUnitValidationRuleResult(id, `Test Rule ${id}`, [], [], [], 0),
  });

  // Helper to create a mock validation context
  const createMockContext = (unitType: UnitType): IUnitValidationContext => ({
    unit: {
      id: 'test-unit',
      name: 'Test Unit',
      unitType,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      introductionYear: 3025,
      era: Era.LATE_SUCCESSION_WARS,
      weight: 50,
      cost: 1000000,
      battleValue: 1000,
    },
    unitType,
    unitCategory: UnitCategory.MECH,
    techBase: TechBase.INNER_SPHERE,
    options: {},
    cache: new Map(),
  });

  beforeEach(() => {
    resetUnitValidationRegistry();
    registry = new UnitValidationRegistry();
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getUnitValidationRegistry();
      const instance2 = getUnitValidationRegistry();
      expect(instance1).toBe(instance2);
    });

    it('should reset to a new instance', () => {
      const instance1 = getUnitValidationRegistry();
      resetUnitValidationRegistry();
      const instance2 = getUnitValidationRegistry();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Universal Rules', () => {
    it('should register and retrieve universal rules', () => {
      const rule = createMockRule('VAL-UNIV-TEST');
      registry.registerUniversalRule(rule);

      const universalRules = registry.getUniversalRules();
      expect(universalRules).toHaveLength(1);
      expect(universalRules[0].id).toBe('VAL-UNIV-TEST');
    });

    it('should apply universal rules to all unit types', () => {
      const rule = createMockRule('VAL-UNIV-TEST');
      registry.registerUniversalRule(rule);

      // Check that the rule appears for different unit types
      const mechRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const vehicleRules = registry.getRulesForUnitType(UnitType.VEHICLE);
      const aeroRules = registry.getRulesForUnitType(UnitType.AEROSPACE);

      expect(mechRules.some(r => r.id === 'VAL-UNIV-TEST')).toBe(true);
      expect(vehicleRules.some(r => r.id === 'VAL-UNIV-TEST')).toBe(true);
      expect(aeroRules.some(r => r.id === 'VAL-UNIV-TEST')).toBe(true);
    });
  });

  describe('Category Rules', () => {
    it('should register and retrieve category rules', () => {
      const rule = createMockRule('VAL-MECH-TEST', {
        applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],
      });
      registry.registerCategoryRule(UnitCategory.MECH, rule);

      const mechRules = registry.getCategoryRules(UnitCategory.MECH);
      expect(mechRules).toHaveLength(1);
      expect(mechRules[0].id).toBe('VAL-MECH-TEST');
    });

    it('should only apply category rules to appropriate unit types', () => {
      const rule = createMockRule('VAL-MECH-TEST', {
        applicableUnitTypes: [UnitType.BATTLEMECH],
      });
      registry.registerCategoryRule(UnitCategory.MECH, rule);

      const mechRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const vehicleRules = registry.getRulesForUnitType(UnitType.VEHICLE);

      expect(mechRules.some(r => r.id === 'VAL-MECH-TEST')).toBe(true);
      expect(vehicleRules.some(r => r.id === 'VAL-MECH-TEST')).toBe(false);
    });
  });

  describe('Unit Type Rules', () => {
    it('should register and retrieve unit-type-specific rules', () => {
      const rule = createMockRule('VAL-BM-TEST');
      registry.registerUnitTypeRule(UnitType.BATTLEMECH, rule);

      const unitTypeRules = registry.getUnitTypeRules(UnitType.BATTLEMECH);
      expect(unitTypeRules).toHaveLength(1);
      expect(unitTypeRules[0].id).toBe('VAL-BM-TEST');
    });

    it('should only apply unit-type rules to that specific type', () => {
      const rule = createMockRule('VAL-BM-TEST');
      registry.registerUnitTypeRule(UnitType.BATTLEMECH, rule);

      const bmRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const omRules = registry.getRulesForUnitType(UnitType.OMNIMECH);

      expect(bmRules.some(r => r.id === 'VAL-BM-TEST')).toBe(true);
      expect(omRules.some(r => r.id === 'VAL-BM-TEST')).toBe(false);
    });
  });

  describe('Rule Lookup', () => {
    it('should get a specific rule by ID', () => {
      const rule = createMockRule('VAL-TEST-001');
      registry.registerUniversalRule(rule);

      const found = registry.getRule('VAL-TEST-001');
      expect(found).toBeDefined();
      expect(found?.id).toBe('VAL-TEST-001');
    });

    it('should return undefined for unknown rule ID', () => {
      const found = registry.getRule('UNKNOWN');
      expect(found).toBeUndefined();
    });
  });

  describe('Rule Unregistration', () => {
    it('should unregister a rule by ID', () => {
      const rule = createMockRule('VAL-TEST-001');
      registry.registerUniversalRule(rule);

      expect(registry.getRule('VAL-TEST-001')).toBeDefined();

      registry.unregister('VAL-TEST-001');

      expect(registry.getRule('VAL-TEST-001')).toBeUndefined();
      expect(registry.getUniversalRules()).toHaveLength(0);
    });

    it('should unregister category rules', () => {
      const rule = createMockRule('VAL-MECH-001');
      registry.registerCategoryRule(UnitCategory.MECH, rule);

      registry.unregister('VAL-MECH-001');

      expect(registry.getCategoryRules(UnitCategory.MECH)).toHaveLength(0);
    });

    it('should unregister unit-type rules', () => {
      const rule = createMockRule('VAL-BM-001');
      registry.registerUnitTypeRule(UnitType.BATTLEMECH, rule);

      registry.unregister('VAL-BM-001');

      expect(registry.getUnitTypeRules(UnitType.BATTLEMECH)).toHaveLength(0);
    });
  });

  describe('Enable/Disable Rules', () => {
    it('should disable a rule', () => {
      const rule = createMockRule('VAL-TEST-001');
      registry.registerUniversalRule(rule);

      registry.disableRule('VAL-TEST-001');

      const foundRule = registry.getRule('VAL-TEST-001');
      expect(foundRule?.isEnabled).toBe(false);
    });

    it('should enable a disabled rule', () => {
      const rule = createMockRule('VAL-TEST-001');
      registry.registerUniversalRule(rule);

      registry.disableRule('VAL-TEST-001');
      registry.enableRule('VAL-TEST-001');

      const foundRule = registry.getRule('VAL-TEST-001');
      expect(foundRule?.isEnabled).toBe(true);
    });

    it('should not validate disabled rules', () => {
      const rule = createMockRule('VAL-TEST-001');
      registry.registerUniversalRule(rule);
      registry.disableRule('VAL-TEST-001');

      const foundRule = registry.getRule('VAL-TEST-001');
      const context = createMockContext(UnitType.BATTLEMECH);
      
      expect(foundRule?.canValidate(context)).toBe(false);
    });
  });

  describe('Clear', () => {
    it('should clear all rules', () => {
      registry.registerUniversalRule(createMockRule('VAL-UNIV-001'));
      registry.registerCategoryRule(UnitCategory.MECH, createMockRule('VAL-MECH-001'));
      registry.registerUnitTypeRule(UnitType.BATTLEMECH, createMockRule('VAL-BM-001'));

      registry.clear();

      expect(registry.getUniversalRules()).toHaveLength(0);
      expect(registry.getCategoryRules(UnitCategory.MECH)).toHaveLength(0);
      expect(registry.getUnitTypeRules(UnitType.BATTLEMECH)).toHaveLength(0);
    });
  });

  describe('Priority Sorting', () => {
    it('should return rules sorted by priority', () => {
      registry.registerUniversalRule(createMockRule('VAL-LOW', { priority: 100 }));
      registry.registerUniversalRule(createMockRule('VAL-HIGH', { priority: 10 }));
      registry.registerUniversalRule(createMockRule('VAL-MED', { priority: 50 }));

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      expect(rules[0].id).toBe('VAL-HIGH');
      expect(rules[1].id).toBe('VAL-MED');
      expect(rules[2].id).toBe('VAL-LOW');
    });
  });

  describe('Rule Inheritance - Override', () => {
    it('should allow a rule to override another', () => {
      const baseRule = createMockRule('VAL-BASE', { priority: 10 });
      const overridingRule = createMockRule('VAL-OVERRIDE', {
        priority: 20,
        overrides: 'VAL-BASE',
      });

      registry.registerUniversalRule(baseRule);
      registry.registerCategoryRule(UnitCategory.MECH, overridingRule);

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      // The overriding rule should have removed the base rule
      expect(rules.some(r => r.id === 'VAL-BASE')).toBe(false);
      expect(rules.some(r => r.id === 'VAL-OVERRIDE')).toBe(true);
    });
  });

  describe('Rule Inheritance - Extend', () => {
    it('should allow a rule to extend another', () => {
      let baseExecuted = false;
      let extendExecuted = false;

      const baseRule: IUnitValidationRuleDefinition = {
        ...createMockRule('VAL-BASE', { priority: 10 }),
        validate: () => {
          baseExecuted = true;
          return createUnitValidationRuleResult('VAL-BASE', 'Base', [], [], [], 0);
        },
      };

      const extendingRule: IUnitValidationRuleDefinition = {
        ...createMockRule('VAL-EXTEND', { priority: 20, extends: 'VAL-BASE' }),
        validate: () => {
          extendExecuted = true;
          return createUnitValidationRuleResult('VAL-EXTEND', 'Extend', [], [], [], 0);
        },
      };

      registry.registerUniversalRule(baseRule);
      registry.registerCategoryRule(UnitCategory.MECH, extendingRule);

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      const context = createMockContext(UnitType.BATTLEMECH);

      // Find the chained rule (it should use the base rule's ID)
      const chainedRule = rules.find(r => r.id === 'VAL-BASE');
      expect(chainedRule).toBeDefined();

      // Execute the chained rule
      chainedRule?.validate(context);

      // Both should have executed
      expect(baseExecuted).toBe(true);
      expect(extendExecuted).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache resolved rules', () => {
      registry.registerUniversalRule(createMockRule('VAL-TEST'));

      // First call
      const rules1 = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      // Second call should return cached
      const rules2 = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      expect(rules1).toBe(rules2); // Same array reference
    });

    it('should clear cache when rules change', () => {
      registry.registerUniversalRule(createMockRule('VAL-TEST-1'));

      const rules1 = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      expect(rules1).toHaveLength(1);

      registry.registerUniversalRule(createMockRule('VAL-TEST-2'));

      const rules2 = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      expect(rules2).toHaveLength(2);
      expect(rules1).not.toBe(rules2); // Different reference due to cache clear
    });
  });

  describe('canValidate', () => {
    it('should respect applicableUnitTypes for category rules', () => {
      const rule = createMockRule('VAL-MECH-ONLY', {
        applicableUnitTypes: [UnitType.BATTLEMECH],
      });
      // Register as category rule (not universal) to preserve applicableUnitTypes
      registry.registerCategoryRule(UnitCategory.MECH, rule);

      const foundRule = registry.getRule('VAL-MECH-ONLY');
      const mechContext = createMockContext(UnitType.BATTLEMECH);
      const omniContext = createMockContext(UnitType.OMNIMECH);

      expect(foundRule?.canValidate(mechContext)).toBe(true);
      // OmniMech is also in MECH category but rule is only for BATTLEMECH
      expect(foundRule?.canValidate(omniContext)).toBe(false);
    });

    it('should respect custom canValidate function', () => {
      const rule = createMockRule('VAL-CUSTOM', {
        canValidate: (context) => context.unit.weight >= 50,
      });
      registry.registerUniversalRule(rule);

      const foundRule = registry.getRule('VAL-CUSTOM');
      const heavyContext = createMockContext(UnitType.BATTLEMECH);
      
      const lightContext: IUnitValidationContext = {
        ...createMockContext(UnitType.BATTLEMECH),
        unit: { ...createMockContext(UnitType.BATTLEMECH).unit, weight: 20 },
      };

      expect(foundRule?.canValidate(heavyContext)).toBe(true);
      expect(foundRule?.canValidate(lightContext)).toBe(false);
    });
  });
});
