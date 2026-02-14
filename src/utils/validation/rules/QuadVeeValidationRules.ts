import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { pass, fail, warn } from './validationHelpers';

export const QuadVeeConversionEquipmentRule: IValidationRuleDefinition = {
  id: 'configuration.quadvee.conversion_equipment',
  name: 'QuadVee Conversion Equipment',
  description: 'QuadVees require conversion equipment in all four legs',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quadvee';
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
          message: 'Cannot verify conversion equipment - no critical slot data',
          path: 'criticalSlots',
        },
      ]);
    }

    const legLocations = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];

    const missingLocations: string[] = [];

    for (const loc of legLocations) {
      const slots = criticalSlots[loc];
      const hasConversion = slots?.some(
        (s) => s && s.toLowerCase().includes('conversion'),
      );
      if (!hasConversion) {
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
          message: `QuadVee missing conversion equipment in: ${missingLocations.join(', ')}`,
          path: 'criticalSlots',
          suggestion: 'Add conversion equipment to all four legs',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const QuadVeeTracksRule: IValidationRuleDefinition = {
  id: 'configuration.quadvee.tracks',
  name: 'QuadVee Tracks Spanning',
  description: 'QuadVee tracks must be installed in all four legs',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quadvee';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<string | null>>
      | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    const legLocations = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];

    const legsWithTracks: string[] = [];

    for (const loc of legLocations) {
      const slots = criticalSlots[loc];
      if (slots?.some((s) => s && s.toLowerCase().includes('track'))) {
        legsWithTracks.push(loc);
      }
    }

    if (legsWithTracks.length > 0 && legsWithTracks.length < 4) {
      const missingLegs = legLocations.filter(
        (l) => !legsWithTracks.includes(l),
      );
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: 'Tracks must be installed in all four legs',
          path: 'criticalSlots',
          suggestion: `Add tracks to: ${missingLegs.join(', ')}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

export const QuadVeeTotalSlotsRule: IValidationRuleDefinition = {
  id: 'configuration.quadvee.total_slots',
  name: 'QuadVee Total Slots',
  description:
    'Validates that QuadVee mech critical slots do not exceed maximum',
  category: ValidationCategory.SLOTS,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quadvee';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<unknown>>
      | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    const maxSlots = 66;
    let usedSlots = 0;

    for (const [, slots] of Object.entries(criticalSlots)) {
      if (Array.isArray(slots)) {
        usedSlots += slots.filter((s) => s !== null && s !== '-Empty-').length;
      }
    }

    if (usedSlots > maxSlots) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Used critical slots (${usedSlots}) exceed QuadVee maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

export const QuadVeeLegArmorBalanceRule: IValidationRuleDefinition = {
  id: 'configuration.quadvee.leg_armor_balance',
  name: 'QuadVee Leg Armor Balance',
  description: 'Warns if QuadVee leg armor is significantly unbalanced',
  category: ValidationCategory.ARMOR,
  priority: 50,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quadvee';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as
      | Record<string, number>
      | undefined;

    if (!armorAllocation) {
      return pass(this.id);
    }

    const legArmor = [
      armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
      armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
      armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
      armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
    ];

    const maxArmor = Math.max(...legArmor);
    const minArmor = Math.min(...legArmor);
    const warnings: IValidationError[] = [];

    if (maxArmor > 0 && (maxArmor - minArmor) / maxArmor > 0.5) {
      warnings.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.WARNING,
        category: this.category,
        message: `QuadVee leg armor varies significantly (${minArmor} to ${maxArmor})`,
        path: 'armorAllocation',
        suggestion:
          'Consider balancing leg armor - uneven armor affects vehicle mode stability',
      });
    }

    const avgFrontArmor =
      ((armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0) +
        (armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0)) /
      2;
    const avgRearArmor =
      ((armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0) +
        (armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0)) /
      2;

    if (avgFrontArmor > 0 && avgRearArmor > 0) {
      const ratio =
        Math.min(avgFrontArmor, avgRearArmor) /
        Math.max(avgFrontArmor, avgRearArmor);
      if (ratio < 0.5) {
        warnings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: 'Front and rear leg armor significantly unbalanced',
          path: 'armorAllocation',
          suggestion:
            'Balance front/rear armor for vehicle mode - both ends need protection',
        });
      }
    }

    if (warnings.length > 0) {
      return warn(this.id, warnings);
    }

    return pass(this.id);
  },
};

export const QuadVeeValidationRules = [
  QuadVeeConversionEquipmentRule,
  QuadVeeTracksRule,
  QuadVeeTotalSlotsRule,
  QuadVeeLegArmorBalanceRule,
];
