import type * as ValidationRules from '@/types/validation/rules/ValidationRuleInterfaces';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import {
  fail,
  failIfErrors,
  forConfiguration,
  missingLocationsForSlotText,
  pass,
  ruleError,
  warn,
} from './validationHelpers';

export const LAMMaxTonnageRule: ValidationRules.IValidationRuleDefinition = {
  id: 'configuration.lam.max_tonnage',
  priority: 1,
  name: 'LAM Max Tonnage',
  category: ValidationCategory.CONSTRUCTION,
  description: 'LAMs cannot exceed 55 tons',

  canValidate: forConfiguration('lam'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const tonnage = unit.tonnage as number | undefined;

    if (tonnage !== undefined && tonnage > 55) {
      const errors = [
        ruleError(this, {
          message: `LAMs cannot exceed 55 tons (current: ${tonnage} tons)`,
          path: 'tonnage',
          expected: '<= 55',
          actual: `${tonnage}`,
          suggestion: 'Reduce the mech tonnage to 55 or less',
        }),
      ];

      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

export const LAMEngineTypeRule: ValidationRules.IValidationRuleDefinition = {
  id: 'configuration.lam.engine_type',
  priority: 5,
  name: 'LAM Engine Type',
  category: ValidationCategory.CONSTRUCTION,
  description:
    'LAMs can only use standard Fusion engines (no XL, Light, Compact)',

  canValidate: forConfiguration('lam'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const engine = unit.engine as Record<string, unknown> | undefined;

    if (!engine) {
      return pass(this.id);
    }

    const engineType = (engine.type as string)?.toLowerCase() ?? '';
    const prohibitedEngines = [
      'xl',
      'light',
      'compact',
      'xxl',
      'ice',
      'fuel_cell',
      'fission',
    ];

    for (const prohibited of prohibitedEngines) {
      if (engineType.includes(prohibited)) {
        const errors = [
          ruleError(this, {
            message: `LAMs cannot use ${engine.type} engines`,
            path: 'engine.type',
            expected: 'FUSION (Standard)',
            actual: `${engine.type}`,
            suggestion: 'Use a standard Fusion engine',
          }),
        ];

        return fail(this.id, errors);
      }
    }

    return pass(this.id);
  },
};

export const LAMStructureArmorRule: ValidationRules.IValidationRuleDefinition =
  {
    id: 'configuration.lam.structure_armor',
    priority: 5,
    category: ValidationCategory.CONSTRUCTION,
    description: 'LAMs cannot use Endo Steel or Ferro-Fibrous armor/structure',
    name: 'LAM Structure/Armor Restrictions',

    canValidate(context: ValidationRules.IValidationContext): boolean {
      const unit = context.unit as Record<string, unknown>;
      const config = unit.configuration as string | undefined;
      return config?.toLowerCase() === 'lam';
    },

    validate(
      context: ValidationRules.IValidationContext,
    ): ValidationRules.IValidationRuleResult {
      const unit = context.unit as Record<string, unknown>;
      const structure = unit.structure as Record<string, unknown> | undefined;
      const armor = unit.armor as Record<string, unknown> | undefined;
      const errors: ValidationRules.IValidationError[] = [];

      if (structure) {
        const structureType = (structure.type as string)?.toLowerCase() ?? '';
        if (structureType.includes('endo')) {
          errors.push(
            ruleError(this, {
              message: `LAMs cannot use ${structure.type} structure`,
              path: 'structure.type',
              expected: 'STANDARD',
              actual: `${structure.type}`,
              suggestion: 'Use standard internal structure',
            }),
          );
        }
      }

      if (armor) {
        const armorType = (armor.type as string)?.toLowerCase() ?? '';
        const prohibitedArmor = [
          'ferro',
          'stealth',
          'reactive',
          'reflective',
          'hardened',
        ];

        for (const prohibited of prohibitedArmor) {
          if (armorType.includes(prohibited)) {
            errors.push(
              ruleError(this, {
                message: `LAMs cannot use ${armor.type} armor`,
                path: 'armor.type',
                expected: 'STANDARD',
                actual: `${armor.type}`,
                suggestion: 'Use standard armor',
              }),
            );
            break;
          }
        }
      }

      return failIfErrors(this.id, errors);
    },
  };

export const LAMLandingGearRule: ValidationRules.IValidationRuleDefinition = {
  id: 'configuration.lam.landing_gear',
  priority: 10,
  name: 'LAM Landing Gear Required',
  category: ValidationCategory.CONSTRUCTION,
  description: 'LAMs must have Landing Gear in CT, LT, and RT',

  canValidate: forConfiguration('lam'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<string | null>>
      | undefined;

    if (!criticalSlots) {
      return warn(this.id, [
        ruleError(this, {
          severity: ValidationSeverity.WARNING,
          message: 'Cannot verify Landing Gear - no critical slot data',
          path: 'criticalSlots',
        }),
      ]);
    }

    const requiredLocations = [
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ];
    const missingLocations = missingLocationsForSlotText(
      criticalSlots,
      requiredLocations,
      'landing gear',
    );

    if (missingLocations.length > 0) {
      return fail(this.id, [
        ruleError(this, {
          message: `LAM missing Landing Gear in: ${missingLocations.join(', ')}`,
          path: 'criticalSlots',
          suggestion: 'Add Landing Gear to CT, LT, and RT',
        }),
      ]);
    }

    return pass(this.id);
  },
};

export const LAMAvionicsRule: ValidationRules.IValidationRuleDefinition = {
  id: 'configuration.lam.avionics',
  priority: 10,
  name: 'LAM Avionics Required',
  category: ValidationCategory.CONSTRUCTION,
  description: 'LAMs must have Avionics in HD, LT, and RT',

  canValidate: forConfiguration('lam'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<string | null>>
      | undefined;

    if (!criticalSlots) {
      return warn(this.id, [
        ruleError(this, {
          severity: ValidationSeverity.WARNING,
          message: 'Cannot verify Avionics - no critical slot data',
          path: 'criticalSlots',
        }),
      ]);
    }

    const requiredLocations = [
      MechLocation.HEAD,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ];
    const missingLocations = missingLocationsForSlotText(
      criticalSlots,
      requiredLocations,
      'avionics',
    );

    if (missingLocations.length > 0) {
      return fail(this.id, [
        ruleError(this, {
          message: `LAM missing Avionics in: ${missingLocations.join(', ')}`,
          path: 'criticalSlots',
          suggestion: 'Add Avionics to HD, LT, and RT',
        }),
      ]);
    }

    return pass(this.id);
  },
};

export const LAMValidationRules = [
  LAMMaxTonnageRule,
  LAMEngineTypeRule,
  LAMStructureArmorRule,
  LAMLandingGearRule,
  LAMAvionicsRule,
];
