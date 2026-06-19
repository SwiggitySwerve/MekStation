/**
 * VAL-UNIV-008: Weight Non-Negative
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { addRuleDiagnostic, createRuleResult } from '../ruleResults';

const WEIGHT_NON_NEGATIVE_WEIGHT_CATEGORY = ValidationCategory.WEIGHT;

/**
 * VAL-UNIV-008: Weight Non-Negative
 */
export const WeightNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-008',
  name: 'Weight Non-Negative',
  description: 'Unit weight must be finite and non-negative',
  category: WEIGHT_NON_NEGATIVE_WEIGHT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 8,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const weightNonNegativeDiagnostics: IUnitValidationError[] = [];

    if (!Number.isFinite(unit.weight) || unit.weight < 0) {
      addRuleDiagnostic(
        weightNonNegativeDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Unit weight must be a non-negative finite number',
        {
          field: 'weight',
          expected: '>= 0',
          actual: String(unit.weight),
          suggestion: 'Correct the weight value to be >= 0 and finite',
        },
      );
    }

    return createRuleResult(this, { errors: weightNonNegativeDiagnostics });
  },
};
