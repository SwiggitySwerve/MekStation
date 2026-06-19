/**
 * VAL-UNIV-010: Battle Value Non-Negative
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

const BATTLE_VALUE_NON_NEGATIVE_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-010: Battle Value Non-Negative
 */
export const BattleValueNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-010',
  name: 'Battle Value Non-Negative',
  description: 'Battle value must be finite and non-negative',
  category: BATTLE_VALUE_NON_NEGATIVE_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 10,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const battleValueNonNegativeDiagnostics: IUnitValidationError[] = [];

    if (!Number.isFinite(unit.battleValue) || unit.battleValue < 0) {
      addRuleDiagnostic(
        battleValueNonNegativeDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Battle value must be a non-negative finite number',
        {
          field: 'battleValue',
          expected: '>= 0',
          actual: String(unit.battleValue),
          suggestion: 'Correct the battle value to be >= 0 and finite',
        },
      );
    }

    return createRuleResult(this, {
      errors: battleValueNonNegativeDiagnostics,
    });
  },
};
