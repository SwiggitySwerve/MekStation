/**
 * Personnel Category Validation Rules Tests
 *
 * Comprehensive tests for personnel validation rules (Infantry, Battle Armor).
 * Tests VAL-PERS-001 through VAL-PERS-003.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { TechBase, RulesLevel, Era } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IValidatableUnit,
  IUnitValidationContext,
  UnitCategory,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  PersonnelSquadSizeValid,
  BattleArmorWeightRange,
  InfantryPrimaryWeaponRequired,
  PERSONNEL_CATEGORY_RULES,
} from '../PersonnelCategoryRules';

// =============================================================================
// Test Helpers
// =============================================================================

interface IPersonnelTestUnit extends IValidatableUnit {
  squadSize?: number;
  primaryWeapon?: { type: string };
  trooperWeight?: number;
}

function createInfantryUnit(
  overrides: Partial<IPersonnelTestUnit> = {},
): IPersonnelTestUnit {
  return {
    id: 'test-infantry-1',
    name: 'Test Infantry Platoon',
    unitType: UnitType.INFANTRY,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 2750,
    era: Era.STAR_LEAGUE,
    weight: 0,
    cost: 50000,
    battleValue: 50,
    squadSize: 21,
    primaryWeapon: { type: 'Rifle' },
    ...overrides,
  };
}

function createBattleArmorUnit(
  overrides: Partial<IPersonnelTestUnit> = {},
): IPersonnelTestUnit {
  return {
    id: 'test-ba-1',
    name: 'Test Battle Armor Squad',
    unitType: UnitType.BATTLE_ARMOR,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 2868,
    era: Era.CLAN_INVASION,
    weight: 1.0,
    cost: 500000,
    battleValue: 250,
    squadSize: 5,
    trooperWeight: 1.0,
    primaryWeapon: { type: 'Small Laser' },
    ...overrides,
  };
}

function createTestContext(
  unit: IValidatableUnit,
  category: UnitCategory = UnitCategory.PERSONNEL,
): IUnitValidationContext {
  return {
    unit,
    unitType: unit.unitType,
    unitCategory: category,
    techBase: unit.techBase,
    options: {},
    cache: new Map(),
  };
}

// =============================================================================
// PERSONNEL_CATEGORY_RULES Export Tests
// =============================================================================

describe('Personnel Category Rules', () => {
  describe('PERSONNEL_CATEGORY_RULES export', () => {
    it('should export all personnel rules', () => {
      expect(PERSONNEL_CATEGORY_RULES).toBeDefined();
      expect(PERSONNEL_CATEGORY_RULES.length).toBe(3);
    });

    it('should contain all expected rule IDs', () => {
      const ruleIds = PERSONNEL_CATEGORY_RULES.map((r) => r.id);
      expect(ruleIds).toContain('VAL-PERS-001');
      expect(ruleIds).toContain('VAL-PERS-002');
      expect(ruleIds).toContain('VAL-PERS-003');
    });

    it('should have rules in correct order', () => {
      expect(PERSONNEL_CATEGORY_RULES[0].id).toBe('VAL-PERS-001');
      expect(PERSONNEL_CATEGORY_RULES[1].id).toBe('VAL-PERS-002');
      expect(PERSONNEL_CATEGORY_RULES[2].id).toBe('VAL-PERS-003');
    });

    it('should have all rules with required metadata', () => {
      for (const rule of PERSONNEL_CATEGORY_RULES) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.priority).toBeDefined();
        expect(typeof rule.validate).toBe('function');
      }
    });
  });

  // =============================================================================
  // VAL-PERS-001: Squad Size Valid
  // =============================================================================

  describe('VAL-PERS-001: Squad Size Valid', () => {
    describe('metadata', () => {
      it('should have correct rule metadata', () => {
        expect(PersonnelSquadSizeValid.id).toBe('VAL-PERS-001');
        expect(PersonnelSquadSizeValid.name).toBe('Squad Size Valid');
        expect(PersonnelSquadSizeValid.priority).toBe(50);
      });

      it('should apply to Infantry and Battle Armor', () => {
        expect(PersonnelSquadSizeValid.applicableUnitTypes).toContain(
          UnitType.INFANTRY,
        );
        expect(PersonnelSquadSizeValid.applicableUnitTypes).toContain(
          UnitType.BATTLE_ARMOR,
        );
      });

      it('should have a description', () => {
        expect(PersonnelSquadSizeValid.description).toContain('Squad');
        expect(PersonnelSquadSizeValid.description).toContain(
          'positive integer',
        );
      });
    });

    describe('with Infantry unit', () => {
      it('should pass with valid squad size', () => {
        const unit = createInfantryUnit({ squadSize: 21 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass with squad size of 1', () => {
        const unit = createInfantryUnit({ squadSize: 1 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass with large squad size', () => {
        const unit = createInfantryUnit({ squadSize: 100 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail with squad size of 0', () => {
        const unit = createInfantryUnit({ squadSize: 0 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.ERROR);
        expect(result.errors[0].field).toBe('squadSize');
        expect(result.errors[0].message).toContain('positive integer');
      });

      it('should fail with negative squad size', () => {
        const unit = createInfantryUnit({ squadSize: -5 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].actual).toBe('-5');
      });

      it('should fail with undefined squad size', () => {
        const unit = createInfantryUnit({ squadSize: undefined });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].actual).toBe('undefined');
      });

      it('should fail with non-integer squad size', () => {
        const unit = createInfantryUnit({ squadSize: 5.5 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('positive integer');
      });

      it('should include suggestion in error details', () => {
        const unit = createInfantryUnit({ squadSize: -1 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.errors[0].suggestion).toContain('valid positive integer');
      });
    });

    describe('with Battle Armor unit', () => {
      it('should pass with valid squad size', () => {
        const unit = createBattleArmorUnit({ squadSize: 5 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass with squad size of 4 (Clan)', () => {
        const unit = createBattleArmorUnit({ squadSize: 4 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass with squad size of 6 (IS)', () => {
        const unit = createBattleArmorUnit({
          squadSize: 6,
          techBase: TechBase.INNER_SPHERE,
        });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail with squad size of 0', () => {
        const unit = createBattleArmorUnit({ squadSize: 0 });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });

      it('should fail with undefined squad size', () => {
        const unit = createBattleArmorUnit({ squadSize: undefined });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(false);
      });
    });

    describe('with non-personnel unit types', () => {
      it('should pass for BattleMech (not a personnel type)', () => {
        const unit = createInfantryUnit({
          unitType: UnitType.BATTLEMECH,
          squadSize: undefined,
        });
        const context = createTestContext(unit, UnitCategory.MECH);
        const result = PersonnelSquadSizeValid.validate(context);

        // Should pass because isPersonnelUnit returns false
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass for Vehicle (not a personnel type)', () => {
        const unit = createInfantryUnit({
          unitType: UnitType.VEHICLE,
          squadSize: undefined,
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });
  });

  // =============================================================================
  // VAL-PERS-002: Battle Armor Weight Range
  // =============================================================================

  describe('VAL-PERS-002: Battle Armor Weight Range', () => {
    describe('metadata', () => {
      it('should have correct rule metadata', () => {
        expect(BattleArmorWeightRange.id).toBe('VAL-PERS-002');
        expect(BattleArmorWeightRange.name).toBe('Battle Armor Weight Range');
        expect(BattleArmorWeightRange.priority).toBe(51);
      });

      it('should apply only to Battle Armor', () => {
        expect(BattleArmorWeightRange.applicableUnitTypes).toEqual([
          UnitType.BATTLE_ARMOR,
        ]);
      });

      it('should have a description mentioning weight range', () => {
        expect(BattleArmorWeightRange.description).toContain('0.4');
        expect(BattleArmorWeightRange.description).toContain('2.0');
      });
    });

    describe('with Battle Armor unit', () => {
      it('should pass at minimum weight (0.4 tons)', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 0.4 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass at maximum weight (2.0 tons)', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 2.0 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass at mid-range weight (1.0 ton)', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 1.0 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass at typical light weight (0.5 tons)', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 0.5 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass at typical heavy weight (1.5 tons)', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 1.5 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail below minimum weight', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 0.3 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(
          UnitValidationSeverity.CRITICAL_ERROR,
        );
        expect(result.errors[0].field).toBe('trooperWeight');
        expect(result.errors[0].message).toContain('0.4-2');
      });

      it('should fail above maximum weight', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 2.5 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].actual).toBe('2.5');
        expect(result.errors[0].expected).toBe('0.4-2');
      });

      it('should use unit.weight as fallback when trooperWeight is undefined', () => {
        const unit = createBattleArmorUnit({
          trooperWeight: undefined,
          weight: 1.5,
        });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail when using fallback weight that is out of range', () => {
        const unit = createBattleArmorUnit({
          trooperWeight: undefined,
          weight: 3.0,
        });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors[0].actual).toBe('3');
      });

      it('should include suggestion in error details', () => {
        const unit = createBattleArmorUnit({ trooperWeight: 0.2 });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.errors[0].suggestion).toContain('Adjust trooper weight');
        expect(result.errors[0].suggestion).toContain('0.4-2');
      });
    });

    describe('with non-Battle Armor unit types', () => {
      it('should pass for Infantry (not Battle Armor)', () => {
        const unit = createInfantryUnit({
          trooperWeight: 0.1, // Would be invalid for BA
        });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        // Should pass because unit type is Infantry, not Battle Armor
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass for BattleMech (not Battle Armor)', () => {
        const unit = createBattleArmorUnit({
          unitType: UnitType.BATTLEMECH,
          trooperWeight: 50, // Would be invalid for BA
        });
        const context = createTestContext(unit, UnitCategory.MECH);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
      });
    });
  });

  // =============================================================================
  // VAL-PERS-003: Infantry Primary Weapon Required
  // =============================================================================

  describe('VAL-PERS-003: Infantry Primary Weapon Required', () => {
    describe('metadata', () => {
      it('should have correct rule metadata', () => {
        expect(InfantryPrimaryWeaponRequired.id).toBe('VAL-PERS-003');
        expect(InfantryPrimaryWeaponRequired.name).toBe(
          'Infantry Primary Weapon Required',
        );
        expect(InfantryPrimaryWeaponRequired.priority).toBe(52);
      });

      it('should apply only to Infantry', () => {
        expect(InfantryPrimaryWeaponRequired.applicableUnitTypes).toEqual([
          UnitType.INFANTRY,
        ]);
      });

      it('should have a description mentioning primary weapon', () => {
        expect(InfantryPrimaryWeaponRequired.description).toContain(
          'primary weapon',
        );
      });
    });

    describe('with Infantry unit', () => {
      it('should pass when primary weapon is defined', () => {
        const unit = createInfantryUnit({ primaryWeapon: { type: 'Rifle' } });
        const context = createTestContext(unit);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.warnings.length).toBe(0);
      });

      it('should pass with various weapon types', () => {
        const weaponTypes = [
          { type: 'Rifle' },
          { type: 'Laser' },
          { type: 'MG' },
          { type: 'Flamer' },
          { type: 'SRM' },
        ];

        for (const weapon of weaponTypes) {
          const unit = createInfantryUnit({ primaryWeapon: weapon });
          const context = createTestContext(unit);
          const result = InfantryPrimaryWeaponRequired.validate(context);

          expect(result.passed).toBe(true);
        }
      });

      it('should generate warning when primary weapon is undefined', () => {
        const unit = createInfantryUnit({ primaryWeapon: undefined });
        const context = createTestContext(unit);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        // This rule generates a warning, not an error
        expect(result.passed).toBe(true); // Warnings don't fail validation
        expect(result.errors.length).toBe(0);
        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0].severity).toBe(
          UnitValidationSeverity.WARNING,
        );
        expect(result.warnings[0].field).toBe('primaryWeapon');
      });

      it('should include suggestion in warning details', () => {
        const unit = createInfantryUnit({ primaryWeapon: undefined });
        const context = createTestContext(unit);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        expect(result.warnings[0].suggestion).toContain(
          'Define a primary weapon',
        );
      });

      it('should have warning message about missing weapon', () => {
        const unit = createInfantryUnit({ primaryWeapon: undefined });
        const context = createTestContext(unit);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        expect(result.warnings[0].message).toContain('no primary weapon');
      });
    });

    describe('with non-Infantry unit types', () => {
      it('should pass for Battle Armor without primary weapon', () => {
        const unit = createBattleArmorUnit({ primaryWeapon: undefined });
        const context = createTestContext(unit);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        // Should pass because unit type is Battle Armor, not Infantry
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.warnings.length).toBe(0);
      });

      it('should pass for BattleMech', () => {
        const unit = createInfantryUnit({
          unitType: UnitType.BATTLEMECH,
          primaryWeapon: undefined,
        });
        const context = createTestContext(unit, UnitCategory.MECH);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(0);
      });

      it('should pass for Vehicle', () => {
        const unit = createInfantryUnit({
          unitType: UnitType.VEHICLE,
          primaryWeapon: undefined,
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = InfantryPrimaryWeaponRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(0);
      });
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration Tests', () => {
    it('should validate a fully valid Infantry unit', () => {
      const unit = createInfantryUnit({
        squadSize: 21,
        primaryWeapon: { type: 'Rifle' },
      });
      const context = createTestContext(unit);

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });

    it('should validate a fully valid Battle Armor unit', () => {
      const unit = createBattleArmorUnit({
        squadSize: 5,
        trooperWeight: 1.0,
        primaryWeapon: { type: 'Small Laser' },
      });
      const context = createTestContext(unit);

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });

    it('should catch multiple validation failures on Infantry', () => {
      const unit = createInfantryUnit({
        squadSize: 0, // Invalid
        primaryWeapon: undefined, // Warning
      });
      const context = createTestContext(unit);

      const allErrors: string[] = [];
      const allWarnings: string[] = [];

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        for (const error of result.errors) {
          allErrors.push(error.ruleId);
        }
        for (const warning of result.warnings) {
          allWarnings.push(warning.ruleId);
        }
      }

      expect(allErrors).toContain('VAL-PERS-001'); // Squad size
      expect(allWarnings).toContain('VAL-PERS-003'); // Primary weapon
    });

    it('should catch multiple validation failures on Battle Armor', () => {
      const unit = createBattleArmorUnit({
        squadSize: -1, // Invalid
        trooperWeight: 3.0, // Invalid - over max
      });
      const context = createTestContext(unit);

      const failedRules: string[] = [];
      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        if (!result.passed) {
          failedRules.push(rule.id);
        }
      }

      expect(failedRules).toContain('VAL-PERS-001'); // Squad size
      expect(failedRules).toContain('VAL-PERS-002'); // Weight range
    });

    it('should work with minimal valid Infantry', () => {
      const unit = createInfantryUnit({
        squadSize: 1,
        primaryWeapon: { type: 'Rifle' },
      });
      const context = createTestContext(unit);

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(0);
      }
    });

    it('should work with minimal valid Battle Armor', () => {
      const unit = createBattleArmorUnit({
        squadSize: 1,
        trooperWeight: 0.4, // Minimum
      });
      const context = createTestContext(unit);

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });

    it('should work with maximum valid Battle Armor', () => {
      const unit = createBattleArmorUnit({
        squadSize: 10,
        trooperWeight: 2.0, // Maximum
      });
      const context = createTestContext(unit);

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle boundary values for squad size', () => {
      const boundaryValues = [1, 2, 10, 100, 1000];

      for (const size of boundaryValues) {
        const unit = createInfantryUnit({ squadSize: size });
        const context = createTestContext(unit);
        const result = PersonnelSquadSizeValid.validate(context);

        expect(result.passed).toBe(true);
      }
    });

    it('should handle boundary values for trooper weight', () => {
      const validWeights = [0.4, 0.5, 1.0, 1.5, 2.0];
      const invalidWeights = [0.39, 0.3, 0.0, 2.01, 2.5, 3.0];

      for (const weight of validWeights) {
        const unit = createBattleArmorUnit({ trooperWeight: weight });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(true);
      }

      for (const weight of invalidWeights) {
        const unit = createBattleArmorUnit({ trooperWeight: weight });
        const context = createTestContext(unit);
        const result = BattleArmorWeightRange.validate(context);

        expect(result.passed).toBe(false);
      }
    });

    it('should handle IS vs Clan Battle Armor equally', () => {
      const isUnit = createBattleArmorUnit({
        techBase: TechBase.INNER_SPHERE,
        trooperWeight: 1.5,
        squadSize: 4,
      });
      const clanUnit = createBattleArmorUnit({
        techBase: TechBase.CLAN,
        trooperWeight: 1.5,
        squadSize: 5,
      });

      const isContext = createTestContext(isUnit);
      const clanContext = createTestContext(clanUnit);

      for (const rule of PERSONNEL_CATEGORY_RULES) {
        const isResult = rule.validate(isContext);
        const clanResult = rule.validate(clanContext);

        expect(isResult.passed).toBe(true);
        expect(clanResult.passed).toBe(true);
      }
    });

    it('should produce consistent error details', () => {
      const unit = createBattleArmorUnit({ trooperWeight: 5.0 });
      const context = createTestContext(unit);
      const result = BattleArmorWeightRange.validate(context);

      const error = result.errors[0];
      expect(error.ruleId).toBe('VAL-PERS-002');
      expect(error.ruleName).toBe('Battle Armor Weight Range');
      expect(error.severity).toBeDefined();
      expect(error.category).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.field).toBeDefined();
      expect(error.expected).toBeDefined();
      expect(error.actual).toBeDefined();
      expect(error.suggestion).toBeDefined();
    });
  });
});
