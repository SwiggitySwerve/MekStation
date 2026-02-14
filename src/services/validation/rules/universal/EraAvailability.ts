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
  createUnitValidationError,
  createUnitValidationRuleResult,
  createPassingResult,
} from '@/types/validation/UnitValidationInterfaces';

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
          },
        ),
      );
    }

    // Check if unit is extinct
    if (
      unit.extinctionYear !== undefined &&
      campaignYear >= unit.extinctionYear
    ) {
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
          },
        ),
      );
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
