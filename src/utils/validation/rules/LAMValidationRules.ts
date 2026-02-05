import { MechLocation } from '../../../types/construction/CriticalSlotAllocation';
import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { pass, fail, warn } from './validationHelpers';

export const LAMMaxTonnageRule: IValidationRuleDefinition = {
  id: 'configuration.lam.max_tonnage',
  name: 'LAM Max Tonnage',
  description: 'LAMs cannot exceed 55 tons',
  category: ValidationCategory.CONSTRUCTION,
  priority: 1,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'lam';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const tonnage = unit.tonnage as number | undefined;

    if (tonnage !== undefined && tonnage > 55) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `LAMs cannot exceed 55 tons (current: ${tonnage} tons)`,
          path: 'tonnage',
          expected: '<= 55',
          actual: `${tonnage}`,
          suggestion: 'Reduce the mech tonnage to 55 or less',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const LAMEngineTypeRule: IValidationRuleDefinition = {
  id: 'configuration.lam.engine_type',
  name: 'LAM Engine Type',
  description:
    'LAMs can only use standard Fusion engines (no XL, Light, Compact)',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'lam';
  },

  validate(context: IValidationContext): IValidationRuleResult {
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
        return fail(this.id, [
          {
            ruleId: this.id,
            ruleName: this.name,
            severity: ValidationSeverity.ERROR,
            category: this.category,
            message: `LAMs cannot use ${engine.type} engines`,
            path: 'engine.type',
            expected: 'FUSION (Standard)',
            actual: `${engine.type}`,
            suggestion: 'Use a standard Fusion engine',
          },
        ]);
      }
    }

    return pass(this.id);
  },
};

export const LAMStructureArmorRule: IValidationRuleDefinition = {
  id: 'configuration.lam.structure_armor',
  name: 'LAM Structure/Armor Restrictions',
  description: 'LAMs cannot use Endo Steel or Ferro-Fibrous armor/structure',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'lam';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const structure = unit.structure as Record<string, unknown> | undefined;
    const armor = unit.armor as Record<string, unknown> | undefined;
    const errors: IValidationError[] = [];

    if (structure) {
      const structureType = (structure.type as string)?.toLowerCase() ?? '';
      if (structureType.includes('endo')) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `LAMs cannot use ${structure.type} structure`,
          path: 'structure.type',
          expected: 'STANDARD',
          actual: `${structure.type}`,
          suggestion: 'Use standard internal structure',
        });
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
          errors.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: ValidationSeverity.ERROR,
            category: this.category,
            message: `LAMs cannot use ${armor.type} armor`,
            path: 'armor.type',
            expected: 'STANDARD',
            actual: `${armor.type}`,
            suggestion: 'Use standard armor',
          });
          break;
        }
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

export const LAMLandingGearRule: IValidationRuleDefinition = {
  id: 'configuration.lam.landing_gear',
  name: 'LAM Landing Gear Required',
  description: 'LAMs must have Landing Gear in CT, LT, and RT',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'lam';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<string | null>>
      | undefined;

    if (!criticalSlots) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: 'Cannot verify Landing Gear - no critical slot data',
          path: 'criticalSlots',
        },
      ]);
    }

    const requiredLocations = [
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ];
    const missingLocations: string[] = [];

    for (const loc of requiredLocations) {
      const slots = criticalSlots[loc];
      if (!slots) {
        missingLocations.push(loc);
        continue;
      }

      const hasLandingGear = slots.some(
        (s) => s && s.toLowerCase().includes('landing gear'),
      );
      if (!hasLandingGear) {
        missingLocations.push(loc);
      }
    }

    if (missingLocations.length > 0) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `LAM missing Landing Gear in: ${missingLocations.join(', ')}`,
          path: 'criticalSlots',
          suggestion: 'Add Landing Gear to CT, LT, and RT',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const LAMAvionicsRule: IValidationRuleDefinition = {
  id: 'configuration.lam.avionics',
  name: 'LAM Avionics Required',
  description: 'LAMs must have Avionics in HD, LT, and RT',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'lam';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<string | null>>
      | undefined;

    if (!criticalSlots) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: 'Cannot verify Avionics - no critical slot data',
          path: 'criticalSlots',
        },
      ]);
    }

    const requiredLocations = [
      MechLocation.HEAD,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ];
    const missingLocations: string[] = [];

    for (const loc of requiredLocations) {
      const slots = criticalSlots[loc];
      if (!slots) {
        missingLocations.push(loc);
        continue;
      }

      const hasAvionics = slots.some(
        (s) => s && s.toLowerCase().includes('avionics'),
      );
      if (!hasAvionics) {
        missingLocations.push(loc);
      }
    }

    if (missingLocations.length > 0) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `LAM missing Avionics in: ${missingLocations.join(', ')}`,
          path: 'criticalSlots',
          suggestion: 'Add Avionics to HD, LT, and RT',
        },
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
