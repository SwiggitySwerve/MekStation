/**
 * VAL-UNIV-007: Temporal Consistency
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

const TEMPORAL_CONSISTENCY_ERA_CATEGORY = ValidationCategory.ERA;

/**
 * VAL-UNIV-007: Temporal Consistency
 */
export const TemporalConsistency: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-007',
  name: 'Temporal Consistency',
  description: 'Extinction year must be after introduction year',
  category: TEMPORAL_CONSISTENCY_ERA_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 7,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const temporalConsistencyDiagnostics: IUnitValidationError[] = [];

    if (
      unit.extinctionYear !== undefined &&
      unit.extinctionYear <= unit.introductionYear
    ) {
      addRuleDiagnostic(
        temporalConsistencyDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Extinction year must be after introduction year',
        {
          field: 'extinctionYear',
          expected: `> ${unit.introductionYear}`,
          actual: String(unit.extinctionYear),
          suggestion:
            'Correct the extinction year to be after the introduction year',
        },
      );
    }

    return createRuleResult(this, { errors: temporalConsistencyDiagnostics });
  },
};
