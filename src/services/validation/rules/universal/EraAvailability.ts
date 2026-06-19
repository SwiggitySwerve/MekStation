/**
 * VAL-UNIV-011: Era Availability
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import {
  createRuleResult,
  createEmptyRuleResult,
  addRuleDiagnostic,
} from '../ruleResults';

const ERA_AVAILABILITY_ERA_CATEGORY = ValidationCategory.ERA;

/**
 * VAL-UNIV-011: Era Availability
 */
export const EraAvailability: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-011',
  name: 'Era Availability',
  description: 'Unit must be available in campaign year',
  category: ERA_AVAILABILITY_ERA_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 11,

  canValidate(context: IUnitValidationContext): boolean {
    // Only validate if campaign year is specified
    return context.campaignYear !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit, campaignYear } = context;
    const errors: IUnitValidationError[] = [];

    if (campaignYear === undefined) {
      return createEmptyRuleResult(this);
    }

    // Check if unit is introduced yet
    if (unit.introductionYear > campaignYear) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.ERROR,
        `${unit.name} not available in year ${campaignYear} (introduced ${unit.introductionYear})`,
        {
          field: 'introductionYear',
          expected: `<= ${campaignYear}`,
          actual: String(unit.introductionYear),
          suggestion: 'Change campaign year or select a different unit',
        },
      );
    }

    // Check if unit is extinct
    if (
      unit.extinctionYear !== undefined &&
      campaignYear >= unit.extinctionYear
    ) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.ERROR,
        `${unit.name} is extinct/unavailable in year ${campaignYear} (extinct ${unit.extinctionYear})`,
        {
          field: 'extinctionYear',
          expected: `> ${campaignYear}`,
          actual: String(unit.extinctionYear),
          suggestion: 'Change campaign year or select a different unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};
