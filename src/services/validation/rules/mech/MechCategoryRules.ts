/**
 * Mech Category Validation Rules
 *
 * Rules that apply to Mech category units (BattleMech, OmniMech, IndustrialMech, ProtoMech).
 * VAL-MECH-001 through VAL-MECH-007.
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
import { requiresGyro, requiresMinimumHeatSinks } from '../../../../utils/validation/UnitCategoryMapper';

/**
 * Extended mech unit interface for mech-specific validation
 */
interface IMechUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  gyro?: { type: string };
  cockpit?: { type: string };
  structure?: { type: string };
  heatSinks?: { total: number };
  totalWeight?: number;
  criticalSlots?: {
    location: string;
    used: number;
    total: number;
  }[];
}

/**
 * Type guard for mech units
 */
function isMechUnit(unit: IValidatableUnit): unit is IMechUnit {
  return (
    unit.unitType === UnitType.BATTLEMECH ||
    unit.unitType === UnitType.OMNIMECH ||
    unit.unitType === UnitType.INDUSTRIALMECH ||
    unit.unitType === UnitType.PROTOMECH
  );
}

/**
 * VAL-MECH-001: Engine Required
 */
export const MechEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-001',
  name: 'Engine Required',
  description: 'All Mech category units must have an engine',
  category: ValidationCategory.CONSTRUCTION,
  priority: 20,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && !unit.engine) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Engine required',
          {
            field: 'engine',
            suggestion: 'Select an engine for the unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-MECH-002: Gyro Required (except ProtoMech)
 */
export const MechGyroRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-002',
  name: 'Gyro Required',
  description: 'BattleMech, OmniMech, and IndustrialMech require a gyro',
  category: ValidationCategory.CONSTRUCTION,
  priority: 21,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH, UnitType.INDUSTRIALMECH],

  canValidate(context: IUnitValidationContext): boolean {
    return requiresGyro(context.unitType);
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && requiresGyro(unit.unitType) && !unit.gyro) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Gyro required',
          {
            field: 'gyro',
            suggestion: 'Select a gyro for the unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-MECH-003: Cockpit Required
 */
export const MechCockpitRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-003',
  name: 'Cockpit Required',
  description: 'All Mech category units must have a cockpit',
  category: ValidationCategory.CONSTRUCTION,
  priority: 22,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && !unit.cockpit) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Cockpit required',
          {
            field: 'cockpit',
            suggestion: 'Select a cockpit for the unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-MECH-004: Internal Structure Required
 */
export const MechStructureRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-004',
  name: 'Internal Structure Required',
  description: 'All Mech category units must have internal structure',
  category: ValidationCategory.CONSTRUCTION,
  priority: 23,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && !unit.structure) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Internal structure required',
          {
            field: 'structure',
            suggestion: 'Select internal structure type for the unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-MECH-005: Minimum Heat Sinks (BattleMech/OmniMech only)
 */
export const MechMinimumHeatSinks: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-005',
  name: 'Minimum Heat Sinks',
  description: 'BattleMech and OmniMech must have at least 10 heat sinks',
  category: ValidationCategory.HEAT,
  priority: 24,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  canValidate(context: IUnitValidationContext): boolean {
    return requiresMinimumHeatSinks(context.unitType);
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && requiresMinimumHeatSinks(unit.unitType)) {
      const heatSinkCount = unit.heatSinks?.total ?? 0;
      const MINIMUM_HEAT_SINKS = 10;

      if (heatSinkCount < MINIMUM_HEAT_SINKS) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `Unit must have at least ${MINIMUM_HEAT_SINKS} heat sinks (current: ${heatSinkCount})`,
            {
              field: 'heatSinks.total',
              expected: `>= ${MINIMUM_HEAT_SINKS}`,
              actual: String(heatSinkCount),
              suggestion: `Add ${MINIMUM_HEAT_SINKS - heatSinkCount} more heat sinks`,
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-MECH-006: Exact Weight Match
 */
export const MechExactWeightMatch: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-006',
  name: 'Exact Weight Match',
  description: 'Total component weight must equal declared tonnage',
  category: ValidationCategory.WEIGHT,
  priority: 25,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && unit.totalWeight !== undefined) {
      const declaredTonnage = unit.weight;
      const actualWeight = unit.totalWeight;
      const difference = actualWeight - declaredTonnage;

      // Allow small floating point tolerance
      const TOLERANCE = 0.001;

      if (Math.abs(difference) > TOLERANCE) {
        if (difference > 0) {
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.CRITICAL_ERROR,
              this.category,
              `Design is overweight by ${difference.toFixed(2)} tons`,
              {
                field: 'totalWeight',
                expected: String(declaredTonnage),
                actual: String(actualWeight),
                suggestion: 'Remove or lighten components',
              }
            )
          );
        } else {
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.CRITICAL_ERROR,
              this.category,
              `Design is underweight by ${Math.abs(difference).toFixed(2)} tons`,
              {
                field: 'totalWeight',
                expected: String(declaredTonnage),
                actual: String(actualWeight),
                suggestion: 'Add components or increase armor',
              }
            )
          );
        }
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-MECH-007: Critical Slot Limits
 */
export const MechCriticalSlotLimits: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-007',
  name: 'Critical Slot Limits',
  description: 'Per-location slot usage must not exceed limits',
  category: ValidationCategory.SLOTS,
  priority: 26,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isMechUnit(unit) && unit.criticalSlots) {
      for (const locationSlots of unit.criticalSlots) {
        if (locationSlots.used > locationSlots.total) {
          const overflow = locationSlots.used - locationSlots.total;
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
              `Insufficient slots in ${locationSlots.location}. Required: ${locationSlots.used}, Available: ${locationSlots.total}`,
              {
                field: `criticalSlots.${locationSlots.location}`,
                expected: `<= ${locationSlots.total}`,
                actual: String(locationSlots.used),
                suggestion: `Remove ${overflow} slot(s) of equipment from ${locationSlots.location}`,
              }
            )
          );
        }
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * All mech category validation rules
 */
export const MECH_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] = [
  MechEngineRequired,
  MechGyroRequired,
  MechCockpitRequired,
  MechStructureRequired,
  MechMinimumHeatSinks,
  MechExactWeightMatch,
  MechCriticalSlotLimits,
];
