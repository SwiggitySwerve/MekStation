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
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { createRuleResult, addRuleDiagnostic } from '../ruleResults';

const INTRODUCTION_YEAR_VALID_ERA_CATEGORY = ValidationCategory.ERA;

/**
 * VAL-UNIV-006: Introduction Year Valid
 */
export const IntroductionYearValid: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-006',
  name: 'Introduction Year Valid',
  description:
    'Introduction year must be within BattleTech timeline (2005-3250)',
  category: INTRODUCTION_YEAR_VALID_ERA_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 6,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const introductionYearValidDiagnostics: IUnitValidationError[] = [];

    const MIN_YEAR = 2005;
    const MAX_YEAR = 3250;

    if (
      typeof unit.introductionYear !== 'number' ||
      !Number.isInteger(unit.introductionYear) ||
      unit.introductionYear < MIN_YEAR ||
      unit.introductionYear > MAX_YEAR
    ) {
      addRuleDiagnostic(
        introductionYearValidDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        `Introduction year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
        {
          field: 'introductionYear',
          expected: `${MIN_YEAR}-${MAX_YEAR}`,
          actual: String(unit.introductionYear),
          suggestion:
            'Provide a valid introduction year within the BattleTech timeline',
        },
      );
    }

    return createRuleResult(this, { errors: introductionYearValidDiagnostics });
  },
};
