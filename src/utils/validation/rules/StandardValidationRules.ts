/**
 * Standard Validation Rules
 *
 * Implements the core validation rules for BattleMech construction.
 *
 * @spec openspec/specs/
 */

import { ARMOR_STATUS } from '@/components/customizer/armor/shared/ArmorFills';

import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';

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
function fail(
  ruleId: string,
  errors: IValidationError[],
): IValidationRuleResult {
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
function warn(
  ruleId: string,
  warnings: IValidationError[],
): IValidationRuleResult {
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
// WEIGHT VALIDATION RULES
// ============================================================================

/**
 * Total weight must not exceed tonnage
 */
export const TotalWeightRule: IValidationRuleDefinition = {
  id: 'weight.total',
  name: 'Total Weight',
  description: 'Validates that total weight does not exceed unit tonnage',
  category: ValidationCategory.WEIGHT,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const tonnage = unit.tonnage as number | undefined;
    const totalWeight = unit.totalWeight as number | undefined;

    if (tonnage === undefined || totalWeight === undefined) {
      return pass(this.id);
    }

    if (totalWeight > tonnage) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Total weight (${totalWeight}t) exceeds tonnage (${tonnage}t)`,
          path: 'totalWeight',
          expected: `<= ${tonnage}`,
          actual: `${totalWeight}`,
          suggestion: `Remove ${(totalWeight - tonnage).toFixed(1)} tons of equipment`,
        },
      ]);
    }

    // Warn if very close to limit
    const remaining = tonnage - totalWeight;
    if (remaining > 0 && remaining < 0.5) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: `Only ${remaining.toFixed(2)} tons remaining`,
          path: 'totalWeight',
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * Weight must be properly rounded to 0.5 tons
 */
export const WeightRoundingRule: IValidationRuleDefinition = {
  id: 'weight.rounding',
  name: 'Weight Rounding',
  description: 'Validates that weights are properly rounded to 0.5 tons',
  category: ValidationCategory.WEIGHT,
  priority: 20,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const totalWeight = unit.totalWeight as number | undefined;

    if (totalWeight === undefined) {
      return pass(this.id);
    }

    // Check if properly rounded to 0.5
    const rounded = Math.round(totalWeight * 2) / 2;
    if (Math.abs(totalWeight - rounded) > 0.001) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: `Weight ${totalWeight} is not properly rounded to 0.5 tons`,
          path: 'totalWeight',
          expected: `${rounded}`,
          actual: `${totalWeight}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

// ============================================================================
// SLOT VALIDATION RULES
// ============================================================================

/**
 * Total critical slots must not exceed 78
 */
export const TotalSlotsRule: IValidationRuleDefinition = {
  id: 'slots.total',
  name: 'Total Critical Slots',
  description: 'Validates that total critical slots do not exceed 78',
  category: ValidationCategory.SLOTS,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Array<Record<string, unknown>>
      | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    // Count used slots
    let usedSlots = 0;
    for (const location of criticalSlots) {
      const slots = location.slots as
        | Array<Record<string, unknown>>
        | undefined;
      if (slots) {
        usedSlots += slots.filter((s) => s.content !== null).length;
      }
    }

    const maxSlots = 78;
    if (usedSlots > maxSlots) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Used critical slots (${usedSlots}) exceed maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

// ============================================================================
// CONSTRUCTION VALIDATION RULES
// ============================================================================

/**
 * Minimum 10 heat sinks required
 */
export const MinimumHeatSinksRule: IValidationRuleDefinition = {
  id: 'construction.min_heat_sinks',
  name: 'Minimum Heat Sinks',
  description: 'Validates that the unit has at least 10 heat sinks',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const heatSinks = unit.heatSinks as Record<string, unknown> | undefined;

    if (!heatSinks) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: 'Heat sink configuration is missing',
          path: 'heatSinks',
        },
      ]);
    }

    const total = heatSinks.total as number | undefined;
    if (total === undefined || total < 10) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Minimum 10 heat sinks required (have ${total ?? 0})`,
          path: 'heatSinks.total',
          expected: '>= 10',
          actual: `${total ?? 0}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * Armor maximum per location
 */
export const ArmorMaximumRule: IValidationRuleDefinition = {
  id: 'construction.armor_max',
  name: 'Maximum Armor',
  description: 'Validates that armor does not exceed location maximums',
  category: ValidationCategory.ARMOR,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as
      | Record<string, number>
      | undefined;
    const structure = unit.structure as Record<string, unknown> | undefined;

    if (!armorAllocation || !structure) {
      return pass(this.id);
    }

    const structurePoints = structure.points as
      | Record<string, number>
      | undefined;
    if (!structurePoints) {
      return pass(this.id);
    }

    const errors: IValidationError[] = [];

    // Check each location
    for (const [location, armor] of Object.entries(armorAllocation)) {
      // Skip rear armor for now (handled with front)
      if (location.includes('Rear')) continue;

      // Get max armor (2x structure, head = 9)
      const isHead = location.toLowerCase().includes('head');
      const structureValue = structurePoints[location] ?? 0;
      const maxArmor = isHead ? 9 : structureValue * 2;

      if (armor > maxArmor) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `${location} armor (${armor}) exceeds maximum (${maxArmor})`,
          path: `armorAllocation.${location}`,
          expected: `<= ${maxArmor}`,
          actual: `${armor}`,
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
 * Armor level warnings - warns when armor is LOW, errors when CRITICAL
 */
export const ArmorLevelRule: IValidationRuleDefinition = {
  id: 'armor.level',
  name: 'Armor Level',
  description: 'Warns when armor is low (20-40%), errors when critical (<20%)',
  category: ValidationCategory.ARMOR,
  priority: 20,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as
      | Record<string, number>
      | undefined;
    const structure = unit.structure as Record<string, unknown> | undefined;

    if (!armorAllocation || !structure) {
      return pass(this.id);
    }

    const structurePoints = structure.points as
      | Record<string, number>
      | undefined;
    if (!structurePoints) {
      return pass(this.id);
    }

    const errors: IValidationError[] = [];
    const warnings: IValidationError[] = [];

    for (const [location, armor] of Object.entries(armorAllocation)) {
      if (location.includes('Rear')) continue;

      const isHead = location.toLowerCase().includes('head');
      const structureValue = structurePoints[location] ?? 0;
      const maxArmor = isHead ? 9 : structureValue * 2;

      if (maxArmor === 0) continue;

      const ratio = armor / maxArmor;

      if (ratio < ARMOR_STATUS.LOW.min) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `${location} armor critically low (${Math.round(ratio * 100)}%)`,
          path: `armorAllocation.${location}`,
          suggestion: `Increase ${location} armor above ${Math.round(ARMOR_STATUS.LOW.min * 100)}%`,
        });
      } else if (ratio < ARMOR_STATUS.MODERATE.min) {
        warnings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: `${location} armor is low (${Math.round(ratio * 100)}%)`,
          path: `armorAllocation.${location}`,
          suggestion: `Consider increasing ${location} armor above ${Math.round(ARMOR_STATUS.MODERATE.min * 100)}%`,
        });
      }
    }

    if (errors.length > 0) {
      return {
        ruleId: this.id,
        passed: false,
        errors,
        warnings,
        infos: [],
        executionTime: 0,
      };
    }

    if (warnings.length > 0) {
      return {
        ruleId: this.id,
        passed: true,
        errors: [],
        warnings,
        infos: [],
        executionTime: 0,
      };
    }

    return pass(this.id);
  },
};

/**
 * Engine rating must be valid
 */
export const EngineRatingRule: IValidationRuleDefinition = {
  id: 'construction.engine_rating',
  name: 'Engine Rating',
  description:
    'Validates engine rating is within valid range and multiple of 5',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const engine = unit.engine as Record<string, unknown> | undefined;

    if (!engine) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: 'Engine configuration is missing',
          path: 'engine',
        },
      ]);
    }

    const rating = engine.rating as number | undefined;
    const errors: IValidationError[] = [];

    if (rating === undefined) {
      errors.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.ERROR,
        category: this.category,
        message: 'Engine rating is missing',
        path: 'engine.rating',
      });
    } else {
      if (rating < 10 || rating > 500) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Engine rating (${rating}) must be between 10 and 500`,
          path: 'engine.rating',
          expected: '10-500',
          actual: `${rating}`,
        });
      }

      if (rating % 5 !== 0) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Engine rating (${rating}) must be a multiple of 5`,
          path: 'engine.rating',
          expected: 'Multiple of 5',
          actual: `${rating}`,
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
// TECH BASE VALIDATION RULES
// ============================================================================

/**
 * Tech base compatibility
 */
export const TechBaseCompatibilityRule: IValidationRuleDefinition = {
  id: 'tech.compatibility',
  name: 'Tech Base Compatibility',
  description: 'Validates component tech base compatibility',
  category: ValidationCategory.TECH_BASE,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const techBase = unit.techBase as string | undefined;

    if (!techBase) {
      return pass(this.id);
    }

    // This would check all components for tech base compatibility
    // Simplified implementation
    return pass(this.id);
  },
};

// ============================================================================
// ERA VALIDATION RULES
// ============================================================================

/**
 * Era availability check
 */
export const EraAvailabilityRule: IValidationRuleDefinition = {
  id: 'era.availability',
  name: 'Era Availability',
  description:
    'Validates that all components are available in the selected era',
  category: ValidationCategory.ERA,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const year = unit.year as number | undefined;

    if (!year) {
      return pass(this.id);
    }

    // This would check all components for era availability
    // Simplified implementation
    return pass(this.id);
  },
};

/**
 * Get all standard validation rules
 */
export function getStandardValidationRules(): IValidationRuleDefinition[] {
  return [
    // Weight
    TotalWeightRule,
    WeightRoundingRule,
    // Slots
    TotalSlotsRule,
    // Construction
    MinimumHeatSinksRule,
    ArmorMaximumRule,
    ArmorLevelRule,
    EngineRatingRule,
    // Tech Base
    TechBaseCompatibilityRule,
    // Era
    EraAvailabilityRule,
  ];
}

/**
 * Register all standard rules with a registry
 */
export function registerStandardRules(registry: {
  register: (rule: IValidationRuleDefinition) => void;
}): void {
  for (const rule of getStandardValidationRules()) {
    registry.register(rule);
  }
}
