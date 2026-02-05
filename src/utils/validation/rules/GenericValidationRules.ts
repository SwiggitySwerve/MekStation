import { MechLocation } from '../../../types/construction/CriticalSlotAllocation';
import {
  MechConfiguration,
  configurationRegistry,
} from '../../../types/construction/MechConfigurationSystem';
import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { pass, fail } from './validationHelpers';

export const ValidLocationsRule: IValidationRuleDefinition = {
  id: 'configuration.valid_locations',
  name: 'Valid Locations',
  description:
    'Validates that all used locations are valid for the mech configuration',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
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
    const errors: IValidationError[] = [];

    if (equipment) {
      for (const item of equipment) {
        const location = item.location as MechLocation | undefined;
        if (location && !validLocations.has(location)) {
          errors.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: ValidationSeverity.ERROR,
            category: this.category,
            message: `Location ${location} is not valid for ${config} mechs`,
            path: `equipment.${item.name}`,
            suggestion: `Use one of: ${Array.from(validLocations).join(', ')}`,
          });
        }
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

export const GenericValidationRules = [ValidLocationsRule];
