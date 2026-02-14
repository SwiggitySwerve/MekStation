/**
 * VAL-UNIV-001: Entity ID Required
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
 * VAL-UNIV-001: Entity ID Required
 */
export const EntityIdRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-001',
  name: 'Entity ID Required',
  description: 'All units must have non-empty id',
  category: ValidationCategory.CONSTRUCTION,
  priority: 1,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!unit.id || unit.id.trim() === '') {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Entity must have non-empty id',
          { field: 'id', suggestion: 'Provide a valid id for the entity' },
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
