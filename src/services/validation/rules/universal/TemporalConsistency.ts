/**
 * VAL-UNIV-007: Temporal Consistency
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
            suggestion:
              'Correct the extinction year to be after the introduction year',
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
