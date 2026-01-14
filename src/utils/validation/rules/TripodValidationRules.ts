import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { MechLocation } from '../../../types/construction/CriticalSlotAllocation';
import { pass, fail, warn } from './validationHelpers';

export const TripodCenterLegRule: IValidationRuleDefinition = {
  id: 'configuration.tripod.center_leg',
  name: 'Tripod Center Leg Required',
  description: 'Validates that tripod mechs have a center leg location',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'tripod';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as Record<string, number> | undefined;
    const criticalSlots = unit.criticalSlots as Record<string, Array<unknown>> | undefined;

    const hasCenterLegArmor =
      armorAllocation && MechLocation.CENTER_LEG in armorAllocation;
    const hasCenterLegSlots =
      criticalSlots && MechLocation.CENTER_LEG in criticalSlots;

    if (!hasCenterLegArmor && !hasCenterLegSlots) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: 'Tripod mech missing Center Leg location',
          path: 'configuration',
          suggestion: 'Add Center Leg (CL) location for tripod configuration',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const TripodLegEquipmentRule: IValidationRuleDefinition = {
  id: 'configuration.tripod.leg_equipment',
  name: 'Tripod Leg Equipment Spanning',
  description: 'Validates that leg-spanning equipment is in all three legs',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'tripod';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as Record<string, Array<string | null>> | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    const legSpanningEquipment = ['tracks', 'talons', 'claws'];
    const legLocations = [
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
      MechLocation.CENTER_LEG,
    ];
    const errors: IValidationError[] = [];

    for (const equipType of legSpanningEquipment) {
      const legsWithEquip: string[] = [];

      for (const loc of legLocations) {
        const slots = criticalSlots[loc];
        if (slots?.some((s) => s && s.toLowerCase().includes(equipType))) {
          legsWithEquip.push(loc);
        }
      }

      if (legsWithEquip.length > 0 && legsWithEquip.length < 3) {
        const missingLegs = legLocations.filter((l) => !legsWithEquip.includes(l));
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `${equipType.charAt(0).toUpperCase() + equipType.slice(1)} must be installed in all three legs`,
          path: 'criticalSlots',
          suggestion: `Add ${equipType} to: ${missingLegs.join(', ')}`,
        });
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

export const TripodTotalSlotsRule: IValidationRuleDefinition = {
  id: 'configuration.tripod.total_slots',
  name: 'Tripod Total Slots',
  description: 'Validates that tripod mech critical slots do not exceed maximum',
  category: ValidationCategory.SLOTS,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'tripod';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as Record<string, Array<unknown>> | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    const maxSlots = 84;
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
          message: `Used critical slots (${usedSlots}) exceed tripod maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

export const TripodLegArmorBalanceRule: IValidationRuleDefinition = {
  id: 'configuration.tripod.leg_armor_balance',
  name: 'Tripod Leg Armor Balance',
  description: 'Warns if tripod leg armor is significantly unbalanced',
  category: ValidationCategory.ARMOR,
  priority: 50,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'tripod';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as Record<string, number> | undefined;

    if (!armorAllocation) {
      return pass(this.id);
    }

    const legArmor = [
      armorAllocation[MechLocation.LEFT_LEG] ?? 0,
      armorAllocation[MechLocation.RIGHT_LEG] ?? 0,
      armorAllocation[MechLocation.CENTER_LEG] ?? 0,
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
        message: `Tripod leg armor varies significantly (${minArmor} to ${maxArmor})`,
        path: 'armorAllocation',
        suggestion: 'Consider balancing leg armor for consistent protection',
      });
    }

    const centerLegArmor = armorAllocation[MechLocation.CENTER_LEG] ?? 0;
    const avgSideLegArmor =
      ((armorAllocation[MechLocation.LEFT_LEG] ?? 0) +
        (armorAllocation[MechLocation.RIGHT_LEG] ?? 0)) /
      2;

    if (centerLegArmor > 0 && centerLegArmor < avgSideLegArmor * 0.75) {
      warnings.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.WARNING,
        category: this.category,
        message: 'Center leg has significantly less armor than side legs',
        path: `armorAllocation.${MechLocation.CENTER_LEG}`,
        suggestion: 'Center leg loss is critical for tripods - consider more armor',
      });
    }

    if (warnings.length > 0) {
      return warn(this.id, warnings);
    }

    return pass(this.id);
  },
};

export const TripodValidationRules = [
  TripodCenterLegRule,
  TripodLegEquipmentRule,
  TripodTotalSlotsRule,
  TripodLegArmorBalanceRule,
];
