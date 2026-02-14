/**
 * VAL-UNIV-005: Rules Level Required
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { RulesLevel } from '../../../../types/enums';
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
 * VAL-UNIV-005: Rules Level Required
 */
export const RulesLevelRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-005',
  name: 'Rules Level Required',
  description: 'All units must have valid rules level',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    const validRulesLevels = Object.values(RulesLevel);
    if (!unit.rulesLevel || !validRulesLevels.includes(unit.rulesLevel)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit must have a valid rules level',
          {
            field: 'rulesLevel',
            actual: String(unit.rulesLevel),
            suggestion:
              'Select Introductory, Standard, Advanced, or Experimental',
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
