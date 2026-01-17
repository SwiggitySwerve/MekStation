/**
 * Universal Validation Rules
 *
 * Rules that apply to ALL unit types (VAL-UNIV-001 through VAL-UNIV-012).
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { RulesLevel } from '../../../../types/enums';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  createPassingResult,
} from '../../../../types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import { isValidUnitType } from '../../../../utils/validation/UnitCategoryMapper';
import { isValidTechBase } from '../../../../types/enums/TechBase';

/**
 * Rules level hierarchy for comparison
 */
const RULES_LEVEL_HIERARCHY: Record<RulesLevel, number> = {
  [RulesLevel.INTRODUCTORY]: 0,
  [RulesLevel.STANDARD]: 1,
  [RulesLevel.ADVANCED]: 2,
  [RulesLevel.EXPERIMENTAL]: 3,
};

/**
 * Check if rules level exceeds filter
 */
function rulesLevelExceedsFilter(level: RulesLevel, filter: RulesLevel): boolean {
  return RULES_LEVEL_HIERARCHY[level] > RULES_LEVEL_HIERARCHY[filter];
}

/**
 * VAL-UNIV-001: Entity ID Required
 */
export const EntityIdRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-001',
  name: 'Entity ID Required',
  description: 'All units must have non-empty id',
  category: ValidationCategory.CONSTRUCTION,
  priority: 1,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!unit.id || unit.id.trim() === '') {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Entity must have non-empty id',
          { field: 'id', suggestion: 'Provide a valid id for the entity' }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-002: Entity Name Required
 */
export const EntityNameRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-002',
  name: 'Entity Name Required',
  description: 'All units must have non-empty name',
  category: ValidationCategory.CONSTRUCTION,
  priority: 2,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!unit.name || unit.name.trim() === '') {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Entity must have non-empty name',
          { field: 'name', suggestion: 'Provide a valid name for the entity' }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-003: Valid Unit Type
 */
export const ValidUnitType: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-003',
  name: 'Valid Unit Type',
  description: 'Unit type must be valid UnitType enum value',
  category: ValidationCategory.CONSTRUCTION,
  priority: 3,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!isValidUnitType(unit.unitType)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit type must be valid UnitType enum value',
          {
            field: 'unitType',
            actual: String(unit.unitType),
            suggestion: 'Select a valid unit type',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-004: Tech Base Required
 */
export const TechBaseRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-004',
  name: 'Tech Base Required',
  description: 'All units must declare tech base',
  category: ValidationCategory.TECH_BASE,
  priority: 4,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!unit.techBase || !isValidTechBase(unit.techBase)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit must have a valid tech base',
          {
            field: 'techBase',
            actual: String(unit.techBase),
            suggestion: 'Select Inner Sphere or Clan tech base',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-005: Rules Level Required
 */
export const RulesLevelRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-005',
  name: 'Rules Level Required',
  description: 'All units must have valid rules level',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    const validRulesLevels = Object.values(RulesLevel);
    if (!unit.rulesLevel || !validRulesLevels.includes(unit.rulesLevel)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit must have a valid rules level',
          {
            field: 'rulesLevel',
            actual: String(unit.rulesLevel),
            suggestion: 'Select Introductory, Standard, Advanced, or Experimental',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-006: Introduction Year Valid
 */
export const IntroductionYearValid: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-006',
  name: 'Introduction Year Valid',
  description: 'Introduction year must be within BattleTech timeline (2005-3250)',
  category: ValidationCategory.ERA,
  priority: 6,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    const MIN_YEAR = 2005;
    const MAX_YEAR = 3250;

    if (
      typeof unit.introductionYear !== 'number' ||
      !Number.isInteger(unit.introductionYear) ||
      unit.introductionYear < MIN_YEAR ||
      unit.introductionYear > MAX_YEAR
    ) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          `Introduction year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
          {
            field: 'introductionYear',
            expected: `${MIN_YEAR}-${MAX_YEAR}`,
            actual: String(unit.introductionYear),
            suggestion: 'Provide a valid introduction year within the BattleTech timeline',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-007: Temporal Consistency
 */
export const TemporalConsistency: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-007',
  name: 'Temporal Consistency',
  description: 'Extinction year must be after introduction year',
  category: ValidationCategory.ERA,
  priority: 7,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (
      unit.extinctionYear !== undefined &&
      unit.extinctionYear <= unit.introductionYear
    ) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Extinction year must be after introduction year',
          {
            field: 'extinctionYear',
            expected: `> ${unit.introductionYear}`,
            actual: String(unit.extinctionYear),
            suggestion: 'Correct the extinction year to be after the introduction year',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-008: Weight Non-Negative
 */
export const WeightNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-008',
  name: 'Weight Non-Negative',
  description: 'Unit weight must be finite and non-negative',
  category: ValidationCategory.WEIGHT,
  priority: 8,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!Number.isFinite(unit.weight) || unit.weight < 0) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit weight must be a non-negative finite number',
          {
            field: 'weight',
            expected: '>= 0',
            actual: String(unit.weight),
            suggestion: 'Correct the weight value to be >= 0 and finite',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-009: Cost Non-Negative
 */
export const CostNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-009',
  name: 'Cost Non-Negative',
  description: 'Unit cost must be finite and non-negative',
  category: ValidationCategory.CONSTRUCTION,
  priority: 9,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!Number.isFinite(unit.cost) || unit.cost < 0) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit cost must be a non-negative finite number',
          {
            field: 'cost',
            expected: '>= 0',
            actual: String(unit.cost),
            suggestion: 'Correct the cost value to be >= 0 and finite',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-010: Battle Value Non-Negative
 */
export const BattleValueNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-010',
  name: 'Battle Value Non-Negative',
  description: 'Battle value must be finite and non-negative',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!Number.isFinite(unit.battleValue) || unit.battleValue < 0) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Battle value must be a non-negative finite number',
          {
            field: 'battleValue',
            expected: '>= 0',
            actual: String(unit.battleValue),
            suggestion: 'Correct the battle value to be >= 0 and finite',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-011: Era Availability
 */
export const EraAvailability: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-011',
  name: 'Era Availability',
  description: 'Unit must be available in campaign year',
  category: ValidationCategory.ERA,
  priority: 11,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    // Only validate if campaign year is specified
    return context.campaignYear !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit, campaignYear } = context;
    const errors = [];

    if (campaignYear === undefined) {
      return createPassingResult(this.id, this.name);
    }

    // Check if unit is introduced yet
    if (unit.introductionYear > campaignYear) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          `${unit.name} not available in year ${campaignYear} (introduced ${unit.introductionYear})`,
          {
            field: 'introductionYear',
            expected: `<= ${campaignYear}`,
            actual: String(unit.introductionYear),
            suggestion: 'Change campaign year or select a different unit',
          }
        )
      );
    }

    // Check if unit is extinct
    if (unit.extinctionYear !== undefined && campaignYear >= unit.extinctionYear) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          `${unit.name} is extinct/unavailable in year ${campaignYear} (extinct ${unit.extinctionYear})`,
          {
            field: 'extinctionYear',
            expected: `> ${campaignYear}`,
            actual: String(unit.extinctionYear),
            suggestion: 'Change campaign year or select a different unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-012: Rules Level Compliance
 */
export const RulesLevelCompliance: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-012',
  name: 'Rules Level Compliance',
  description: 'Unit rules level must not exceed filter',
  category: ValidationCategory.CONSTRUCTION,
  priority: 12,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    // Only validate if rules level filter is specified
    return context.rulesLevelFilter !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit, rulesLevelFilter } = context;
    const errors = [];

    if (rulesLevelFilter === undefined) {
      return createPassingResult(this.id, this.name);
    }

    if (rulesLevelExceedsFilter(unit.rulesLevel, rulesLevelFilter)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          `Unit rules level ${unit.rulesLevel} exceeds allowed level ${rulesLevelFilter}`,
          {
            field: 'rulesLevel',
            expected: `<= ${rulesLevelFilter}`,
            actual: unit.rulesLevel,
            suggestion: 'Change rules level filter or select a different unit',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, errors, [], [], 0);
  },
};

/**
 * VAL-UNIV-013: Armor Allocation Warning
 */
export const ArmorAllocationWarning: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-013',
  name: 'Armor Allocation Warning',
  description: 'Warn when unit has no armor allocated',
  category: ValidationCategory.ARMOR,
  priority: 13,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    return context.unit.totalArmorPoints !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const warnings = [];

    if (unit.totalArmorPoints !== undefined && unit.totalArmorPoints === 0) {
      warnings.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.WARNING,
          this.category,
          'Unit has no armor allocated - highly vulnerable to damage',
          {
            field: 'armorAllocation',
            expected: '> 0',
            actual: '0',
            suggestion: 'Allocate armor points in the Armor tab',
          }
        )
      );
    }

    return createUnitValidationRuleResult(this.id, this.name, [], warnings, [], 0);
  },
};

/**
 * All universal validation rules
 */
export const UNIVERSAL_VALIDATION_RULES: readonly IUnitValidationRuleDefinition[] = [
  EntityIdRequired,
  EntityNameRequired,
  ValidUnitType,
  TechBaseRequired,
  RulesLevelRequired,
  IntroductionYearValid,
  TemporalConsistency,
  WeightNonNegative,
  CostNonNegative,
  BattleValueNonNegative,
  EraAvailability,
  RulesLevelCompliance,
  ArmorAllocationWarning,
];
