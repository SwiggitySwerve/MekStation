/**
 * Mech Category Validation Rules
 *
 * Rules that apply to Mech category units (BattleMech, OmniMech, IndustrialMech, ProtoMech).
 * VAL-MECH-001 through VAL-MECH-007.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';
import {
  isMechType,
  requiresGyro,
  requiresMinimumHeatSinks,
} from '@/utils/validation/UnitCategoryMapper';

import {
  createEmptyRuleResult,
  addRuleDiagnostic,
  createRuleResult,
} from '../ruleResults';

const MECH_CATEGORY_RULES_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;
const MECH_CATEGORY_RULES_HEAT_CATEGORY = ValidationCategory.HEAT;
const MECH_CATEGORY_RULES_WEIGHT_CATEGORY = ValidationCategory.WEIGHT;
const MECH_CATEGORY_RULES_SLOTS_CATEGORY = ValidationCategory.SLOTS;

/**
 * VAL-MECH-001: Engine Required
 */
export const MechEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-001',
  name: 'Engine Required',
  description: 'All Mech category units must have an engine',
  category: MECH_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 20,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isMechType(unit.unitType) && !unit.engineType) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Engine required',
        {
          field: 'engineType',
          suggestion: 'Select an engine for the unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-MECH-002: Gyro Required (except ProtoMech)
 */
export const MechGyroRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-002',
  name: 'Gyro Required',
  description: 'BattleMech, OmniMech, and IndustrialMech require a gyro',
  category: MECH_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 21,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
  ],

  canValidate(context: IUnitValidationContext): boolean {
    return requiresGyro(context.unitType);
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (
      isMechType(unit.unitType) &&
      requiresGyro(unit.unitType) &&
      !unit.gyroType
    ) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Gyro required',
        {
          field: 'gyroType',
          suggestion: 'Select a gyro for the unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-MECH-003: Cockpit Required
 */
export const MechCockpitRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-003',
  name: 'Cockpit Required',
  description: 'All Mech category units must have a cockpit',
  category: MECH_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 22,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isMechType(unit.unitType) && !unit.cockpitType) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Cockpit required',
        {
          field: 'cockpitType',
          suggestion: 'Select a cockpit for the unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-MECH-004: Internal Structure Required
 */
export const MechStructureRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-004',
  name: 'Internal Structure Required',
  description: 'All Mech category units must have internal structure',
  category: MECH_CATEGORY_RULES_CONSTRUCTION_CATEGORY,
  priority: 23,
  applicableUnitTypes: [
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
    UnitType.PROTOMECH,
  ],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isMechType(unit.unitType) && !unit.internalStructureType) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Internal structure required',
        {
          field: 'internalStructureType',
          suggestion: 'Select internal structure type for the unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

/**
 * VAL-MECH-005: Minimum Heat Sinks (BattleMech/OmniMech only)
 */
export const MechMinimumHeatSinks: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-005',
  name: 'Minimum Heat Sinks',
  description: 'BattleMech and OmniMech must have at least 10 heat sinks',
  category: MECH_CATEGORY_RULES_HEAT_CATEGORY,
  priority: 24,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  canValidate(context: IUnitValidationContext): boolean {
    return requiresMinimumHeatSinks(context.unitType);
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const warnings: IUnitValidationError[] = [];

    if (isMechType(unit.unitType) && requiresMinimumHeatSinks(unit.unitType)) {
      const heatSinkCount = unit.heatSinkCount ?? 0;
      const MINIMUM_HEAT_SINKS = 10;

      if (heatSinkCount < MINIMUM_HEAT_SINKS) {
        addRuleDiagnostic(
          warnings,
          this,
          UnitValidationSeverity.WARNING,
          `Unit should have at least ${MINIMUM_HEAT_SINKS} heat sinks (current: ${heatSinkCount})`,
          {
            field: 'heatSinkCount',
            expected: `>= ${MINIMUM_HEAT_SINKS}`,
            actual: String(heatSinkCount),
            suggestion: `Add ${MINIMUM_HEAT_SINKS - heatSinkCount} more heat sinks`,
          },
        );
      }
    }

    return createRuleResult(this, { warnings });
  },
};

/**
 * VAL-MECH-006: Exact Weight Match
 */
export const MechExactWeightMatch: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-006',
  name: 'Exact Weight Match',
  description: 'Total component weight must equal declared tonnage',
  category: MECH_CATEGORY_RULES_WEIGHT_CATEGORY,
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
    return createEmptyRuleResult(this);
  },
};

/**
 * VAL-MECH-007: Critical Slot Limits
 */
export const MechCriticalSlotLimits: IUnitValidationRuleDefinition = {
  id: 'VAL-MECH-007',
  name: 'Critical Slot Limits',
  description: 'Per-location slot usage must not exceed limits',
  category: MECH_CATEGORY_RULES_SLOTS_CATEGORY,
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
    return createEmptyRuleResult(this);
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
