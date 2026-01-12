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
import { MechLocation } from '../../../types/construction/CriticalSlotAllocation';
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

    // Quad mechs: 6 (head) + 12*3 (torsos) + 6*4 (legs) = 6 + 36 + 24 = 66 slots
    const maxSlots = 66;
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
