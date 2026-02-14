/**
 * VAL-UNIV-009: Cost Non-Negative
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
