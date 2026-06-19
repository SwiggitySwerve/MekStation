/**
 * Equipment Unit Type Validation Rules
 *
 * Rules for validating equipment compatibility with unit types and locations.
 * Part of Phase 0.6 of the multi-unit-type-support change.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { isValidLocationForUnitType } from '@/types/construction/UnitLocation';
import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
} from '@/types/validation/UnitValidationInterfaces';

import {
  createRuleResult,
  createEmptyRuleResult,
  addRuleDiagnostic,
} from '../ruleResults';
import {
  IncompatibleEquipmentCheck,
  RequiredEquipmentCheck,
} from './EquipmentUnitTypeRuleConstraintChecks';
import {
  IValidatableEquipmentItem,
  isUnitTypeAllowed,
  TURRET_CAPABLE_UNIT_TYPES,
} from './EquipmentUnitTypeRuleTypes';

const EQUIPMENT_UNIT_TYPE_RULES_EQUIPMENT_CATEGORY =
  ValidationCategory.EQUIPMENT;

export type { IValidatableEquipmentItem } from './EquipmentUnitTypeRuleTypes';
export { IncompatibleEquipmentCheck, RequiredEquipmentCheck };

export const EquipmentUnitTypeCompatibility: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-001',
  name: 'Equipment Unit Type Compatibility',
  description: 'All mounted equipment must be compatible with the unit type',
  category: EQUIPMENT_UNIT_TYPE_RULES_EQUIPMENT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 100,

  canValidate(context: IUnitValidationContext): boolean {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    return unit.equipment !== undefined && unit.equipment.length > 0;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    const errors: IUnitValidationError[] = [];

    if (!unit.equipment) {
      return createEmptyRuleResult(this);
    }

    const unitType = context.unitType;

    for (const item of unit.equipment) {
      if (!isUnitTypeAllowed(unitType, item.allowedUnitTypes)) {
        const allowedTypes =
          item.allowedUnitTypes?.join(', ') || 'standard units';
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          `${item.name} cannot be mounted on ${unitType}`,
          {
            field: `equipment.${item.id}`,
            expected: `Unit type in [${allowedTypes}]`,
            actual: unitType,
            suggestion: `Remove ${item.name} or use a compatible unit type`,
            details: {
              equipmentId: item.equipmentId,
              location: item.location,
              allowedUnitTypes: item.allowedUnitTypes,
            },
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

export const EquipmentLocationCompatibility: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-002',
  name: 'Equipment Location Compatibility',
  description: 'Equipment must be mounted in valid locations for the unit type',
  category: EQUIPMENT_UNIT_TYPE_RULES_EQUIPMENT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 101,

  canValidate(context: IUnitValidationContext): boolean {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    return unit.equipment !== undefined && unit.equipment.length > 0;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    const errors: IUnitValidationError[] = [];

    if (!unit.equipment) {
      return createEmptyRuleResult(this);
    }

    const unitType = context.unitType;

    for (const item of unit.equipment) {
      if (!isValidLocationForUnitType(item.location, unitType)) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          `${item.name} mounted in invalid location "${item.location}" for ${unitType}`,
          {
            field: `equipment.${item.id}.location`,
            expected: `Valid ${unitType} location`,
            actual: item.location,
            suggestion: `Move ${item.name} to a valid location`,
            details: {
              equipmentId: item.equipmentId,
            },
          },
        );
        continue;
      }

      if (item.allowedLocations && item.allowedLocations.length > 0) {
        if (!item.allowedLocations.includes(item.location)) {
          addRuleDiagnostic(
            errors,
            this,
            UnitValidationSeverity.ERROR,
            `${item.name} cannot be mounted in ${item.location}`,
            {
              field: `equipment.${item.id}.location`,
              expected: `One of [${item.allowedLocations.join(', ')}]`,
              actual: item.location,
              suggestion: `Move ${item.name} to one of: ${item.allowedLocations.join(', ')}`,
              details: {
                equipmentId: item.equipmentId,
                allowedLocations: item.allowedLocations,
              },
            },
          );
        }
      }
    }

    return createRuleResult(this, { errors });
  },
};

export const TurretMountingRequirements: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-003',
  name: 'Turret Mounting Requirements',
  description:
    'Turret-mounted equipment requires a unit type with turret capability',
  category: EQUIPMENT_UNIT_TYPE_RULES_EQUIPMENT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 102,

  canValidate(context: IUnitValidationContext): boolean {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    return unit.equipment !== undefined && unit.equipment.length > 0;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
      hasTurret?: boolean;
    };
    const errors: IUnitValidationError[] = [];

    if (!unit.equipment) {
      return createEmptyRuleResult(this);
    }

    const unitType = context.unitType;
    const canHaveTurret = TURRET_CAPABLE_UNIT_TYPES.includes(unitType);

    for (const item of unit.equipment) {
      const isTurretMounted =
        item.isTurretMounted ||
        item.flags?.includes(EquipmentBehaviorFlag.TurretMounted) ||
        item.location === 'Turret';

      if (isTurretMounted && !canHaveTurret) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          `${item.name} requires turret mount but ${unitType} cannot have turrets`,
          {
            field: `equipment.${item.id}`,
            expected:
              'Unit type with turret capability (Vehicle, VTOL, Support Vehicle)',
            actual: unitType,
            suggestion: `Remove ${item.name} or use a vehicle/VTOL unit type`,
            details: {
              equipmentId: item.equipmentId,
              location: item.location,
            },
          },
        );
      }

      if (isTurretMounted && canHaveTurret && unit.hasTurret === false) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          `${item.name} requires a turret but this unit has no turret installed`,
          {
            field: `equipment.${item.id}`,
            expected: 'Unit with turret installed',
            actual: 'No turret',
            suggestion: `Install a turret or remove ${item.name}`,
            details: {
              equipmentId: item.equipmentId,
            },
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

export const EQUIPMENT_UNIT_TYPE_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    EquipmentUnitTypeCompatibility,
    EquipmentLocationCompatibility,
    TurretMountingRequirements,
    IncompatibleEquipmentCheck,
    RequiredEquipmentCheck,
  ];
