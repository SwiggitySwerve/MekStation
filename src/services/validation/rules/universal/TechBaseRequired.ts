/**
 * VAL-UNIV-004: Tech Base Required
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { isValidTechBase } from '../../../../types/enums/TechBase';
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
 * VAL-UNIV-004: Tech Base Required
 */
export const TechBaseRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-004',
  name: 'Tech Base Required',
  description: 'All units must declare tech base',
  category: ValidationCategory.TECH_BASE,
  priority: 4,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!unit.techBase || !isValidTechBase(unit.techBase)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit must have a valid tech base',
          {
            field: 'techBase',
            actual: String(unit.techBase),
            suggestion: 'Select Inner Sphere or Clan tech base',
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
