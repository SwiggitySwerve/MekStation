/**
 * Aerospace Category Validation Rules
 *
 * Rules that apply to Aerospace category units.
 * VAL-AERO-001 through VAL-AERO-004.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  IValidatableUnit,
} from '../../../../types/validation/UnitValidationInterfaces';

/**
 * Extended aerospace unit interface for aerospace-specific validation
 */
interface IAerospaceUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  thrust?: number;
  structuralIntegrity?: number;
  fuelCapacity?: number;
}

/**
 * All aerospace unit types
 */
const AEROSPACE_UNIT_TYPES: readonly UnitType[] = [
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.SMALL_CRAFT,
  UnitType.DROPSHIP,
  UnitType.JUMPSHIP,
  UnitType.WARSHIP,
  UnitType.SPACE_STATION,
];

/**
 * Unit types that require thrust rating
 */
const THRUST_REQUIRED_TYPES: readonly UnitType[] = [
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
];

/**
 * Type guard for aerospace units
 */
function isAerospaceUnit(unit: IValidatableUnit): unit is IAerospaceUnit {
  return AEROSPACE_UNIT_TYPES.includes(unit.unitType);
}

/**
 * VAL-AERO-001: Engine Required
 */
export const AeroEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-001',
  name: 'Engine Required',
  description: 'All Aerospace category units must have an engine',
  category: ValidationCategory.CONSTRUCTION,
  priority: 40,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit) && !unit.engine) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          'Engine required',
          {
            field: 'engine',
            suggestion: 'Select an engine for the aerospace unit',
          },
        ),
      );
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

/**
 * VAL-AERO-002: Thrust Rating Valid
 */
export const AeroThrustRatingValid: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-002',
  name: 'Thrust Rating Valid',
  description: 'Aerospace fighters must have valid thrust rating',
  category: ValidationCategory.MOVEMENT,
  priority: 41,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (
      isAerospaceUnit(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType)
    ) {
      if (
        unit.thrust === undefined ||
        !Number.isInteger(unit.thrust) ||
        unit.thrust <= 0
      ) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.CRITICAL_ERROR,
            this.category,
            'Thrust rating must be positive integer',
            {
              field: 'thrust',
              expected: '> 0 (integer)',
              actual: String(unit.thrust),
              suggestion: 'Set a valid positive integer thrust rating',
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

/**
 * VAL-AERO-003: Structural Integrity Required
 */
export const AeroStructuralIntegrityRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-003',
  name: 'Structural Integrity Required',
  description: 'Aerospace units must have positive structural integrity',
  category: ValidationCategory.CONSTRUCTION,
  priority: 42,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit)) {
      if (
        unit.structuralIntegrity === undefined ||
        unit.structuralIntegrity <= 0
      ) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            'Structural integrity must be positive',
            {
              field: 'structuralIntegrity',
              expected: '> 0',
              actual: String(unit.structuralIntegrity),
              suggestion: 'Set a valid positive structural integrity value',
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

/**
 * VAL-AERO-004: Fuel Capacity Valid
 */
export const AeroFuelCapacityValid: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-004',
  name: 'Fuel Capacity Valid',
  description: 'Aerospace units must have non-negative fuel capacity',
  category: ValidationCategory.CONSTRUCTION,
  priority: 43,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnit(unit)) {
      if (unit.fuelCapacity !== undefined && unit.fuelCapacity < 0) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            'Fuel capacity must be non-negative',
            {
              field: 'fuelCapacity',
              expected: '>= 0',
              actual: String(unit.fuelCapacity),
              suggestion: 'Set a valid non-negative fuel capacity',
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

// =============================================================================
// Additional Aerospace Validation Rules (AERO-*)
// =============================================================================

/**
 * Extended aerospace unit interface with additional fields for validation
 */
interface IAerospaceUnitExtended extends IAerospaceUnit {
  maxFuelCapacity?: number;
  weapons?: Array<{
    id: string;
    name: string;
    arc?: 'nose' | 'left-wing' | 'right-wing' | 'aft';
    isRearMounting?: boolean;
  }>;
}

/**
 * Minimum thrust-to-weight ratios by unit type (Safe Thrust / Tonnage)
 */
const MIN_THRUST_WEIGHT_RATIO: Record<string, number> = {
  [UnitType.AEROSPACE]: 0.1, // 1 Safe Thrust per 10 tons minimum
  [UnitType.CONVENTIONAL_FIGHTER]: 0.1,
};

/**
 * Maximum rear-arc weapons by tonnage bracket
 */
const MAX_REAR_WEAPONS_BY_TONNAGE: Array<{
  maxTonnage: number;
  maxWeapons: number;
}> = [
  { maxTonnage: 50, maxWeapons: 1 },
  { maxTonnage: 75, maxWeapons: 2 },
  { maxTonnage: 100, maxWeapons: 3 },
];

/**
 * Type guard for extended aerospace units
 */
function isAerospaceUnitExtended(
  unit: IValidatableUnit,
): unit is IAerospaceUnitExtended {
  return AEROSPACE_UNIT_TYPES.includes(unit.unitType);
}

/**
 * AERO-THRUST-001: Thrust/Weight Ratio
 * Validates that aerospace fighters have sufficient thrust for their weight
 */
export const AeroThrustWeightRatio: IUnitValidationRuleDefinition = {
  id: 'AERO-THRUST-001',
  name: 'Thrust/Weight Ratio',
  description:
    'Aerospace fighters must have sufficient thrust for their weight',
  category: ValidationCategory.MOVEMENT,
  priority: 44,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];
    const warnings = [];

    if (
      isAerospaceUnit(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType)
    ) {
      const minRatio = MIN_THRUST_WEIGHT_RATIO[unit.unitType] ?? 0.1;
      const thrust = unit.thrust ?? 0;
      const weight = unit.weight;

      if (weight > 0) {
        const ratio = thrust / weight;

        if (ratio < minRatio) {
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
              `Thrust/weight ratio too low: ${ratio.toFixed(3)} (minimum: ${minRatio})`,
              {
                field: 'thrust',
                expected: `>= ${(minRatio * weight).toFixed(0)} thrust for ${weight} tons`,
                actual: `${thrust} thrust`,
                suggestion: `Increase thrust to at least ${Math.ceil(minRatio * weight)}`,
                details: {
                  values: {
                    actual: ratio,
                    min: minRatio,
                    thrust,
                    weight,
                  },
                },
              },
            ),
          );
        } else if (ratio < minRatio * 1.5) {
          // Warning for marginally acceptable thrust
          warnings.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.WARNING,
              this.category,
              `Thrust/weight ratio is low: ${ratio.toFixed(3)}`,
              {
                field: 'thrust',
                suggestion: 'Consider increasing thrust for better performance',
              },
            ),
          );
        }
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

/**
 * AERO-FUEL-001: Minimum Fuel Capacity
 * Validates aerospace units have minimum fuel for operations
 */
export const AeroMinFuelCapacity: IUnitValidationRuleDefinition = {
  id: 'AERO-FUEL-001',
  name: 'Minimum Fuel Capacity',
  description: 'Aerospace units must have minimum fuel capacity for operations',
  category: ValidationCategory.CONSTRUCTION,
  priority: 45,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];
    const warnings = [];

    if (
      isAerospaceUnitExtended(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType)
    ) {
      const fuelCapacity = unit.fuelCapacity ?? 0;
      // Minimum fuel: 1 ton per 5 tons of unit weight (i.e., 20% of tonnage in fuel points)
      const minFuel = Math.ceil(unit.weight * 0.2 * 80); // 80 fuel points per ton

      if (fuelCapacity < minFuel) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            `Fuel capacity too low: ${fuelCapacity} (minimum: ${minFuel} points)`,
            {
              field: 'fuelCapacity',
              expected: `>= ${minFuel} points`,
              actual: `${fuelCapacity} points`,
              suggestion: `Add at least ${Math.ceil((minFuel - fuelCapacity) / 80)} tons of fuel`,
              details: {
                values: {
                  actual: fuelCapacity,
                  min: minFuel,
                },
              },
            },
          ),
        );
      } else if (fuelCapacity < minFuel * 1.25) {
        warnings.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.WARNING,
            this.category,
            `Fuel capacity is low: ${fuelCapacity} points`,
            {
              field: 'fuelCapacity',
              suggestion: 'Consider adding more fuel for extended operations',
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

/**
 * AERO-FUEL-002: Maximum Fuel Capacity
 * Validates fuel capacity doesn't exceed maximum allowed
 */
export const AeroMaxFuelCapacity: IUnitValidationRuleDefinition = {
  id: 'AERO-FUEL-002',
  name: 'Maximum Fuel Capacity',
  description: 'Fuel capacity must not exceed maximum allowed for unit',
  category: ValidationCategory.CONSTRUCTION,
  priority: 46,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (isAerospaceUnitExtended(unit)) {
      const fuelCapacity = unit.fuelCapacity ?? 0;
      const maxFuelCapacity = unit.maxFuelCapacity;

      if (maxFuelCapacity !== undefined && fuelCapacity > maxFuelCapacity) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            `Fuel capacity exceeds maximum: ${fuelCapacity} > ${maxFuelCapacity}`,
            {
              field: 'fuelCapacity',
              expected: `<= ${maxFuelCapacity} points`,
              actual: `${fuelCapacity} points`,
              suggestion: `Reduce fuel to ${maxFuelCapacity} points or less`,
              details: {
                values: {
                  actual: fuelCapacity,
                  max: maxFuelCapacity,
                },
              },
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};

/**
 * AERO-ARC-001: Weapon Arc Assignments
 * Validates all weapons have valid arc assignments
 */
export const AeroWeaponArcAssignments: IUnitValidationRuleDefinition = {
  id: 'AERO-ARC-001',
  name: 'Weapon Arc Assignments',
  description: 'All aerospace weapons must have valid arc assignments',
  category: ValidationCategory.EQUIPMENT,
  priority: 47,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];
    const infos = [];
    const validArcs = ['nose', 'left-wing', 'right-wing', 'aft'];

    if (isAerospaceUnitExtended(unit) && unit.weapons) {
      for (const weapon of unit.weapons) {
        if (!weapon.arc) {
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
              `Weapon "${weapon.name}" has no arc assignment`,
              {
                field: `weapons.${weapon.id}.arc`,
                suggestion: `Assign weapon to one of: ${validArcs.join(', ')}`,
              },
            ),
          );
        } else if (!validArcs.includes(weapon.arc)) {
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
              `Weapon "${weapon.name}" has invalid arc: ${weapon.arc}`,
              {
                field: `weapons.${weapon.id}.arc`,
                expected: validArcs.join(' | '),
                actual: weapon.arc,
                suggestion: `Change arc to one of: ${validArcs.join(', ')}`,
              },
            ),
          );
        }
      }

      // Info: no weapons assigned
      if (unit.weapons.length === 0) {
        infos.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.INFO,
            this.category,
            'Unit has no weapons assigned',
            {
              suggestion: 'Consider adding weapons for combat capability',
            },
          ),
        );
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      infos,
      0,
    );
  },
};

/**
 * AERO-ARC-002: Rear-Arc Weapon Restrictions
 * Validates rear-arc weapon count restrictions
 */
export const AeroRearArcWeaponRestrictions: IUnitValidationRuleDefinition = {
  id: 'AERO-ARC-002',
  name: 'Rear-Arc Weapon Restrictions',
  description: 'Aerospace units have limited rear-arc weapon capacity',
  category: ValidationCategory.EQUIPMENT,
  priority: 48,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];
    const warnings = [];

    if (
      isAerospaceUnitExtended(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType) &&
      unit.weapons
    ) {
      const rearWeapons = unit.weapons.filter(
        (w) => w.arc === 'aft' || w.isRearMounting,
      );
      const rearWeaponCount = rearWeapons.length;

      // Find max allowed for this tonnage
      let maxRearWeapons = 1; // Default for small units
      for (const bracket of MAX_REAR_WEAPONS_BY_TONNAGE) {
        if (unit.weight <= bracket.maxTonnage) {
          maxRearWeapons = bracket.maxWeapons;
          break;
        }
      }

      if (rearWeaponCount > maxRearWeapons) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            `Too many rear-arc weapons: ${rearWeaponCount} (max: ${maxRearWeapons} for ${unit.weight} ton unit)`,
            {
              field: 'weapons',
              expected: `<= ${maxRearWeapons} rear-arc weapons`,
              actual: `${rearWeaponCount} rear-arc weapons`,
              suggestion: `Remove ${rearWeaponCount - maxRearWeapons} rear-arc weapon(s) or relocate to forward arcs`,
              details: {
                values: {
                  actual: rearWeaponCount,
                  max: maxRearWeapons,
                },
                relatedIds: rearWeapons.map((w) => w.id),
              },
            },
          ),
        );
      } else if (rearWeaponCount === maxRearWeapons && maxRearWeapons > 0) {
        warnings.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.WARNING,
            this.category,
            `Rear-arc weapon capacity at maximum: ${rearWeaponCount}/${maxRearWeapons}`,
            {
              suggestion: 'Cannot add more rear-arc weapons',
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

/**
 * All aerospace category validation rules
 */
export const AEROSPACE_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    AeroEngineRequired,
    AeroThrustRatingValid,
    AeroStructuralIntegrityRequired,
    AeroFuelCapacityValid,
    AeroThrustWeightRatio,
    AeroMinFuelCapacity,
    AeroMaxFuelCapacity,
    AeroWeaponArcAssignments,
    AeroRearArcWeaponRestrictions,
  ];
