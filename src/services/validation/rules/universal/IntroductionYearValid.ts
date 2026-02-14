/**
 * VAL-UNIV-006: Introduction Year Valid
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
} from '@/types/validation/UnitValidationInterfaces';

/**
 * VAL-UNIV-006: Introduction Year Valid
 */
export const IntroductionYearValid: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-006',
  name: 'Introduction Year Valid',
  description:
    'Introduction year must be within BattleTech timeline (2005-3250)',
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
            suggestion:
              'Provide a valid introduction year within the BattleTech timeline',
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
