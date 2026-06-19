/**
 * Vehicle Category Validation Rules
 *
 * Rules that apply to Vehicle category units (Vehicle, VTOL, SupportVehicle).
 * VAL-VEH-001 through VAL-VEH-005.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import {
  VEHICLE_TONNAGE,
  VTOL_TONNAGE,
  SUPPORT_VEHICLE_TONNAGE,
} from '@/services/construction/constructionConstants';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IValidatableUnit,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';
import { isVehicleType } from '@/utils/validation/UnitCategoryMapper';

import { createRuleResult, addRuleDiagnostic } from '../ruleResults';

const VEHICLE_CATEGORY_RULES_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;
const VEHICLE_CATEGORY_RULES_WEIGHT_CATEGORY = ValidationCategory.WEIGHT;

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
 * Type guard that narrows to IVehicleUnit interface
 */
function isVehicleUnit(unit: IValidatableUnit): unit is IVehicleUnit {
  return isVehicleType(unit.unitType);
}

/**
 * Get tonnage range for a vehicle unit type
 */
function getVehicleTonnageRange(unitType: UnitType): {
  min: number;
  max: number;
} {
  switch (unitType) {
    case UnitType.VEHICLE:
      return VEHICLE_TONNAGE;
    case UnitType.VTOL:
      return VTOL_TONNAGE;
    case UnitType.SUPPORT_VEHICLE:
      return SUPPORT_VEHICLE_TONNAGE;
    default:
      return { min: 1, max: 100 };
  }
}

/**
 * VAL-VEH-001: Engine Required
 */
export const VehicleEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-001',
  name: 'Engine Required',
  description: 'All Vehicle category units must have an engine',
  category: VEHICLE_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 30,
  applicableUnitTypes: [
    UnitType.VEHICLE,
    UnitType.VTOL,
    UnitType.SUPPORT_VEHICLE,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isVehicleUnit(unit) && !unit.engine) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Engine required',
        {
          field: 'engine',
          suggestion: 'Select an engine for the vehicle',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-VEH-002: Motive System Required
 */
export const VehicleMotiveSystemRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-002',
  name: 'Motive System Required',
  description: 'All Vehicle category units must have a motive system type',
  category: VEHICLE_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 31,
  applicableUnitTypes: [
    UnitType.VEHICLE,
    UnitType.VTOL,
    UnitType.SUPPORT_VEHICLE,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isVehicleUnit(unit) && !unit.motiveSystem) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Motive system type required',
        {
          field: 'motiveSystem',
          suggestion:
            'Select a motive system type (Wheeled, Tracked, Hover, WiGE, Naval, VTOL)',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-VEH-003: Turret Capacity Limits
 */
export const VehicleTurretCapacity: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-003',
  name: 'Turret Capacity Limits',
  description: 'Turret equipment weight must not exceed turret capacity',
  category: VEHICLE_CATEGORY_RULES_WEIGHT_CATEGORY,
  priority: 32,
  applicableUnitTypes: [UnitType.VEHICLE, UnitType.SUPPORT_VEHICLE],

  canValidate(context: IUnitValidationContext): boolean {
    if (!isVehicleUnit(context.unit)) return false;
    return context.unit.turret !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isVehicleUnit(unit) && unit.turret) {
      const { capacity, usedWeight } = unit.turret;

      if (usedWeight > capacity) {
        const overflow = usedWeight - capacity;
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          `Turret capacity exceeded by ${overflow.toFixed(2)} tons`,
          {
            field: 'turret.usedWeight',
            expected: `<= ${capacity}`,
            actual: String(usedWeight),
            suggestion:
              'Remove equipment from turret or increase turret capacity',
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-VEH-004: VTOL Rotor Required
 */
export const VTOLRotorRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-004',
  name: 'VTOL Rotor Required',
  description: 'VTOL units must have a rotor system',
  category: VEHICLE_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 33,
  applicableUnitTypes: [UnitType.VTOL],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (unit.unitType === UnitType.VTOL && isVehicleUnit(unit) && !unit.rotor) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'VTOL requires rotor system',
        {
          field: 'rotor',
          suggestion: 'Add a rotor system to the VTOL',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-VEH-005: Vehicle Tonnage Range
 */
export const VehicleTonnageRange: IUnitValidationRuleDefinition = {
  id: 'VAL-VEH-005',
  name: 'Vehicle Tonnage Range',
  description: 'Vehicle tonnage must be within valid range for vehicle type',
  category: VEHICLE_CATEGORY_RULES_WEIGHT_CATEGORY,
  priority: 34,
  applicableUnitTypes: [
    UnitType.VEHICLE,
    UnitType.VTOL,
    UnitType.SUPPORT_VEHICLE,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isVehicleType(unit.unitType)) {
      const range = getVehicleTonnageRange(unit.unitType);
      if (unit.weight < range.min || unit.weight > range.max) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.CRITICAL_ERROR,
          `${unit.unitType} tonnage must be ${range.min}-${range.max} tons`,
          {
            field: 'weight',
            expected: `${range.min}-${range.max}`,
            actual: String(unit.weight),
            suggestion: `Set tonnage within ${range.min}-${range.max} ton range`,
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * All vehicle category validation rules
 */
export const VEHICLE_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    VehicleEngineRequired,
    VehicleMotiveSystemRequired,
    VehicleTurretCapacity,
    VTOLRotorRequired,
    VehicleTonnageRange,
  ];
