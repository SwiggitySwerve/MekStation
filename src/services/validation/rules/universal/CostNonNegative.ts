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
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { createRuleResult, addRuleDiagnostic } from '../ruleResults';

const COST_NON_NEGATIVE_CONSTRUCTION_CATEGORY = ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-009: Cost Non-Negative
 */
export const CostNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-009',
  name: 'Cost Non-Negative',
  description: 'Unit cost must be finite and non-negative',
  category: COST_NON_NEGATIVE_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 9,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const costNonNegativeDiagnostics: IUnitValidationError[] = [];

    if (!Number.isFinite(unit.cost) || unit.cost < 0) {
      addRuleDiagnostic(
        costNonNegativeDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Unit cost must be a non-negative finite number',
        {
          field: 'cost',
          expected: '>= 0',
          actual: String(unit.cost),
          suggestion: 'Correct the cost value to be >= 0 and finite',
        },
      );
    }

    return createRuleResult(this, { errors: costNonNegativeDiagnostics });
  },
};
