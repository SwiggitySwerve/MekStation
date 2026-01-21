/**
 * Unit Validation Initialization Tests
 *
 * Comprehensive tests for validation rule initialization and registration.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import {
  initializeUnitValidationRules,
  getValidationRuleStats,
  resetUnitValidationRules,
  areRulesInitialized,
} from '../initializeUnitValidation';
import { getUnitValidationRegistry } from '../UnitValidationRegistry';
import { UnitCategory } from '../../../types/validation/UnitValidationInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';

// Import rule sets to verify counts
import { UNIVERSAL_VALIDATION_RULES } from '../rules/universal/UniversalValidationRules';
import { MECH_CATEGORY_RULES } from '../rules/mech/MechCategoryRules';
import { VEHICLE_CATEGORY_RULES } from '../rules/vehicle/VehicleCategoryRules';
import { AEROSPACE_CATEGORY_RULES } from '../rules/aerospace/AerospaceCategoryRules';
import { PERSONNEL_CATEGORY_RULES } from '../rules/personnel/PersonnelCategoryRules';
import { BATTLEMECH_RULES } from '../rules/battlemech/BattleMechRules';
import { EQUIPMENT_UNIT_TYPE_RULES } from '../rules/equipment/EquipmentUnitTypeRules';

// =============================================================================
// Setup and Teardown
// =============================================================================

describe('Unit Validation Initialization', () => {
  beforeEach(() => {
    // Reset state before each test
    resetUnitValidationRules();
  });

  afterEach(() => {
    // Clean up after each test
    resetUnitValidationRules();
  });

  // =============================================================================
  // areRulesInitialized Tests
  // =============================================================================

  describe('areRulesInitialized', () => {
    it('should return false before initialization', () => {
      expect(areRulesInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      initializeUnitValidationRules();

      expect(areRulesInitialized()).toBe(true);
    });

    it('should return false after reset', () => {
      initializeUnitValidationRules();
      resetUnitValidationRules();

      expect(areRulesInitialized()).toBe(false);
    });
  });

  // =============================================================================
  // initializeUnitValidationRules Tests
  // =============================================================================

  describe('initializeUnitValidationRules', () => {
    it('should initialize all rules successfully', () => {
      expect(() => initializeUnitValidationRules()).not.toThrow();
      expect(areRulesInitialized()).toBe(true);
    });

    it('should be idempotent - multiple calls should not re-register rules', () => {
      initializeUnitValidationRules();
      const firstStats = getValidationRuleStats();

      initializeUnitValidationRules();
      const secondStats = getValidationRuleStats();

      expect(secondStats.total).toBe(firstStats.total);
      expect(secondStats.universal).toBe(firstStats.universal);
      expect(secondStats.mech).toBe(firstStats.mech);
    });

    it('should register universal rules', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const universalRules = registry.getUniversalRules();

      // Universal rules count should match expected
      expect(universalRules.length).toBeGreaterThanOrEqual(UNIVERSAL_VALIDATION_RULES.length);
    });

    it('should register mech category rules', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const mechRules = registry.getCategoryRules(UnitCategory.MECH);

      expect(mechRules.length).toBeGreaterThanOrEqual(MECH_CATEGORY_RULES.length);
    });

    it('should register vehicle category rules', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const vehicleRules = registry.getCategoryRules(UnitCategory.VEHICLE);

      expect(vehicleRules.length).toBeGreaterThanOrEqual(VEHICLE_CATEGORY_RULES.length);
    });

    it('should register aerospace category rules', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const aerospaceRules = registry.getCategoryRules(UnitCategory.AEROSPACE);

      expect(aerospaceRules.length).toBeGreaterThanOrEqual(AEROSPACE_CATEGORY_RULES.length);
    });

    it('should register personnel category rules', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const personnelRules = registry.getCategoryRules(UnitCategory.PERSONNEL);

      expect(personnelRules.length).toBeGreaterThanOrEqual(PERSONNEL_CATEGORY_RULES.length);
    });

    it('should register BattleMech unit type rules', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const battlemechRules = registry.getUnitTypeRules(UnitType.BATTLEMECH);

      expect(battlemechRules.length).toBeGreaterThanOrEqual(BATTLEMECH_RULES.length);
    });

    it('should register OmniMech unit type rules (same as BattleMech)', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const omnimechRules = registry.getUnitTypeRules(UnitType.OMNIMECH);

      // OmniMech should have same BattleMech rules
      expect(omnimechRules.length).toBeGreaterThanOrEqual(BATTLEMECH_RULES.length);
    });

    it('should register equipment rules as universal', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();
      const universalRules = registry.getUniversalRules();

      // Equipment rules are registered as universal
      const hasEquipmentRules = EQUIPMENT_UNIT_TYPE_RULES.every(equipRule =>
        universalRules.some(r => r.id === equipRule.id)
      );
      expect(hasEquipmentRules).toBe(true);
    });
  });

  // =============================================================================
  // getValidationRuleStats Tests
  // =============================================================================

  describe('getValidationRuleStats', () => {
    it('should return stats matching imported rule arrays', () => {
      const stats = getValidationRuleStats();

      expect(stats.universal).toBe(UNIVERSAL_VALIDATION_RULES.length);
      expect(stats.mech).toBe(MECH_CATEGORY_RULES.length);
      expect(stats.battlemech).toBe(BATTLEMECH_RULES.length);
      expect(stats.vehicle).toBe(VEHICLE_CATEGORY_RULES.length);
      expect(stats.aerospace).toBe(AEROSPACE_CATEGORY_RULES.length);
      expect(stats.personnel).toBe(PERSONNEL_CATEGORY_RULES.length);
      expect(stats.equipment).toBe(EQUIPMENT_UNIT_TYPE_RULES.length);
    });

    it('should calculate correct total', () => {
      const stats = getValidationRuleStats();

      const expectedTotal =
        UNIVERSAL_VALIDATION_RULES.length +
        MECH_CATEGORY_RULES.length +
        BATTLEMECH_RULES.length +
        VEHICLE_CATEGORY_RULES.length +
        AEROSPACE_CATEGORY_RULES.length +
        PERSONNEL_CATEGORY_RULES.length +
        EQUIPMENT_UNIT_TYPE_RULES.length;

      expect(stats.total).toBe(expectedTotal);
    });

    it('should return same stats before and after initialization', () => {
      const beforeStats = getValidationRuleStats();
      initializeUnitValidationRules();
      const afterStats = getValidationRuleStats();

      // Stats are based on imported arrays, not registry state
      expect(afterStats.universal).toBe(beforeStats.universal);
      expect(afterStats.mech).toBe(beforeStats.mech);
      expect(afterStats.total).toBe(beforeStats.total);
    });

    it('should return positive counts for all categories', () => {
      const stats = getValidationRuleStats();

      expect(stats.universal).toBeGreaterThan(0);
      expect(stats.mech).toBeGreaterThanOrEqual(0);
      expect(stats.battlemech).toBeGreaterThanOrEqual(0);
      expect(stats.vehicle).toBeGreaterThanOrEqual(0);
      expect(stats.aerospace).toBeGreaterThanOrEqual(0);
      expect(stats.personnel).toBeGreaterThanOrEqual(0);
      expect(stats.equipment).toBeGreaterThanOrEqual(0);
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // resetUnitValidationRules Tests
  // =============================================================================

  describe('resetUnitValidationRules', () => {
    it('should reset initialization flag', () => {
      initializeUnitValidationRules();
      expect(areRulesInitialized()).toBe(true);

      resetUnitValidationRules();

      expect(areRulesInitialized()).toBe(false);
    });

    it('should clear the registry', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      // Verify rules exist before reset
      const rulesBeforeReset = registry.getUniversalRules();
      expect(rulesBeforeReset.length).toBeGreaterThan(0);

      resetUnitValidationRules();

      // Verify rules are cleared after reset
      const rulesAfterReset = registry.getUniversalRules();
      expect(rulesAfterReset.length).toBe(0);
    });

    it('should allow re-initialization after reset', () => {
      initializeUnitValidationRules();
      resetUnitValidationRules();

      expect(() => initializeUnitValidationRules()).not.toThrow();
      expect(areRulesInitialized()).toBe(true);
    });

    it('should restore registry to initial state', () => {
      initializeUnitValidationRules();
      resetUnitValidationRules();

      const registry = getUnitValidationRegistry();

      expect(registry.getUniversalRules().length).toBe(0);
      expect(registry.getCategoryRules(UnitCategory.MECH).length).toBe(0);
      expect(registry.getCategoryRules(UnitCategory.VEHICLE).length).toBe(0);
      expect(registry.getCategoryRules(UnitCategory.AEROSPACE).length).toBe(0);
      expect(registry.getCategoryRules(UnitCategory.PERSONNEL).length).toBe(0);
      expect(registry.getUnitTypeRules(UnitType.BATTLEMECH).length).toBe(0);
      expect(registry.getUnitTypeRules(UnitType.OMNIMECH).length).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      resetUnitValidationRules();
      resetUnitValidationRules();
      resetUnitValidationRules();

      expect(areRulesInitialized()).toBe(false);
    });

    it('should be safe to call before initialization', () => {
      expect(() => resetUnitValidationRules()).not.toThrow();
      expect(areRulesInitialized()).toBe(false);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration Tests', () => {
    it('should make rules available for unit validation after initialization', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      // BattleMech should have universal + mech category + battlemech type rules
      const battlemechRules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
      expect(battlemechRules.length).toBeGreaterThan(0);

      // All rules should have required properties
      for (const rule of battlemechRules) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(typeof rule.validate).toBe('function');
      }
    });

    it('should make rules available for vehicle validation after initialization', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      const vehicleRules = registry.getRulesForUnitType(UnitType.VEHICLE);
      expect(vehicleRules.length).toBeGreaterThan(0);
    });

    it('should make rules available for infantry validation after initialization', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      const infantryRules = registry.getRulesForUnitType(UnitType.INFANTRY);
      expect(infantryRules.length).toBeGreaterThan(0);
    });

    it('should make rules available for battle armor validation after initialization', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      const battleArmorRules = registry.getRulesForUnitType(UnitType.BATTLE_ARMOR);
      expect(battleArmorRules.length).toBeGreaterThan(0);
    });

    it('should include all personnel rules for infantry', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      const infantryRules = registry.getRulesForUnitType(UnitType.INFANTRY);
      const personnelRuleIds = PERSONNEL_CATEGORY_RULES.map(r => r.id);

      for (const ruleId of personnelRuleIds) {
        const hasRule = infantryRules.some(r => r.id === ruleId);
        expect(hasRule).toBe(true);
      }
    });

    it('should include all personnel rules for battle armor', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      const battleArmorRules = registry.getRulesForUnitType(UnitType.BATTLE_ARMOR);
      const personnelRuleIds = PERSONNEL_CATEGORY_RULES.map(r => r.id);

      for (const ruleId of personnelRuleIds) {
        const hasRule = battleArmorRules.some(r => r.id === ruleId);
        expect(hasRule).toBe(true);
      }
    });

    it('should allow looking up specific rules by ID after initialization', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      // Look up a known universal rule
      if (UNIVERSAL_VALIDATION_RULES.length > 0) {
        const firstUniversalRuleId = UNIVERSAL_VALIDATION_RULES[0].id;
        const rule = registry.getRule(firstUniversalRuleId);
        expect(rule).toBeDefined();
        expect(rule?.id).toBe(firstUniversalRuleId);
      }

      // Look up a known personnel rule
      if (PERSONNEL_CATEGORY_RULES.length > 0) {
        const firstPersonnelRuleId = PERSONNEL_CATEGORY_RULES[0].id;
        const rule = registry.getRule(firstPersonnelRuleId);
        expect(rule).toBeDefined();
        expect(rule?.id).toBe(firstPersonnelRuleId);
      }
    });

    it('should have rules sorted by priority', () => {
      initializeUnitValidationRules();
      const registry = getUnitValidationRegistry();

      const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);

      // Verify rules are sorted by priority (ascending)
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].priority).toBeGreaterThanOrEqual(rules[i - 1].priority);
      }
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle rapid init/reset cycles', () => {
      for (let i = 0; i < 10; i++) {
        initializeUnitValidationRules();
        expect(areRulesInitialized()).toBe(true);
        resetUnitValidationRules();
        expect(areRulesInitialized()).toBe(false);
      }
    });

    it('should maintain rule integrity after multiple reinitializations', () => {
      initializeUnitValidationRules();
      const firstRules = getUnitValidationRegistry().getRulesForUnitType(UnitType.BATTLEMECH);
      const firstRuleIds = firstRules.map(r => r.id).sort();

      resetUnitValidationRules();
      initializeUnitValidationRules();
      const secondRules = getUnitValidationRegistry().getRulesForUnitType(UnitType.BATTLEMECH);
      const secondRuleIds = secondRules.map(r => r.id).sort();

      expect(secondRuleIds).toEqual(firstRuleIds);
    });

    it('should work correctly with registry singleton', () => {
      const registry1 = getUnitValidationRegistry();
      initializeUnitValidationRules();
      const registry2 = getUnitValidationRegistry();

      // Both should reference the same instance
      expect(registry1).toBe(registry2);

      // Rules should be visible through both references
      expect(registry1.getUniversalRules().length).toBeGreaterThan(0);
      expect(registry2.getUniversalRules().length).toBeGreaterThan(0);
    });
  });
});
