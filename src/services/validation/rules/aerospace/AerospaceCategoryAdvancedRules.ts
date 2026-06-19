import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { addRuleDiagnostic, createRuleResult } from '../ruleResults';
import {
  AEROSPACE_UNIT_TYPES,
  AEROSPACE_WEAPON_ARCS,
  MAX_REAR_WEAPONS_BY_TONNAGE,
  MIN_THRUST_WEIGHT_RATIO,
  THRUST_REQUIRED_TYPES,
  isAerospaceUnit,
  isAerospaceUnitExtended,
} from './AerospaceCategoryRuleTypes';

const AEROSPACE_CATEGORY_ADVANCED_RULES_MOVEMENT_CATEGORY =
  ValidationCategory.MOVEMENT;
const AEROSPACE_CATEGORY_ADVANCED_RULES_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;
const AEROSPACE_CATEGORY_ADVANCED_RULES_EQUIPMENT_CATEGORY =
  ValidationCategory.EQUIPMENT;

export const AeroThrustWeightRatio: IUnitValidationRuleDefinition = {
  id: 'AERO-THRUST-001',
  name: 'Thrust/Weight Ratio',
  description:
    'Aerospace fighters must have sufficient thrust for their weight',
  category: AEROSPACE_CATEGORY_ADVANCED_RULES_MOVEMENT_CATEGORY,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,
  priority: 44,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];
    const warnings: IUnitValidationError[] = [];

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
          addRuleDiagnostic(
            errors,
            this,
            UnitValidationSeverity.ERROR,
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
          );
        } else if (ratio < minRatio * 1.5) {
          addRuleDiagnostic(
            warnings,
            this,
            UnitValidationSeverity.WARNING,
            `Thrust/weight ratio is low: ${ratio.toFixed(3)}`,
            {
              field: 'thrust',
              suggestion: 'Consider increasing thrust for better performance',
            },
          );
        }
      }
    }

    return createRuleResult(this, { errors, warnings });
  },
};

export const AeroMinFuelCapacity: IUnitValidationRuleDefinition = {
  id: 'AERO-FUEL-001',
  name: 'Minimum Fuel Capacity',
  description: 'Aerospace units must have minimum fuel capacity for operations',
  category: AEROSPACE_CATEGORY_ADVANCED_RULES_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,
  priority: 45,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];
    const warnings: IUnitValidationError[] = [];

    if (
      isAerospaceUnitExtended(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType)
    ) {
      const fuelCapacity = unit.fuelCapacity ?? 0;
      const minFuel = Math.ceil(unit.weight * 0.2 * 80);

      if (fuelCapacity < minFuel) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
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
        );
      } else if (fuelCapacity < minFuel * 1.25) {
        addRuleDiagnostic(
          warnings,
          this,
          UnitValidationSeverity.WARNING,
          `Fuel capacity is low: ${fuelCapacity} points`,
          {
            field: 'fuelCapacity',
            suggestion: 'Consider adding more fuel for extended operations',
          },
        );
      }
    }

    return createRuleResult(this, { errors, warnings });
  },
};

export const AeroMaxFuelCapacity: IUnitValidationRuleDefinition = {
  id: 'AERO-FUEL-002',
  name: 'Maximum Fuel Capacity',
  description: 'Fuel capacity must not exceed maximum allowed for unit',
  category: AEROSPACE_CATEGORY_ADVANCED_RULES_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,
  priority: 46,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isAerospaceUnitExtended(unit)) {
      const fuelCapacity = unit.fuelCapacity ?? 0;
      const maxFuelCapacity = unit.maxFuelCapacity;

      if (maxFuelCapacity !== undefined && fuelCapacity > maxFuelCapacity) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
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
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

export const AeroWeaponArcAssignments: IUnitValidationRuleDefinition = {
  id: 'AERO-ARC-001',
  name: 'Weapon Arc Assignments',
  description: 'All aerospace weapons must have valid arc assignments',
  category: AEROSPACE_CATEGORY_ADVANCED_RULES_EQUIPMENT_CATEGORY,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,
  priority: 47,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];
    const infos: IUnitValidationError[] = [];

    if (isAerospaceUnitExtended(unit) && unit.weapons) {
      for (const weapon of unit.weapons) {
        if (!weapon.arc) {
          addRuleDiagnostic(
            errors,
            this,
            UnitValidationSeverity.ERROR,
            `Weapon "${weapon.name}" has no arc assignment`,
            {
              field: `weapons.${weapon.id}.arc`,
              suggestion: `Assign weapon to one of: ${AEROSPACE_WEAPON_ARCS.join(', ')}`,
            },
          );
        } else if (!AEROSPACE_WEAPON_ARCS.includes(weapon.arc)) {
          addRuleDiagnostic(
            errors,
            this,
            UnitValidationSeverity.ERROR,
            `Weapon "${weapon.name}" has invalid arc: ${weapon.arc}`,
            {
              field: `weapons.${weapon.id}.arc`,
              expected: AEROSPACE_WEAPON_ARCS.join(' | '),
              actual: weapon.arc,
              suggestion: `Change arc to one of: ${AEROSPACE_WEAPON_ARCS.join(', ')}`,
            },
          );
        }
      }

      if (unit.weapons.length === 0) {
        addRuleDiagnostic(
          infos,
          this,
          UnitValidationSeverity.INFO,
          'Unit has no weapons assigned',
          {
            suggestion: 'Consider adding weapons for combat capability',
          },
        );
      }
    }

    return createRuleResult(this, { errors, infos });
  },
};

export const AeroRearArcWeaponRestrictions: IUnitValidationRuleDefinition = {
  id: 'AERO-ARC-002',
  name: 'Rear-Arc Weapon Restrictions',
  description: 'Aerospace units have limited rear-arc weapon capacity',
  category: AEROSPACE_CATEGORY_ADVANCED_RULES_EQUIPMENT_CATEGORY,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,
  priority: 48,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];
    const warnings: IUnitValidationError[] = [];

    if (
      isAerospaceUnitExtended(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType) &&
      unit.weapons
    ) {
      const rearWeapons = unit.weapons.filter(
        (w) => w.arc === 'aft' || w.isRearMounting,
      );
      const rearWeaponCount = rearWeapons.length;

      let maxRearWeapons = 1;
      for (const bracket of MAX_REAR_WEAPONS_BY_TONNAGE) {
        if (unit.weight <= bracket.maxTonnage) {
          maxRearWeapons = bracket.maxWeapons;
          break;
        }
      }

      if (rearWeaponCount > maxRearWeapons) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
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
        );
      } else if (rearWeaponCount === maxRearWeapons && maxRearWeapons > 0) {
        addRuleDiagnostic(
          warnings,
          this,
          UnitValidationSeverity.WARNING,
          `Rear-arc weapon capacity at maximum: ${rearWeaponCount}/${maxRearWeapons}`,
          {
            suggestion: 'Cannot add more rear-arc weapons',
          },
        );
      }
    }

    return createRuleResult(this, { errors, warnings });
  },
};
