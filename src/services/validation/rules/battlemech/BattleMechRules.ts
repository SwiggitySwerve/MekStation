/**
 * BattleMech-Specific Validation Rules
 *
 * Rules that apply ONLY to BattleMech and OmniMech unit types.
 * These extend/override the generic Mech category rules with
 * BattleMech-specific constraints from the TechManual.
 *
 * VAL-BM-001 through VAL-BM-010.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 * @spec openspec/specs/validation-rules-master/spec.md
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';
import { isCombatMech } from '@/utils/validation/UnitCategoryMapper';

import {
  BATTLEMECH_TONNAGE,
  ENGINE_RATING_MIN,
  ENGINE_RATING_INCREMENT,
} from '../../../construction/constructionConstants';

/** Engine rating max for BattleMechs per TechManual (higher than general limit) */
const ENGINE_RATING_MAX_BATTLEMECH = 500;

/**
 * VAL-BM-001: BattleMech Tonnage Range
 * Tonnage must be 20-200 tons and divisible by 5
 * (20-100 standard, 105-200 superheavy)
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */
export const BattleMechTonnageRange: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-001',
  name: 'BattleMech Tonnage Range',
  description:
    'BattleMech tonnage must be 20-200 tons and divisible by 5 (105-200 for superheavy)',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];
    const tonnage = unit.weight;
    const { min, max, step } = BATTLEMECH_TONNAGE;

    if (isCombatMech(unit.unitType)) {
      if (tonnage < min || tonnage > max) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `BattleMech tonnage must be between ${min} and ${max} tons (current: ${tonnage})`,
            {
              field: 'weight',
              expected: `${min}-${max}`,
              actual: String(tonnage),
              suggestion: `Select a valid tonnage between ${min} and ${max} tons`,
            },
          ),
        );
      } else if (tonnage % step !== 0) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `BattleMech tonnage must be divisible by ${step} (current: ${tonnage})`,
            {
              field: 'weight',
              expected: `divisible by ${step}`,
              actual: String(tonnage),
              suggestion: `Round tonnage to nearest valid value (${Math.round(tonnage / step) * step})`,
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
 * VAL-BM-002: Engine Rating Range
 * Engine rating must be 10-500 in multiples of 5
 */
export const BattleMechEngineRatingRange: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-002',
  name: 'Engine Rating Range',
  description: 'Engine rating must be 10-500 in multiples of 5',
  category: ValidationCategory.CONSTRUCTION,
  priority: 11,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!isCombatMech(unit.unitType)) {
      return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
    }

    // Extract engine rating from engineType string if available
    // Format is typically "Standard 250", "XL 300", etc.
    const engineType = unit.engineType;
    if (!engineType) {
      return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
    }

    // Try to extract rating from engine type string
    const ratingMatch = engineType.match(/\d+/);
    if (ratingMatch) {
      const rating = parseInt(ratingMatch[0], 10);

      if (rating < ENGINE_RATING_MIN || rating > ENGINE_RATING_MAX_BATTLEMECH) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `Engine rating must be between ${ENGINE_RATING_MIN} and ${ENGINE_RATING_MAX_BATTLEMECH} (current: ${rating})`,
            {
              field: 'engineType',
              expected: `${ENGINE_RATING_MIN}-${ENGINE_RATING_MAX_BATTLEMECH}`,
              actual: String(rating),
              suggestion: `Select an engine with rating between ${ENGINE_RATING_MIN} and ${ENGINE_RATING_MAX_BATTLEMECH}`,
            },
          ),
        );
      } else if (rating % ENGINE_RATING_INCREMENT !== 0) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `Engine rating must be a multiple of ${ENGINE_RATING_INCREMENT} (current: ${rating})`,
            {
              field: 'engineType',
              expected: `multiple of ${ENGINE_RATING_INCREMENT}`,
              actual: String(rating),
              suggestion: `Round engine rating to ${Math.round(rating / ENGINE_RATING_INCREMENT) * ENGINE_RATING_INCREMENT}`,
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
 * VAL-BM-003: Engine Rating Matches Movement
 * Engine rating should equal tonnage × walk MP
 */
export const BattleMechEngineRatingMatch: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-003',
  name: 'Engine Rating Match',
  description: 'Engine rating must match tonnage × walk MP',
  category: ValidationCategory.CONSTRUCTION,
  priority: 12,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // This requires walk MP which is not in IValidatableUnit yet
    // Will be enhanced when movement data is added
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * VAL-BM-004: OmniMech Pod Space Validation
 * OmniMech must have positive pod space available
 */
export const OmniMechPodSpace: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-004',
  name: 'OmniMech Pod Space',
  description: 'OmniMech must have pod space available for equipment',
  category: ValidationCategory.CONSTRUCTION,
  priority: 13,
  applicableUnitTypes: [UnitType.OMNIMECH],

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const warnings: ReturnType<typeof createUnitValidationError>[] = [];

    if (unit.unitType === UnitType.OMNIMECH) {
      // OmniMech pod space validation will be enhanced
      // when pod space data is added to IValidatableUnit
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
 * VAL-BM-005: Minimum Walk MP
 * BattleMech must have at least 1 walk MP
 */
export const BattleMechMinimumWalkMP: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-005',
  name: 'Minimum Walk MP',
  description: 'BattleMech must have at least 1 walk MP',
  category: ValidationCategory.MOVEMENT,
  priority: 14,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Movement data not in IValidatableUnit yet
    // Will be enhanced when movement is added
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * VAL-BM-006: Maximum Walk MP
 * BattleMech walk MP is limited by engine rating / tonnage
 */
export const BattleMechMaximumWalkMP: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-006',
  name: 'Maximum Walk MP',
  description: 'BattleMech walk MP cannot exceed engine rating / tonnage',
  category: ValidationCategory.MOVEMENT,
  priority: 15,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Movement data not in IValidatableUnit yet
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * VAL-BM-007: Arm Actuator Requirements
 * Lower arm actuators require upper arm; hand actuators require lower arm
 */
export const BattleMechArmActuators: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-007',
  name: 'Arm Actuator Requirements',
  description:
    'Arm actuators must follow hierarchy (shoulder → upper → lower → hand)',
  category: ValidationCategory.CONSTRUCTION,
  priority: 16,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Actuator data not in IValidatableUnit yet
    // Will be enhanced when critical slots are added
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * VAL-BM-008: Head Location Restrictions
 * Only cockpit, sensors, life support, and limited equipment in head
 */
export const BattleMechHeadRestrictions: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-008',
  name: 'Head Location Restrictions',
  description: 'Head location has limited equipment options',
  category: ValidationCategory.CONSTRUCTION,
  priority: 17,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Critical slot data not in IValidatableUnit yet
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * VAL-BM-009: Center Torso Requirements
 * Engine, gyro, and reactor shielding must be in CT
 */
export const BattleMechCTRequirements: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-009',
  name: 'Center Torso Requirements',
  description: 'Engine and gyro must occupy center torso slots',
  category: ValidationCategory.CONSTRUCTION,
  priority: 18,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Critical slot data not in IValidatableUnit yet
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * VAL-BM-010: XL Engine Side Torso Slots
 * XL engines require 3 slots in each side torso
 */
export const BattleMechXLEngineSlots: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-010',
  name: 'XL Engine Side Torso Slots',
  description: 'XL engines require 3 slots in each side torso',
  category: ValidationCategory.CONSTRUCTION,
  priority: 19,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],

  validate(_context: IUnitValidationContext): IUnitValidationRuleResult {
    // Critical slot data not in IValidatableUnit yet
    return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
  },
};

/**
 * All BattleMech-specific validation rules
 */
export const BATTLEMECH_RULES: readonly IUnitValidationRuleDefinition[] = [
  BattleMechTonnageRange,
  BattleMechEngineRatingRange,
  BattleMechEngineRatingMatch,
  OmniMechPodSpace,
  BattleMechMinimumWalkMP,
  BattleMechMaximumWalkMP,
  BattleMechArmActuators,
  BattleMechHeadRestrictions,
  BattleMechCTRequirements,
  BattleMechXLEngineSlots,
];
