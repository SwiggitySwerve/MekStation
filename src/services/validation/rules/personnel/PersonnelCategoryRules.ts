/**
 * Personnel Category Validation Rules
 *
 * Rules that apply to Personnel category units (Infantry, BattleArmor).
 * VAL-PERS-001 through VAL-PERS-003.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  IValidatableUnit,
} from '../../../../types/validation/UnitValidationInterfaces';

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
  category: ValidationCategory.CONSTRUCTION,
  priority: 50,
  applicableUnitTypes: [UnitType.INFANTRY, UnitType.BATTLE_ARMOR],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isPersonnelUnit(unit)) {
      if (
        unit.squadSize === undefined ||
        !Number.isInteger(unit.squadSize) ||
        unit.squadSize <= 0
      ) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            'Squad/platoon size must be positive integer',
            {
              field: 'squadSize',
              expected: '> 0 (integer)',
              actual: String(unit.squadSize),
              suggestion: 'Set a valid positive integer squad size',
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

/**
 * VAL-PERS-002: Battle Armor Weight Range
 */
export const BattleArmorWeightRange: IUnitValidationRuleDefinition = {
  id: 'VAL-PERS-002',
  name: 'Battle Armor Weight Range',
  description: 'Battle armor weight must be 0.4-2.0 tons per trooper',
  category: ValidationCategory.WEIGHT,
  priority: 51,
  applicableUnitTypes: [UnitType.BATTLE_ARMOR],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (unit.unitType === UnitType.BATTLE_ARMOR && isPersonnelUnit(unit)) {
      const trooperWeight = unit.trooperWeight ?? unit.weight;

      if (
        trooperWeight < BATTLE_ARMOR_WEIGHT.min ||
        trooperWeight > BATTLE_ARMOR_WEIGHT.max
      ) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `Battle armor weight must be ${BATTLE_ARMOR_WEIGHT.min}-${BATTLE_ARMOR_WEIGHT.max} tons per trooper`,
            {
              field: 'trooperWeight',
              expected: `${BATTLE_ARMOR_WEIGHT.min}-${BATTLE_ARMOR_WEIGHT.max}`,
              actual: String(trooperWeight),
              suggestion: `Adjust trooper weight to be within ${BATTLE_ARMOR_WEIGHT.min}-${BATTLE_ARMOR_WEIGHT.max} tons`,
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

/**
 * VAL-PERS-003: Infantry Primary Weapon Required
 */
export const InfantryPrimaryWeaponRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-PERS-003',
  name: 'Infantry Primary Weapon Required',
  description: 'Infantry units should have primary weapon type defined',
  category: ValidationCategory.EQUIPMENT,
  priority: 52,
  applicableUnitTypes: [UnitType.INFANTRY],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const warnings = [];

    if (unit.unitType === UnitType.INFANTRY && isPersonnelUnit(unit)) {
      if (!unit.primaryWeapon) {
        warnings.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.WARNING,
            this.category,
            'Infantry unit has no primary weapon defined',
            {
              field: 'primaryWeapon',
              suggestion: 'Define a primary weapon type for the infantry unit',
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      [],
      warnings,
      [],
      0,
    );
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
