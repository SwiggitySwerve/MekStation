/**
 * VAL-UNIV-005: Rules Level Required
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { RulesLevel } from '@/types/enums';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { addRuleDiagnostic, createRuleResult } from '../ruleResults';

const RULES_LEVEL_REQUIRED_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-005: Rules Level Required
 */
export const RulesLevelRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-005',
  name: 'Rules Level Required',
  description: 'All units must have valid rules level',
  category: RULES_LEVEL_REQUIRED_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 5,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const rulesLevelRequiredDiagnostics: IUnitValidationError[] = [];

    const validRulesLevels = Object.values(RulesLevel);
    if (!unit.rulesLevel || !validRulesLevels.includes(unit.rulesLevel)) {
      addRuleDiagnostic(
        rulesLevelRequiredDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Unit must have a valid rules level',
        {
          field: 'rulesLevel',
          actual: String(unit.rulesLevel),
          suggestion:
            'Select Introductory, Standard, Advanced, or Experimental',
        },
      );
    }

    return createRuleResult(this, { errors: rulesLevelRequiredDiagnostics });
  },
};
