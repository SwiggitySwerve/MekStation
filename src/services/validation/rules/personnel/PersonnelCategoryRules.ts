/**
 * Personnel Category Validation Rules
 *
 * Rules that apply to Personnel category units (Infantry, BattleArmor).
 * VAL-PERS-001 through VAL-PERS-003.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationError,
  IValidatableUnit,
} from '@/types/validation/UnitValidationInterfaces';

import { createRuleResult, addRuleDiagnostic } from '../ruleResults';

const PERSONNEL_CATEGORY_RULES_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;
const PERSONNEL_CATEGORY_RULES_WEIGHT_CATEGORY = ValidationCategory.WEIGHT;
const PERSONNEL_CATEGORY_RULES_EQUIPMENT_CATEGORY =
  ValidationCategory.EQUIPMENT;

/**
 * Extended personnel unit interface for personnel-specific validation
 */
interface IPersonnelUnit extends IValidatableUnit {
  squadSize?: number;
  primaryWeapon?: { type: string };
  trooperWeight?: number;
}

/**
 * Type guard for personnel units
 */
function isPersonnelUnit(unit: IValidatableUnit): unit is IPersonnelUnit {
  return (
    unit.unitType === UnitType.INFANTRY ||
    unit.unitType === UnitType.BATTLE_ARMOR
  );
}

/**
 * Battle Armor weight constraints (per trooper)
 */
const BATTLE_ARMOR_WEIGHT = {
  min: 0.4,
  max: 2.0,
};

/**
 * VAL-PERS-001: Squad Size Valid
 */
export const PersonnelSquadSizeValid: IUnitValidationRuleDefinition = {
  id: 'VAL-PERS-001',
  name: 'Squad Size Valid',
  description: 'Squad/platoon size must be positive integer',
  category: PERSONNEL_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 50,
  applicableUnitTypes: [UnitType.INFANTRY, UnitType.BATTLE_ARMOR],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isPersonnelUnit(unit)) {
      if (
        unit.squadSize === undefined ||
        !Number.isInteger(unit.squadSize) ||
        unit.squadSize <= 0
      ) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          'Squad/platoon size must be positive integer',
          {
            field: 'squadSize',
            expected: '> 0 (integer)',
            actual: String(unit.squadSize),
            suggestion: 'Set a valid positive integer squad size',
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-PERS-002: Battle Armor Weight Range
 */
export const BattleArmorWeightRange: IUnitValidationRuleDefinition = {
  id: 'VAL-PERS-002',
  name: 'Battle Armor Weight Range',
  description: 'Battle armor weight must be 0.4-2.0 tons per trooper',
  category: PERSONNEL_CATEGORY_RULES_WEIGHT_CATEGORY,
  priority: 51,
  applicableUnitTypes: [UnitType.BATTLE_ARMOR],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (unit.unitType === UnitType.BATTLE_ARMOR && isPersonnelUnit(unit)) {
      const trooperWeight = unit.trooperWeight ?? unit.weight;

      if (
        trooperWeight < BATTLE_ARMOR_WEIGHT.min ||
        trooperWeight > BATTLE_ARMOR_WEIGHT.max
      ) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.CRITICAL_ERROR,
          `Battle armor weight must be ${BATTLE_ARMOR_WEIGHT.min}-${BATTLE_ARMOR_WEIGHT.max} tons per trooper`,
          {
            field: 'trooperWeight',
            expected: `${BATTLE_ARMOR_WEIGHT.min}-${BATTLE_ARMOR_WEIGHT.max}`,
            actual: String(trooperWeight),
            suggestion: `Adjust trooper weight to be within ${BATTLE_ARMOR_WEIGHT.min}-${BATTLE_ARMOR_WEIGHT.max} tons`,
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-PERS-003: Infantry Primary Weapon Required
 */
export const InfantryPrimaryWeaponRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-PERS-003',
  name: 'Infantry Primary Weapon Required',
  description: 'Infantry units should have primary weapon type defined',
  category: PERSONNEL_CATEGORY_RULES_EQUIPMENT_CATEGORY,
  priority: 52,
  applicableUnitTypes: [UnitType.INFANTRY],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const warnings: IUnitValidationError[] = [];

    if (unit.unitType === UnitType.INFANTRY && isPersonnelUnit(unit)) {
      if (!unit.primaryWeapon) {
        addRuleDiagnostic(
          warnings,
          this,
          UnitValidationSeverity.WARNING,
          'Infantry unit has no primary weapon defined',
          {
            field: 'primaryWeapon',
            suggestion: 'Define a primary weapon type for the infantry unit',
          },
        );
      }
    }

    return createRuleResult(this, { warnings });
  },
};

/**
 * All personnel category validation rules
 */
export const PERSONNEL_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    PersonnelSquadSizeValid,
    BattleArmorWeightRange,
    InfantryPrimaryWeaponRequired,
  ];
