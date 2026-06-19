import type * as ValidationRules from '@/types/validation/rules/ValidationRuleInterfaces';

import {
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction/CriticalSlotAllocation';
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

export const QuadNoArmsRule: ValidationRules.IValidationRuleDefinition = {
  name: 'Quad No Arms',
  category: ValidationCategory.CONSTRUCTION,
  id: 'configuration.quad.no_arms',
  description:
    'Validates that quad mechs do not have equipment in arm locations',
  priority: 5,

  canValidate: forConfiguration('quad'),

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

    const armLocations = [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM];
    const errors: ValidationRules.IValidationError[] = [];

    for (const item of equipment) {
      const location = item.location as string | undefined;
      if (location && armLocations.includes(location as MechLocation)) {
        errors.push(
          ruleError(this, {
            message: `Quad mechs cannot have equipment in ${location}`,
            path: `equipment.${item.name}`,
            suggestion: 'Move equipment to a leg or torso location',
          }),
        );
      }
    }

    return failIfErrors(this.id, errors);
  },
};

export const QuadLegCountRule: ValidationRules.IValidationRuleDefinition = {
  name: 'Quad Leg Count',
  category: ValidationCategory.CONSTRUCTION,
  id: 'configuration.quad.leg_count',
  description: 'Validates that quad mechs have all four leg locations defined',
  priority: 5,

  canValidate: forConfiguration('quad'),

  validate(
    context: ValidationRules.IValidationContext,
  ): ValidationRules.IValidationRuleResult {
    const unit = unitRecord(context);
    const armorAllocation = unit.armorAllocation as
      | Record<string, unknown>
      | undefined;

    const quadLegs = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];

    const errors: ValidationRules.IValidationError[] = [];

    if (armorAllocation) {
      for (const leg of quadLegs) {
        if (!(leg in armorAllocation) && armorAllocation[leg] === undefined) {
          errors.push(
            ruleError(this, {
              message: `Quad mech missing ${leg} location`,
              path: `armorAllocation.${leg}`,
            }),
          );
        }
      }
    }

    return failIfErrors(this.id, errors);
  },
};

export const QuadTotalSlotsRule: ValidationRules.IValidationRuleDefinition = {
  name: 'Quad Total Slots',
  category: ValidationCategory.SLOTS,
  id: 'configuration.quad.total_slots',
  description: 'Validates that quad mech critical slots do not exceed maximum',
  priority: 10,

  canValidate: forConfiguration('quad'),

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

    const quadLocations = [
      MechLocation.HEAD,
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];
    const maxSlots = quadLocations.reduce(
      (sum, loc) => sum + LOCATION_SLOT_COUNTS[loc],
      0,
    );
    const usedSlots = countUsedCriticalSlots(criticalSlots);

    if (usedSlots > maxSlots) {
      return fail(this.id, [
        ruleError(this, {
          message: `Used critical slots (${usedSlots}) exceed quad maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        }),
      ]);
    }

    return pass(this.id);
  },
};

export const QuadLegArmorBalanceRule: ValidationRules.IValidationRuleDefinition =
  {
    category: ValidationCategory.ARMOR,
    priority: 50,
    description: 'Warns if quad leg armor is significantly unbalanced',
    id: 'configuration.quad.leg_armor_balance',
    name: 'Quad Leg Armor Balance',

    canValidate: forConfiguration('quad'),

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
        armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
        armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
        armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
        armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
      ];

      const maxArmor = Math.max(...legArmor);
      const minArmor = Math.min(...legArmor);
      const warnings: ValidationRules.IValidationError[] = [];

      if (maxArmor > 0 && (maxArmor - minArmor) / maxArmor > 0.5) {
        warnings.push(
          ruleError(this, {
            severity: ValidationSeverity.WARNING,
            message: `Quad leg armor varies significantly (${minArmor} to ${maxArmor})`,
            path: 'armorAllocation',
            suggestion:
              'Consider balancing leg armor for consistent protection',
          }),
        );
      }

      const frontAvg =
        ((armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0) +
          (armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0)) /
        2;
      const rearAvg =
        ((armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0) +
          (armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0)) /
        2;

      if (frontAvg > 0 && rearAvg > frontAvg * 1.5) {
        warnings.push(
          ruleError(this, {
            severity: ValidationSeverity.WARNING,
            message: 'Front legs have significantly less armor than rear legs',
            path: 'armorAllocation',
            suggestion: 'Front legs typically face more combat exposure',
          }),
        );
      }

      return warnIfWarnings(this.id, warnings);
    },
  };

export const QuadValidationRules = [
  QuadNoArmsRule,
  QuadLegCountRule,
  QuadTotalSlotsRule,
  QuadLegArmorBalanceRule,
];
