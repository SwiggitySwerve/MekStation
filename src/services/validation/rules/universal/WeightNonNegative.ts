/**
 * VAL-UNIV-008: Weight Non-Negative
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
} from '../../../../types/validation/UnitValidationInterfaces';

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
