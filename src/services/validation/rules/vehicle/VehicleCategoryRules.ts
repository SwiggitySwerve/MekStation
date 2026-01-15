/**
 * Vehicle Category Validation Rules
 *
 * Rules that apply to Vehicle category units (Vehicle, VTOL, SupportVehicle).
 * VAL-VEH-001 through VAL-VEH-005.
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
 * Extended vehicle unit interface for vehicle-specific validation
 */
interface IVehicleUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  motiveSystem?: { type: string };
  rotor?: { type: string };
  turret?: {
    capacity: number;
    usedWeight: number;
  };
}

/**
 * Type guard for vehicle units
 */
function isVehicleUnit(unit: IValidatableUnit): unit is IVehicleUnit {
  return (
    unit.unitType === UnitType.VEHICLE ||
    unit.unitType === UnitType.VTOL ||
    unit.unitType === UnitType.SUPPORT_VEHICLE
  );
}

/**
 * Tonnage ranges by vehicle type
 */
const VEHICLE_TONNAGE_RANGES: Record<UnitType, { min: number; max: number }> = {
  [UnitType.VEHICLE]: { min: 1, max: 100 },
  [UnitType.VTOL]: { min: 1, max: 30 },
  [UnitType.SUPPORT_VEHICLE]: { min: 1, max: 300 },
  // Other unit types (not used here but needed for type safety)
  [UnitType.BATTLEMECH]: { min: 20, max: 100 },
  [UnitType.OMNIMECH]: { min: 20, max: 100 },
  [UnitType.INDUSTRIALMECH]: { min: 10, max: 100 },
  [UnitType.PROTOMECH]: { min: 2, max: 15 },
  [UnitType.AEROSPACE]: { min: 5, max: 100 },
  [UnitType.CONVENTIONAL_FIGHTER]: { min: 5, max: 50 },
  [UnitType.SMALL_CRAFT]: { min: 100, max: 200 },
  [UnitType.DROPSHIP]: { min: 200, max: 100000 },
  [UnitType.JUMPSHIP]: { min: 50000, max: 500000 },
  [UnitType.WARSHIP]: { min: 100000, max: 2500000 },
  [UnitType.SPACE_STATION]: { min: 5000, max: 2500000 },
  [UnitType.INFANTRY]: { min: 0, max: 10 },
  [UnitType.BATTLE_ARMOR]: { min: 0.4, max: 2 },
};

/**
 * VAL-VEH-001: Engine Required
 */
export const VehicleEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-001',
  name: 'Engine Required',
  description: 'All Vehicle category units must have an engine',
  category: ValidationCategory.CONSTRUCTION,
  priority: 30,
  applicableUnitTypes: [UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isVehicleUnit(unit) && !unit.engine) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Engine required',
          {
            field: 'engine',
            suggestion: 'Select an engine for the vehicle',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-VEH-002: Motive System Required
 */
export const VehicleMotiveSystemRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-002',
  name: 'Motive System Required',
  description: 'All Vehicle category units must have a motive system type',
  category: ValidationCategory.CONSTRUCTION,
  priority: 31,
  applicableUnitTypes: [UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isVehicleUnit(unit) && !unit.motiveSystem) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Motive system type required',
          {
            field: 'motiveSystem',
            suggestion: 'Select a motive system type (Wheeled, Tracked, Hover, WiGE, Naval, VTOL)',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-VEH-003: Turret Capacity Limits
 */
export const VehicleTurretCapacity: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-003',
  name: 'Turret Capacity Limits',
  description: 'Turret equipment weight must not exceed turret capacity',
  category: ValidationCategory.WEIGHT,
  priority: 32,
  applicableUnitTypes: [UnitType.VEHICLE, UnitType.SUPPORT_VEHICLE],

  canValidate(context: IUnitValidationContext): boolean {
    if (!isVehicleUnit(context.unit)) return false;
    return context.unit.turret !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isVehicleUnit(unit) && unit.turret) {
      const { capacity, usedWeight } = unit.turret;

      if (usedWeight > capacity) {
        const overflow = usedWeight - capacity;
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            `Turret capacity exceeded by ${overflow.toFixed(2)} tons`,
            {
              field: 'turret.usedWeight',
              expected: `<= ${capacity}`,
              actual: String(usedWeight),
              suggestion: 'Remove equipment from turret or increase turret capacity',
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-VEH-004: VTOL Rotor Required
 */
export const VTOLRotorRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-004',
  name: 'VTOL Rotor Required',
  description: 'VTOL units must have a rotor system',
  category: ValidationCategory.CONSTRUCTION,
  priority: 33,
  applicableUnitTypes: [UnitType.VTOL],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (unit.unitType === UnitType.VTOL && isVehicleUnit(unit) && !unit.rotor) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'VTOL requires rotor system',
          {
            field: 'rotor',
            suggestion: 'Add a rotor system to the VTOL',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-VEH-005: Vehicle Tonnage Range
 */
export const VehicleTonnageRange: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-005',
  name: 'Vehicle Tonnage Range',
  description: 'Vehicle tonnage must be within valid range for vehicle type',
  category: ValidationCategory.WEIGHT,
  priority: 34,
  applicableUnitTypes: [UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    const range = VEHICLE_TONNAGE_RANGES[unit.unitType];
    if (range) {
      if (unit.weight < range.min || unit.weight > range.max) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `${unit.unitType} tonnage must be ${range.min}-${range.max} tons`,
            {
              field: 'weight',
              expected: `${range.min}-${range.max}`,
              actual: String(unit.weight),
              suggestion: `Set tonnage within ${range.min}-${range.max} ton range`,
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * All vehicle category validation rules
 */
export const VEHICLE_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] = [
  VehicleEngineRequired,
  VehicleMotiveSystemRequired,
  VehicleTurretCapacity,
  VTOLRotorRequired,
  VehicleTonnageRange,
];
