/**
 * VAL-UNIV-010: Battle Value Non-Negative
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
 * VAL-UNIV-010: Battle Value Non-Negative
 */
export const BattleValueNonNegative: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-010',
  name: 'Battle Value Non-Negative',
  description: 'Battle value must be finite and non-negative',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!Number.isFinite(unit.battleValue) || unit.battleValue < 0) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Battle value must be a non-negative finite number',
          {
            field: 'battleValue',
            expected: '>= 0',
            actual: String(unit.battleValue),
            suggestion: 'Correct the battle value to be >= 0 and finite',
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
