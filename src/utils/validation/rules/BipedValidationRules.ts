import type * as ValidationRules from '@/types/validation/rules/ValidationRuleInterfaces';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';

import {
  failIfErrors,
  pass,
  ruleError,
  unitRecord,
  withoutConfiguration,
} from './validationHelpers';

export const BipedNoQuadLegsRule: ValidationRules.IValidationRuleDefinition = {
  category: ValidationCategory.CONSTRUCTION,
  id: 'configuration.biped.no_quad_legs',
  priority: 5,
  name: 'Biped No Quad Legs',
  description: 'Validates that biped mechs do not use quad leg locations',

  canValidate: withoutConfiguration('quad'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = unitRecord(context);
    const equipment = unit.equipment as
      | Array<Record<string, unknown>>
      | undefined;

    if (!equipment) {
      return pass(this.id);
    }

    const quadLegLocations = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];
    const errors: ValidationRules.IValidationError[] = [];

    for (const item of equipment) {
      const location = item.location as string | undefined;
      if (location && quadLegLocations.includes(location as MechLocation)) {
        errors.push(
          ruleError(this, {
            message: `Biped mechs cannot use quad leg location ${location}`,
            path: `equipment.${item.name}`,
            suggestion: 'Use standard leg or arm locations',
          }),
        );
      }
    }

    return failIfErrors(this.id, errors);
  },
};

export const BipedValidationRules = [BipedNoQuadLegsRule];
