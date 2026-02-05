import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '../../../types/construction/CriticalSlotAllocation';
import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { pass, fail, warn } from './validationHelpers';

export const QuadNoArmsRule: IValidationRuleDefinition = {
  id: 'configuration.quad.no_arms',
  name: 'Quad No Arms',
  description:
    'Validates that quad mechs do not have equipment in arm locations',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quad';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const equipment = unit.equipment as
      | Array<Record<string, unknown>>
      | undefined;

    if (!equipment) {
      return pass(this.id);
    }

    const armLocations = [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM];
    const errors: IValidationError[] = [];

    for (const item of equipment) {
      const location = item.location as string | undefined;
      if (location && armLocations.includes(location as MechLocation)) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Quad mechs cannot have equipment in ${location}`,
          path: `equipment.${item.name}`,
          suggestion: 'Move equipment to a leg or torso location',
        });
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

export const QuadLegCountRule: IValidationRuleDefinition = {
  id: 'configuration.quad.leg_count',
  name: 'Quad Leg Count',
  description: 'Validates that quad mechs have all four leg locations defined',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quad';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as
      | Record<string, unknown>
      | undefined;

    const quadLegs = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];

    const errors: IValidationError[] = [];

    if (armorAllocation) {
      for (const leg of quadLegs) {
        if (!(leg in armorAllocation) && armorAllocation[leg] === undefined) {
          errors.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: ValidationSeverity.ERROR,
            category: this.category,
            message: `Quad mech missing ${leg} location`,
            path: `armorAllocation.${leg}`,
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

export const QuadTotalSlotsRule: IValidationRuleDefinition = {
  id: 'configuration.quad.total_slots',
  name: 'Quad Total Slots',
  description: 'Validates that quad mech critical slots do not exceed maximum',
  category: ValidationCategory.SLOTS,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quad';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
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
          message: `Used critical slots (${usedSlots}) exceed quad maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

export const QuadLegArmorBalanceRule: IValidationRuleDefinition = {
  id: 'configuration.quad.leg_armor_balance',
  name: 'Quad Leg Armor Balance',
  description: 'Warns if quad leg armor is significantly unbalanced',
  category: ValidationCategory.ARMOR,
  priority: 50,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quad';
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
        message: `Quad leg armor varies significantly (${minArmor} to ${maxArmor})`,
        path: 'armorAllocation',
        suggestion: 'Consider balancing leg armor for consistent protection',
      });
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
      warnings.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.WARNING,
        category: this.category,
        message: 'Front legs have significantly less armor than rear legs',
        path: 'armorAllocation',
        suggestion: 'Front legs typically face more combat exposure',
      });
    }

    if (warnings.length > 0) {
      return warn(this.id, warnings);
    }

    return pass(this.id);
  },
};

export const QuadValidationRules = [
  QuadNoArmsRule,
  QuadLegCountRule,
  QuadTotalSlotsRule,
  QuadLegArmorBalanceRule,
];
