/**
 * Configuration-Specific Validation Rules
 *
 * Validation rules for different mech configurations (Biped, Quad, LAM, etc.)
 *
 * @spec openspec/specs/quad-mech-support/spec.md
 */

import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { MechLocation, LOCATION_SLOT_COUNTS } from '../../../types/construction/CriticalSlotAllocation';
import {
  MechConfiguration,
  QUAD_LOCATIONS,
  BIPED_LOCATIONS,
  configurationRegistry,
} from '../../../types/construction/MechConfigurationSystem';

/**
 * Helper to create a passing result
 */
function pass(ruleId: string): IValidationRuleResult {
  return {
    ruleId,
    passed: true,
    errors: [],
    warnings: [],
    infos: [],
    executionTime: 0,
  };
}

/**
 * Helper to create a failing result
 */
function fail(ruleId: string, errors: IValidationError[]): IValidationRuleResult {
  return {
    ruleId,
    passed: false,
    errors,
    warnings: [],
    infos: [],
    executionTime: 0,
  };
}

/**
 * Helper to create a result with warnings
 */
function warn(ruleId: string, warnings: IValidationError[]): IValidationRuleResult {
  return {
    ruleId,
    passed: true,
    errors: [],
    warnings,
    infos: [],
    executionTime: 0,
  };
}

// ============================================================================
// CONFIGURATION-SPECIFIC RULES
// ============================================================================

/**
 * Quad mechs cannot have arm-mounted equipment
 */
export const QuadNoArmsRule: IValidationRuleDefinition = {
  id: 'configuration.quad.no_arms',
  name: 'Quad No Arms',
  description: 'Validates that quad mechs do not have equipment in arm locations',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quad';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const equipment = unit.equipment as Array<Record<string, unknown>> | undefined;

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

/**
 * Quad mechs must have exactly 4 legs
 */
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
    const armorAllocation = unit.armorAllocation as Record<string, unknown> | undefined;

    const quadLegs = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];

    const errors: IValidationError[] = [];

    // Check armor allocation has all quad legs
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

/**
 * Validate location is valid for configuration
 */
export const ValidLocationsRule: IValidationRuleDefinition = {
  id: 'configuration.valid_locations',
  name: 'Valid Locations',
  description: 'Validates that all used locations are valid for the mech configuration',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const config = (unit.configuration as string) ?? 'Biped';
    const equipment = unit.equipment as Array<Record<string, unknown>> | undefined;

    const configType = config.toLowerCase() === 'quad'
      ? MechConfiguration.QUAD
      : MechConfiguration.BIPED;

    const validLocations = new Set(configurationRegistry.getValidLocations(configType));
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

/**
 * Quad mech total critical slots (different from biped)
 */
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
    const criticalSlots = unit.criticalSlots as Record<string, Array<unknown>> | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    // Quad mechs: 6 (head) + 12*3 (torsos) + 12*4 (quad legs) = 6 + 36 + 48 = 90 slots
    // Calculate dynamically from canonical source
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
    const maxSlots = quadLocations.reduce((sum, loc) => sum + LOCATION_SLOT_COUNTS[loc], 0);
    let usedSlots = 0;

    for (const [_location, slots] of Object.entries(criticalSlots)) {
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

/**
 * Quad leg armor balance warning
 */
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
    const armorAllocation = unit.armorAllocation as Record<string, number> | undefined;

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

    // Warn if legs differ by more than 50%
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

    // Warn if front legs have much less armor than rear
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

/**
 * Biped cannot have quad leg locations
 */
export const BipedNoQuadLegsRule: IValidationRuleDefinition = {
  id: 'configuration.biped.no_quad_legs',
  name: 'Biped No Quad Legs',
  description: 'Validates that biped mechs do not use quad leg locations',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() !== 'quad';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const equipment = unit.equipment as Array<Record<string, unknown>> | undefined;

    if (!equipment) {
      return pass(this.id);
    }

    const quadLegLocations = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];
    const errors: IValidationError[] = [];

    for (const item of equipment) {
      const location = item.location as string | undefined;
      if (location && quadLegLocations.includes(location as MechLocation)) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Biped mechs cannot use quad leg location ${location}`,
          path: `equipment.${item.name}`,
          suggestion: 'Use standard leg or arm locations',
        });
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

// ============================================================================
// LAM CONFIGURATION RULES
// ============================================================================

/**
 * LAM maximum tonnage is 55 tons
 */
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

/**
 * LAM engine type restriction - only standard fusion allowed
 */
export const LAMEngineTypeRule: IValidationRuleDefinition = {
  id: 'configuration.lam.engine_type',
  name: 'LAM Engine Type',
  description: 'LAMs can only use standard Fusion engines (no XL, Light, Compact)',
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
    const prohibitedEngines = ['xl', 'light', 'compact', 'xxl', 'ice', 'fuel_cell', 'fission'];

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

/**
 * LAM structure/armor restrictions - no Endo Steel or Ferro-Fibrous
 */
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

    // Check structure type
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

    // Check armor type
    if (armor) {
      const armorType = (armor.type as string)?.toLowerCase() ?? '';
      const prohibitedArmor = ['ferro', 'stealth', 'reactive', 'reflective', 'hardened'];

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

/**
 * LAM requires Landing Gear equipment
 */
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
    const criticalSlots = unit.criticalSlots as Record<string, Array<string | null>> | undefined;

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
        (s) => s && s.toLowerCase().includes('landing gear')
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

/**
 * LAM requires Avionics equipment
 */
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
    const criticalSlots = unit.criticalSlots as Record<string, Array<string | null>> | undefined;

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
        (s) => s && s.toLowerCase().includes('avionics')
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

// ============================================================================
// TRIPOD CONFIGURATION RULES
// ============================================================================

/**
 * Tripod mech must have center leg location
 */
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

/**
 * Tripod mech leg equipment spanning rule
 * Certain equipment (tracks, talons) must be installed in all three legs
 */
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

    // Equipment that must span all three legs
    const legSpanningEquipment = ['tracks', 'talons', 'claws'];
    const legLocations = [
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
      MechLocation.CENTER_LEG,
    ];
    const errors: IValidationError[] = [];

    // Check each leg-spanning equipment type
    for (const equipType of legSpanningEquipment) {
      const legsWithEquip: string[] = [];

      for (const loc of legLocations) {
        const slots = criticalSlots[loc];
        if (slots?.some((s) => s && s.toLowerCase().includes(equipType))) {
          legsWithEquip.push(loc);
        }
      }

      // If equipment found in some but not all legs, it's an error
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

/**
 * Tripod mech total critical slots
 */
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

    // Tripod mechs: 6 (head) + 12*3 (torsos) + 12*2 (arms) + 6*3 (legs) = 6 + 36 + 24 + 18 = 84 slots
    const maxSlots = 84;
    let usedSlots = 0;

    for (const [_location, slots] of Object.entries(criticalSlots)) {
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

/**
 * Tripod leg armor balance warning
 */
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

    // Warn if legs differ by more than 50%
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

    // Center leg typically needs good armor as loss is critical
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

// ============================================================================
// QUADVEE CONFIGURATION RULES
// ============================================================================

/**
 * QuadVee must have conversion equipment in all four legs
 */
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
    const criticalSlots = unit.criticalSlots as Record<string, Array<string | null>> | undefined;

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
        (s) => s && s.toLowerCase().includes('conversion')
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

/**
 * QuadVee tracks must be in all four legs if present
 */
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
    const criticalSlots = unit.criticalSlots as Record<string, Array<string | null>> | undefined;

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

    // If tracks found in some but not all legs, it's an error
    if (legsWithTracks.length > 0 && legsWithTracks.length < 4) {
      const missingLegs = legLocations.filter((l) => !legsWithTracks.includes(l));
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

/**
 * QuadVee mech total critical slots (same as Quad)
 */
export const QuadVeeTotalSlotsRule: IValidationRuleDefinition = {
  id: 'configuration.quadvee.total_slots',
  name: 'QuadVee Total Slots',
  description: 'Validates that QuadVee mech critical slots do not exceed maximum',
  category: ValidationCategory.SLOTS,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() === 'quadvee';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as Record<string, Array<unknown>> | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    // QuadVee: 6 (head) + 12*3 (torsos) + 12*4 (legs) = 6 + 36 + 48 = 90 slots available
    // But with conversion equipment in each leg (1 slot each), effective is 86
    const maxSlots = 90;
    let usedSlots = 0;

    for (const [_location, slots] of Object.entries(criticalSlots)) {
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

/**
 * QuadVee leg armor balance warning
 */
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
    const armorAllocation = unit.armorAllocation as Record<string, number> | undefined;

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

    // Warn if legs differ by more than 50%
    if (maxArmor > 0 && (maxArmor - minArmor) / maxArmor > 0.5) {
      warnings.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.WARNING,
        category: this.category,
        message: `QuadVee leg armor varies significantly (${minArmor} to ${maxArmor})`,
        path: 'armorAllocation',
        suggestion: 'Consider balancing leg armor - uneven armor affects vehicle mode stability',
      });
    }

    // Front vs rear leg balance (important for vehicle mode)
    const avgFrontArmor =
      ((armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0) +
        (armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0)) /
      2;
    const avgRearArmor =
      ((armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0) +
        (armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0)) /
      2;

    if (avgFrontArmor > 0 && avgRearArmor > 0) {
      const ratio = Math.min(avgFrontArmor, avgRearArmor) / Math.max(avgFrontArmor, avgRearArmor);
      if (ratio < 0.5) {
        warnings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: 'Front and rear leg armor significantly unbalanced',
          path: 'armorAllocation',
          suggestion: 'Balance front/rear armor for vehicle mode - both ends need protection',
        });
      }
    }

    if (warnings.length > 0) {
      return warn(this.id, warnings);
    }

    return pass(this.id);
  },
};

// ============================================================================
// OMNIMECH CONFIGURATION RULES
// ============================================================================

/**
 * OmniMech base chassis heat sinks must not exceed total heat sinks
 */
export const OmniMechBaseHeatSinksRule: IValidationRuleDefinition = {
  id: 'configuration.omnimech.base_heat_sinks',
  name: 'OmniMech Base Heat Sinks',
  description: 'Validates that base chassis heat sinks do not exceed total heat sinks',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    return unit.isOmni === true;
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const baseChassisHeatSinks = unit.baseChassisHeatSinks as number | undefined;
    const heatSinkCount = unit.heatSinkCount as number | undefined;

    // -1 means auto-calculate, which is always valid
    if (baseChassisHeatSinks === undefined || baseChassisHeatSinks === -1) {
      return pass(this.id);
    }

    if (heatSinkCount !== undefined && baseChassisHeatSinks > heatSinkCount) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Base chassis heat sinks (${baseChassisHeatSinks}) cannot exceed total heat sinks (${heatSinkCount})`,
          path: 'baseChassisHeatSinks',
          expected: `<= ${heatSinkCount}`,
          actual: `${baseChassisHeatSinks}`,
          suggestion: 'Reduce base chassis heat sinks or increase total heat sink count',
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * OmniMech base chassis heat sinks must be non-negative when set
 */
export const OmniMechBaseHeatSinksValidRule: IValidationRuleDefinition = {
  id: 'configuration.omnimech.base_heat_sinks_valid',
  name: 'OmniMech Base Heat Sinks Valid',
  description: 'Validates that base chassis heat sinks value is valid',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    return unit.isOmni === true;
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const baseChassisHeatSinks = unit.baseChassisHeatSinks as number | undefined;

    // -1 means auto-calculate, undefined is also valid (uses default)
    if (baseChassisHeatSinks === undefined || baseChassisHeatSinks === -1) {
      return pass(this.id);
    }

    if (baseChassisHeatSinks < 0) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Base chassis heat sinks cannot be negative (got ${baseChassisHeatSinks})`,
          path: 'baseChassisHeatSinks',
          expected: '>= 0 or -1 for auto',
          actual: `${baseChassisHeatSinks}`,
          suggestion: 'Set base chassis heat sinks to 0 or higher, or use -1 for auto',
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * OmniMech should have at least some fixed equipment (warning)
 * Standard OmniMechs have engine, gyro, structure, cockpit fixed
 */
export const OmniMechFixedEquipmentRule: IValidationRuleDefinition = {
  id: 'configuration.omnimech.fixed_equipment',
  name: 'OmniMech Fixed Equipment',
  description: 'Warns if OmniMech has no fixed equipment defined',
  category: ValidationCategory.CONSTRUCTION,
  priority: 50,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    return unit.isOmni === true;
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const equipment = unit.equipment as Array<Record<string, unknown>> | undefined;

    if (!equipment || equipment.length === 0) {
      // No equipment at all is fine for empty OmniMech
      return pass(this.id);
    }

    // Check if any equipment is NOT pod-mounted (i.e., fixed)
    const hasFixedEquipment = equipment.some(
      (item) => item.isOmniPodMounted !== true
    );

    if (!hasFixedEquipment) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: 'OmniMech has no fixed (chassis-mounted) equipment',
          path: 'equipment',
          suggestion: 'Mark some equipment as fixed to define the base chassis configuration',
        },
      ]);
    }

    return pass(this.id);
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get all configuration-specific validation rules
 */
export function getConfigurationValidationRules(): IValidationRuleDefinition[] {
  return [
    // Quad rules
    QuadNoArmsRule,
    QuadLegCountRule,
    QuadTotalSlotsRule,
    QuadLegArmorBalanceRule,
    // Biped rules
    BipedNoQuadLegsRule,
    // LAM rules
    LAMMaxTonnageRule,
    LAMEngineTypeRule,
    LAMStructureArmorRule,
    LAMLandingGearRule,
    LAMAvionicsRule,
    // Tripod rules
    TripodCenterLegRule,
    TripodLegEquipmentRule,
    TripodTotalSlotsRule,
    TripodLegArmorBalanceRule,
    // QuadVee rules
    QuadVeeConversionEquipmentRule,
    QuadVeeTracksRule,
    QuadVeeTotalSlotsRule,
    QuadVeeLegArmorBalanceRule,
    // OmniMech rules
    OmniMechBaseHeatSinksRule,
    OmniMechBaseHeatSinksValidRule,
    OmniMechFixedEquipmentRule,
    // Generic configuration rules
    ValidLocationsRule,
  ];
}

/**
 * Register all configuration rules with a registry
 */
export function registerConfigurationRules(registry: {
  register: (rule: IValidationRuleDefinition) => void;
}): void {
  for (const rule of getConfigurationValidationRules()) {
    registry.register(rule);
  }
}
