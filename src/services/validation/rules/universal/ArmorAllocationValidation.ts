/**
 * VAL-UNIV-013: Per-Location Armor Validation
 * ERROR: Locations with armor below 20% of maximum (critical)
 * WARNING: Locations with armor between 20-40% of maximum (low)
 *
 * Thresholds align with ArmorFills.tsx status colors:
 * - HEALTHY: >= 60%
 * - MODERATE: >= 40%
 * - LOW: >= 20% (warning)
 * - CRITICAL: < 20% (error)
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
} from '../../../../types/validation/UnitValidationInterfaces';

/**
 * VAL-UNIV-013: Per-Location Armor Validation
 */
export const ArmorAllocationValidation: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-013',
  name: 'Armor Allocation Validation',
  description: 'Validate armor is allocated to all locations',
  category: ValidationCategory.ARMOR,
  priority: 13,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    return context.unit.armorByLocation !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: ReturnType<typeof createUnitValidationError>[] = [];
    const warnings: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.armorByLocation) {
      return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
    }

    const armor = unit.armorByLocation;
    const CRITICAL_THRESHOLD = 0.2; // < 20% = error
    const LOW_THRESHOLD = 0.4; // < 40% but >= 20% = warning

    // Check each location - uses displayName from the armor entry
    // This supports all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)
    for (const [locationKey, locationArmor] of Object.entries(armor)) {
      const displayName = locationArmor.displayName || locationKey;

      if (locationArmor.max <= 0) continue;

      const ratio = locationArmor.current / locationArmor.max;

      // ERROR: Location has critical armor (< 20%)
      if (ratio < CRITICAL_THRESHOLD) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            locationArmor.current === 0
              ? `${displayName} has no armor - will be destroyed on first hit`
              : `${displayName} has critical armor (${locationArmor.current}/${locationArmor.max}, ${Math.round(ratio * 100)}%)`,
            {
              field: `armorAllocation.${locationKey}`,
              expected: `>= ${Math.ceil(locationArmor.max * CRITICAL_THRESHOLD)} (20%)`,
              actual: String(locationArmor.current),
              suggestion: `Allocate more armor to ${displayName} in the Armor tab`,
            },
          ),
        );
      }
      // WARNING: Location has low armor (20-40%)
      else if (ratio < LOW_THRESHOLD) {
        warnings.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.WARNING,
            this.category,
            `${displayName} has low armor (${locationArmor.current}/${locationArmor.max}, ${Math.round(ratio * 100)}%)`,
            {
              field: `armorAllocation.${locationKey}`,
              expected: `>= ${Math.ceil(locationArmor.max * LOW_THRESHOLD)} (40%)`,
              actual: String(locationArmor.current),
              suggestion: `Consider adding more armor to ${displayName}`,
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      warnings,
      [],
      0,
    );
  },
};
