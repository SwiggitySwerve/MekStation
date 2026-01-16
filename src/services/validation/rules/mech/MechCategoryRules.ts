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
} from '../../../../types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import { isMechType, requiresGyro, requiresMinimumHeatSinks } from '../../../../utils/validation/UnitCategoryMapper';

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

    if (isMechType(unit.unitType) && !unit.engineType) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Engine required',
          {
            field: 'engineType',
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

    if (isMechType(unit.unitType) && requiresGyro(unit.unitType) && !unit.gyroType) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Gyro required',
          {
            field: 'gyroType',
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

    if (isMechType(unit.unitType) && !unit.cockpitType) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Cockpit required',
          {
            field: 'cockpitType',
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

    if (isMechType(unit.unitType) && !unit.internalStructureType) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Internal structure required',
          {
            field: 'internalStructureType',
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
    const warnings = [];

    if (isMechType(unit.unitType) && requiresMinimumHeatSinks(unit.unitType)) {
      const heatSinkCount = unit.heatSinkCount ?? 0;
      const MINIMUM_HEAT_SINKS = 10;

      if (heatSinkCount < MINIMUM_HEAT_SINKS) {
        warnings.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.WARNING,
            this.category,
            `Unit should have at least ${MINIMUM_HEAT_SINKS} heat sinks (current: ${heatSinkCount})`,
            {
              field: 'heatSinkCount',
              expected: `>= ${MINIMUM_HEAT_SINKS}`,
              actual: String(heatSinkCount),
              suggestion: `Add ${MINIMUM_HEAT_SINKS - heatSinkCount} more heat sinks`,
            }
          )
        );
      }
    }

    return createUnitValidationRuleResult(this.id, this.name, [], warnings, [], 0);
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

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Weight validation is handled by the UI via totalWeight calculation
    // This rule will be enhanced when totalWeight is added to IValidatableUnit
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
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

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Critical slot validation is handled by the UI via slot counting
    // This rule will be enhanced when criticalSlots data is added to IValidatableUnit
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
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
