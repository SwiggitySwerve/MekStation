import type * as ValidationRules from '@/types/validation/rules/ValidationRuleInterfaces';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import {
  countUsedCriticalSlots,
  fail,
  failIfErrors,
  forConfiguration,
  pass,
  ruleError,
  unitRecord,
  warnIfWarnings,
} from './validationHelpers';

export const TripodCenterLegRule: ValidationRules.IValidationRuleDefinition = {
  priority: 5,
  category: ValidationCategory.CONSTRUCTION,
  description: 'Validates that tripod mechs have a center leg location',
  id: 'configuration.tripod.center_leg',
  name: 'Tripod Center Leg Required',

  canValidate: forConfiguration('tripod'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = unitRecord(context);
    const armorAllocation = unit.armorAllocation as
      | Record<string, number>
      | undefined;
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<unknown>>
      | undefined;

    const hasCenterLegArmor =
      armorAllocation && MechLocation.CENTER_LEG in armorAllocation;
    const hasCenterLegSlots =
      criticalSlots && MechLocation.CENTER_LEG in criticalSlots;

    if (!hasCenterLegArmor && !hasCenterLegSlots) {
      return fail(this.id, [
        ruleError(this, {
          message: 'Tripod mech missing Center Leg location',
          path: 'configuration',
          suggestion: 'Add Center Leg (CL) location for tripod configuration',
        }),
      ]);
    }

    return pass(this.id);
  },
};

export const TripodLegEquipmentRule: ValidationRules.IValidationRuleDefinition =
  {
    id: 'configuration.tripod.leg_equipment',
    name: 'Tripod Leg Equipment Spanning',
    description: 'Validates that leg-spanning equipment is in all three legs',
    category: ValidationCategory.CONSTRUCTION,
    priority: 10,

    canValidate: forConfiguration('tripod'),

    validate(
      context: ValidationRules.IValidationContext,
    ): ValidationRules.IValidationRuleResult {
      const unit = unitRecord(context);
      const criticalSlots = unit.criticalSlots as
        | Record<string, Array<string | null>>
        | undefined;

      if (!criticalSlots) {
        return pass(this.id);
      }

      const legSpanningEquipment = ['tracks', 'talons', 'claws'];
      const legLocations = [
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
      const errors: ValidationRules.IValidationError[] = [];

      for (const equipType of legSpanningEquipment) {
        const legsWithEquip: string[] = [];

        for (const loc of legLocations) {
          const slots = criticalSlots[loc];
          if (slots?.some((s) => s && s.toLowerCase().includes(equipType))) {
            legsWithEquip.push(loc);
          }
        }

        if (legsWithEquip.length > 0 && legsWithEquip.length < 3) {
          const missingLegs = legLocations.filter(
            (l) => !legsWithEquip.includes(l),
          );
          errors.push(
            ruleError(this, {
              message: `${equipType.charAt(0).toUpperCase() + equipType.slice(1)} must be installed in all three legs`,
              path: 'criticalSlots',
              suggestion: `Add ${equipType} to: ${missingLegs.join(', ')}`,
            }),
          );
        }
      }

      return failIfErrors(this.id, errors);
    },
  };

export const TripodTotalSlotsRule: ValidationRules.IValidationRuleDefinition = {
  priority: 10,
  category: ValidationCategory.SLOTS,
  description:
    'Validates that tripod mech critical slots do not exceed maximum',
  id: 'configuration.tripod.total_slots',
  name: 'Tripod Total Slots',

  canValidate: forConfiguration('tripod'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = unitRecord(context);
    const criticalSlots = unit.criticalSlots as
      | Record<string, Array<unknown>>
      | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    const maxSlots = 84;
    const usedSlots = countUsedCriticalSlots(criticalSlots);

    if (usedSlots > maxSlots) {
      return fail(this.id, [
        ruleError(this, {
          message: `Used critical slots (${usedSlots}) exceed tripod maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        }),
      ]);
    }

    return pass(this.id);
  },
};

export const TripodLegArmorBalanceRule: ValidationRules.IValidationRuleDefinition =
  {
    id: 'configuration.tripod.leg_armor_balance',
    name: 'Tripod Leg Armor Balance',
    description: 'Warns if tripod leg armor is significantly unbalanced',
    category: ValidationCategory.ARMOR,
    priority: 50,

    canValidate: forConfiguration('tripod'),

    validate(
      context: ValidationRules.IValidationContext,
    ): ValidationRules.IValidationRuleResult {
      const unit = unitRecord(context);
      const armorAllocation = unit.armorAllocation as
        | Record<string, number>
        | undefined;

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
      const warnings: ValidationRules.IValidationError[] = [];

      if (maxArmor > 0 && (maxArmor - minArmor) / maxArmor > 0.5) {
        warnings.push(
          ruleError(this, {
            severity: ValidationSeverity.WARNING,
            message: `Tripod leg armor varies significantly (${minArmor} to ${maxArmor})`,
            path: 'armorAllocation',
            suggestion:
              'Consider balancing leg armor for consistent protection',
          }),
        );
      }

      const centerLegArmor = armorAllocation[MechLocation.CENTER_LEG] ?? 0;
      const avgSideLegArmor =
        ((armorAllocation[MechLocation.LEFT_LEG] ?? 0) +
          (armorAllocation[MechLocation.RIGHT_LEG] ?? 0)) /
        2;

      if (centerLegArmor > 0 && centerLegArmor < avgSideLegArmor * 0.75) {
        warnings.push(
          ruleError(this, {
            severity: ValidationSeverity.WARNING,
            message: 'Center leg has significantly less armor than side legs',
            path: `armorAllocation.${MechLocation.CENTER_LEG}`,
            suggestion:
              'Center leg loss is critical for tripods - consider more armor',
          }),
        );
      }

      return warnIfWarnings(this.id, warnings);
    },
  };

export const TripodValidationRules = [
  TripodCenterLegRule,
  TripodLegEquipmentRule,
  TripodTotalSlotsRule,
  TripodLegArmorBalanceRule,
];
