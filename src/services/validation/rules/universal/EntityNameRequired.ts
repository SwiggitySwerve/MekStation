/**
 * VAL-UNIV-002: Entity Name Required
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
 * VAL-UNIV-002: Entity Name Required
 */
export const EntityNameRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-002',
  name: 'Entity Name Required',
  description: 'All units must have non-empty name',
  category: ValidationCategory.CONSTRUCTION,
  priority: 2,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!unit.name || unit.name.trim() === '') {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Entity must have non-empty name',
          { field: 'name', suggestion: 'Provide a valid name for the entity' },
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
