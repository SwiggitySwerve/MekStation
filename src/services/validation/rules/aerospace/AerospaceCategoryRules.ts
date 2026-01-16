/**
 * Aerospace Category Validation Rules
 *
 * Rules that apply to Aerospace category units.
 * VAL-AERO-001 through VAL-AERO-004.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  IValidatableUnit,
} from '../../../../types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';

/**
 * Extended aerospace unit interface for aerospace-specific validation
 */
interface IAerospaceUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  thrust?: number;
  structuralIntegrity?: number;
  fuelCapacity?: number;
}

/**
 * All aerospace unit types
 */
const AEROSPACE_UNIT_TYPES: readonly UnitType[] = [
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.SMALL_CRAFT,
  UnitType.DROPSHIP,
  UnitType.JUMPSHIP,
  UnitType.WARSHIP,
  UnitType.SPACE_STATION,
];

/**
 * Unit types that require thrust rating
 */
const THRUST_REQUIRED_TYPES: readonly UnitType[] = [
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
];

/**
 * Type guard for aerospace units
 */
function isAerospaceUnit(unit: IValidatableUnit): unit is IAerospaceUnit {
  return AEROSPACE_UNIT_TYPES.includes(unit.unitType);
}

/**
 * VAL-AERO-001: Engine Required
 */
export const AeroEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-001',
  name: 'Engine Required',
  description: 'All Aerospace category units must have an engine',
  category: ValidationCategory.CONSTRUCTION,
  priority: 40,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit) && !unit.engine) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Engine required',
          {
            field: 'engine',
            suggestion: 'Select an engine for the aerospace unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-AERO-002: Thrust Rating Valid
 */
export const AeroThrustRatingValid: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-002',
  name: 'Thrust Rating Valid',
  description: 'Aerospace fighters must have valid thrust rating',
  category: ValidationCategory.MOVEMENT,
  priority: 41,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit) && THRUST_REQUIRED_TYPES.includes(unit.unitType)) {
      if (unit.thrust === undefined || !Number.isInteger(unit.thrust) || unit.thrust <= 0) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            'Thrust rating must be positive integer',
            {
              field: 'thrust',
              expected: '> 0 (integer)',
              actual: String(unit.thrust),
              suggestion: 'Set a valid positive integer thrust rating',
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-AERO-003: Structural Integrity Required
 */
export const AeroStructuralIntegrityRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-003',
  name: 'Structural Integrity Required',
  description: 'Aerospace units must have positive structural integrity',
  category: ValidationCategory.CONSTRUCTION,
  priority: 42,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit)) {
      if (unit.structuralIntegrity === undefined || unit.structuralIntegrity <= 0) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            'Structural integrity must be positive',
            {
              field: 'structuralIntegrity',
              expected: '> 0',
              actual: String(unit.structuralIntegrity),
              suggestion: 'Set a valid positive structural integrity value',
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-AERO-004: Fuel Capacity Valid
 */
export const AeroFuelCapacityValid: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-004',
  name: 'Fuel Capacity Valid',
  description: 'Aerospace units must have non-negative fuel capacity',
  category: ValidationCategory.CONSTRUCTION,
  priority: 43,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit)) {
      if (unit.fuelCapacity !== undefined && unit.fuelCapacity < 0) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            'Fuel capacity must be non-negative',
            {
              field: 'fuelCapacity',
              expected: '>= 0',
              actual: String(unit.fuelCapacity),
              suggestion: 'Set a valid non-negative fuel capacity',
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * All aerospace category validation rules
 */
export const AEROSPACE_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] = [
  AeroEngineRequired,
  AeroThrustRatingValid,
  AeroStructuralIntegrityRequired,
  AeroFuelCapacityValid,
];
