import type * as ValidationRules from '@/types/validation/rules/ValidationRuleInterfaces';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  MechConfiguration,
  configurationRegistry,
} from '@/types/construction/MechConfigurationSystem';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';

import { failIfErrors, ruleError, unitRecord } from './validationHelpers';

export const ValidLocationsRule: ValidationRules.IValidationRuleDefinition = {
  priority: 5,
  description:
    'Validates that all used locations are valid for the mech configuration',
  id: 'configuration.valid_locations',
  category: ValidationCategory.CONSTRUCTION,
  name: 'Valid Locations',

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = unitRecord(context);
    const config = (unit.configuration as string) ?? 'Biped';
    const equipment = unit.equipment as
      | Array<Record<string, unknown>>
      | undefined;

    const configType =
      config.toLowerCase() === 'quad'
        ? MechConfiguration.QUAD
        : MechConfiguration.BIPED;

    const validLocations = new Set(
      configurationRegistry.getValidLocations(configType),
    );
    const errors: ValidationRules.IValidationError[] = [];

    if (equipment) {
      for (const item of equipment) {
        const location = item.location as MechLocation | undefined;
        if (location && !validLocations.has(location)) {
          errors.push(
            ruleError(this, {
              message: `Location ${location} is not valid for ${config} mechs`,
              path: `equipment.${item.name}`,
              suggestion: `Use one of: ${Array.from(validLocations).join(', ')}`,
            }),
          );
        }
      }
    }

    return failIfErrors(this.id, errors);
  },
};

export const GenericValidationRules = [ValidLocationsRule];
