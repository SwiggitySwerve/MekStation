/**
 * VAL-UNIV-004: Tech Base Required
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { isValidTechBase } from '@/types/enums/TechBase';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { addRuleDiagnostic, createRuleResult } from '../ruleResults';

const TECH_BASE_REQUIRED_TECH_BASE_CATEGORY = ValidationCategory.TECH_BASE;

/**
 * VAL-UNIV-004: Tech Base Required
 */
export const TechBaseRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-004',
  name: 'Tech Base Required',
  description: 'All units must declare tech base',
  category: TECH_BASE_REQUIRED_TECH_BASE_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 4,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const techBaseRequiredDiagnostics: IUnitValidationError[] = [];

    if (!unit.techBase || !isValidTechBase(unit.techBase)) {
      addRuleDiagnostic(
        techBaseRequiredDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Unit must have a valid tech base',
        {
          field: 'techBase',
          actual: String(unit.techBase),
          suggestion: 'Select Inner Sphere or Clan tech base',
        },
      );
    }

    return createRuleResult(this, { errors: techBaseRequiredDiagnostics });
  },
};
