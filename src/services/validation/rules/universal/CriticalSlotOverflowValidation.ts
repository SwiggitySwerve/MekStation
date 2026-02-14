/**
 * VAL-UNIV-015: Critical Slot Overflow Validation
 * ERROR: Any location exceeds its maximum critical slot capacity
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
 * VAL-UNIV-015: Critical Slot Overflow Validation
 */
export const CriticalSlotOverflowValidation: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-015',
  name: 'Critical Slot Overflow Validation',
  description: 'Validate no location exceeds its critical slot capacity',
  category: ValidationCategory.SLOTS,
  priority: 15,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    return context.unit.slotsByLocation !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.slotsByLocation) {
      return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
    }

    for (const [locationKey, slotInfo] of Object.entries(
      unit.slotsByLocation,
    )) {
      const displayName = slotInfo.displayName || locationKey;

      if (slotInfo.used > slotInfo.max) {
        const overage = slotInfo.used - slotInfo.max;
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            `${displayName} exceeds slot capacity by ${overage} (${slotInfo.used}/${slotInfo.max} slots)`,
            {
              field: `criticalSlots.${locationKey}`,
              expected: `<= ${slotInfo.max} slots`,
              actual: `${slotInfo.used} slots`,
              suggestion: `Remove or relocate equipment from ${displayName}`,
            },
          ),
        );
      }
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
