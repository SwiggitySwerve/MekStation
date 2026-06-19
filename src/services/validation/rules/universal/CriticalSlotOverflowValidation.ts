/**
 * VAL-UNIV-015: Critical Slot Overflow Validation
 * ERROR: Any location exceeds its maximum critical slot capacity
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';

import {
  createRuleResult,
  createEmptyRuleResult,
  addRuleDiagnostic,
} from '../ruleResults';

const CRITICAL_SLOT_OVERFLOW_VALIDATION_SLOTS_CATEGORY =
  ValidationCategory.SLOTS;

/**
 * VAL-UNIV-015: Critical Slot Overflow Validation
 */
export const CriticalSlotOverflowValidation: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-015',
  name: 'Critical Slot Overflow Validation',
  description: 'Validate no location exceeds its critical slot capacity',
  category: CRITICAL_SLOT_OVERFLOW_VALIDATION_SLOTS_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 15,

  canValidate(context: IUnitValidationContext): boolean {
    return context.unit.slotsByLocation !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (!unit.slotsByLocation) {
      return createEmptyRuleResult(this);
    }

    for (const [locationKey, slotInfo] of Object.entries(
      unit.slotsByLocation,
    )) {
      const displayName = slotInfo.displayName || locationKey;

      if (slotInfo.used > slotInfo.max) {
        const overage = slotInfo.used - slotInfo.max;
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.CRITICAL_ERROR,
          `${displayName} exceeds slot capacity by ${overage} (${slotInfo.used}/${slotInfo.max} slots)`,
          {
            field: `criticalSlots.${locationKey}`,
            expected: `<= ${slotInfo.max} slots`,
            actual: `${slotInfo.used} slots`,
            suggestion: `Remove or relocate equipment from ${displayName}`,
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};
