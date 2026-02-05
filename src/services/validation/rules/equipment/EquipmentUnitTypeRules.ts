/**
 * Equipment Unit Type Validation Rules
 *
 * Rules for validating equipment compatibility with unit types and locations.
 * Part of Phase 0.6 of the multi-unit-type-support change.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { isValidLocationForUnitType } from '../../../../types/construction/UnitLocation';
import { EquipmentBehaviorFlag } from '../../../../types/enums/EquipmentFlag';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  createPassingResult,
} from '../../../../types/validation/UnitValidationInterfaces';

/**
 * Equipment item for validation purposes
 */
export interface IValidatableEquipmentItem {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Location where mounted */
  readonly location: string;
  /** Unit types this equipment is allowed on */
  readonly allowedUnitTypes?: readonly UnitType[];
  /** Locations where this equipment can be mounted */
  readonly allowedLocations?: readonly string[];
  /** Equipment behavior flags */
  readonly flags?: readonly string[];
  /** Is this a turret-mounted weapon */
  readonly isTurretMounted?: boolean;
}

/**
 * Default unit types for equipment without explicit allowedUnitTypes
 */
const DEFAULT_ALLOWED_UNIT_TYPES: readonly UnitType[] = [
  UnitType.BATTLEMECH,
  UnitType.OMNIMECH,
  UnitType.INDUSTRIALMECH,
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.AEROSPACE,
];

/**
 * Check if unit type is in allowed list
 */
function isUnitTypeAllowed(
  unitType: UnitType,
  allowedUnitTypes: readonly UnitType[] | undefined,
): boolean {
  const allowed = allowedUnitTypes ?? DEFAULT_ALLOWED_UNIT_TYPES;
  return allowed.includes(unitType);
}

/**
 * VAL-EQUIP-UNIT-001: Equipment Unit Type Compatibility
 *
 * Validates that all mounted equipment is compatible with the unit type.
 * Equipment defines allowedUnitTypes; if not present, defaults to
 * [BattleMech, OmniMech, IndustrialMech, Vehicle, VTOL, Aerospace].
 */
export const EquipmentUnitTypeCompatibility: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-001',
  name: 'Equipment Unit Type Compatibility',
  description: 'All mounted equipment must be compatible with the unit type',
  category: ValidationCategory.EQUIPMENT,
  priority: 100,
  applicableUnitTypes: 'ALL',

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
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.equipment) {
      return createPassingResult(this.id, this.name);
    }

    const unitType = context.unitType;

    for (const item of unit.equipment) {
      if (!isUnitTypeAllowed(unitType, item.allowedUnitTypes)) {
        const allowedTypes =
          item.allowedUnitTypes?.join(', ') || 'standard units';
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
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
 * VAL-EQUIP-UNIT-002: Equipment Location Compatibility
 *
 * Validates that equipment is mounted in valid locations for the unit type
 * and respects equipment-specific location restrictions.
 */
export const EquipmentLocationCompatibility: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-002',
  name: 'Equipment Location Compatibility',
  description: 'Equipment must be mounted in valid locations for the unit type',
  category: ValidationCategory.EQUIPMENT,
  priority: 101,
  applicableUnitTypes: 'ALL',

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
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.equipment) {
      return createPassingResult(this.id, this.name);
    }

    const unitType = context.unitType;

    for (const item of unit.equipment) {
      // Check if location is valid for unit type
      if (!isValidLocationForUnitType(item.location, unitType)) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
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
          ),
        );
        continue;
      }

      // Check if equipment has location restrictions
      if (item.allowedLocations && item.allowedLocations.length > 0) {
        if (!item.allowedLocations.includes(item.location)) {
          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
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
            ),
          );
        }
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
 * Unit types that support turrets
 */
const TURRET_CAPABLE_UNIT_TYPES: readonly UnitType[] = [
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.SUPPORT_VEHICLE,
];

/**
 * VAL-EQUIP-UNIT-003: Turret Mounting Requirements
 *
 * Validates turret-mounted equipment is only on units that support turrets.
 */
export const TurretMountingRequirements: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-003',
  name: 'Turret Mounting Requirements',
  description:
    'Turret-mounted equipment requires a unit type with turret capability',
  category: ValidationCategory.EQUIPMENT,
  priority: 102,
  applicableUnitTypes: 'ALL',

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
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.equipment) {
      return createPassingResult(this.id, this.name);
    }

    const unitType = context.unitType;
    const canHaveTurret = TURRET_CAPABLE_UNIT_TYPES.includes(unitType);

    for (const item of unit.equipment) {
      // Check turret-mounted flag or TURRET_MOUNTED behavior flag
      const isTurretMounted =
        item.isTurretMounted ||
        item.flags?.includes(EquipmentBehaviorFlag.TurretMounted) ||
        item.location === 'Turret';

      if (isTurretMounted && !canHaveTurret) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
            `${item.name} requires turret mount but ${unitType} cannot have turrets`,
            {
              field: `equipment.${item.id}`,
              expected: `Unit type with turret capability (Vehicle, VTOL, Support Vehicle)`,
              actual: unitType,
              suggestion: `Remove ${item.name} or use a vehicle/VTOL unit type`,
              details: {
                equipmentId: item.equipmentId,
                location: item.location,
              },
            },
          ),
        );
      }

      // For vehicles with turret equipment, check if unit has turret installed
      if (isTurretMounted && canHaveTurret && unit.hasTurret === false) {
        errors.push(
          createUnitValidationError(
            this.id,
            this.name,
            UnitValidationSeverity.ERROR,
            this.category,
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
 * Equipment incompatibility definitions
 */
interface IEquipmentIncompatibility {
  /** Equipment ID or flag that triggers incompatibility */
  readonly source: string;
  /** Equipment IDs or flags that are incompatible */
  readonly incompatibleWith: readonly string[];
  /** Reason for incompatibility */
  readonly reason: string;
}

/**
 * Known equipment incompatibilities
 * Based on TechManual and Total Warfare rules
 */
const EQUIPMENT_INCOMPATIBILITIES: readonly IEquipmentIncompatibility[] = [
  {
    source: EquipmentBehaviorFlag.Masc,
    incompatibleWith: [
      EquipmentBehaviorFlag.Tsm,
      EquipmentBehaviorFlag.IndustrialTsm,
    ],
    reason: 'MASC cannot be combined with Triple Strength Myomer',
  },
  {
    source: EquipmentBehaviorFlag.Tsm,
    incompatibleWith: [EquipmentBehaviorFlag.IndustrialTsm],
    reason: 'Standard TSM cannot be combined with Industrial TSM',
  },
  {
    source: EquipmentBehaviorFlag.Stealth,
    incompatibleWith: [EquipmentBehaviorFlag.HeatSink], // Placeholder - actual rule is complex
    reason: 'Stealth armor has special heat sink requirements',
  },
  {
    source: EquipmentBehaviorFlag.C3s,
    incompatibleWith: [EquipmentBehaviorFlag.C3i],
    reason: 'C3 Slave cannot be combined with C3 Improved',
  },
];

/**
 * VAL-EQUIP-UNIT-004: Incompatible Equipment Check
 *
 * Validates that mutually exclusive equipment is not mounted together.
 */
export const IncompatibleEquipmentCheck: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-004',
  name: 'Incompatible Equipment Check',
  description: 'Mutually exclusive equipment cannot be mounted together',
  category: ValidationCategory.EQUIPMENT,
  priority: 103,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    return unit.equipment !== undefined && unit.equipment.length > 1;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.equipment || unit.equipment.length < 2) {
      return createPassingResult(this.id, this.name);
    }

    // Collect all equipment IDs and flags
    const equipmentIds = new Set<string>();
    const equipmentFlags = new Set<string>();
    const equipmentByIdOrFlag = new Map<string, IValidatableEquipmentItem>();

    for (const item of unit.equipment) {
      equipmentIds.add(item.equipmentId);
      equipmentByIdOrFlag.set(item.equipmentId, item);

      if (item.flags) {
        for (const flag of item.flags) {
          equipmentFlags.add(flag);
          equipmentByIdOrFlag.set(flag, item);
        }
      }
    }

    // Check for incompatibilities
    for (const incompatibility of EQUIPMENT_INCOMPATIBILITIES) {
      const hasSource =
        equipmentIds.has(incompatibility.source) ||
        equipmentFlags.has(incompatibility.source);

      if (!hasSource) continue;

      for (const incompatible of incompatibility.incompatibleWith) {
        const hasIncompatible =
          equipmentIds.has(incompatible) || equipmentFlags.has(incompatible);

        if (hasIncompatible) {
          const sourceItem = equipmentByIdOrFlag.get(incompatibility.source);
          const incompatItem = equipmentByIdOrFlag.get(incompatible);

          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
              incompatibility.reason,
              {
                field: 'equipment',
                expected: `Only one of: ${incompatibility.source} or ${incompatible}`,
                actual: `Both present`,
                suggestion: `Remove either ${sourceItem?.name || incompatibility.source} or ${incompatItem?.name || incompatible}`,
                details: {
                  source: incompatibility.source,
                  incompatible: incompatible,
                },
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
      [],
      [],
      0,
    );
  },
};

/**
 * Required equipment definitions per unit type
 */
interface IRequiredEquipment {
  /** Unit types that require this equipment */
  readonly unitTypes: readonly UnitType[];
  /** Equipment ID or flag that is required */
  readonly requiredEquipment: string;
  /** Minimum quantity required */
  readonly minQuantity: number;
  /** Condition for when requirement applies (optional) */
  readonly condition?: string;
  /** Suggestion for fixing */
  readonly suggestion: string;
}

/**
 * Required equipment rules
 * Based on TechManual construction rules
 */
const REQUIRED_EQUIPMENT: readonly IRequiredEquipment[] = [
  {
    unitTypes: [
      UnitType.BATTLEMECH,
      UnitType.OMNIMECH,
      UnitType.INDUSTRIALMECH,
    ],
    requiredEquipment: EquipmentBehaviorFlag.HeatSink,
    minQuantity: 10,
    condition: 'Unless using an engine with 10+ integral heat sinks',
    suggestion: 'Add heat sinks to meet the minimum requirement of 10',
  },
];

/**
 * VAL-EQUIP-UNIT-005: Required Equipment Check
 *
 * Validates that required equipment is present for the unit type.
 */
export const RequiredEquipmentCheck: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-005',
  name: 'Required Equipment Check',
  description: 'Validates required equipment is present for unit type',
  category: ValidationCategory.EQUIPMENT,
  priority: 104,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
      heatSinkCount?: number;
    };
    const warnings: ReturnType<typeof createUnitValidationError>[] = [];

    const unitType = context.unitType;

    // For now, check heat sink requirements as a warning
    // The actual heat sink count validation is more complex and may be
    // handled by separate mech-specific rules
    for (const requirement of REQUIRED_EQUIPMENT) {
      if (!requirement.unitTypes.includes(unitType)) continue;

      // Heat sink check - uses heatSinkCount from unit if available
      if (requirement.requiredEquipment === EquipmentBehaviorFlag.HeatSink) {
        const heatSinkCount = unit.heatSinkCount ?? 0;

        if (heatSinkCount < requirement.minQuantity) {
          warnings.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.WARNING,
              this.category,
              `${unitType} requires minimum ${requirement.minQuantity} heat sinks`,
              {
                field: 'heatSinkCount',
                expected: `>= ${requirement.minQuantity}`,
                actual: String(heatSinkCount),
                suggestion: requirement.suggestion,
                details: {
                  condition: requirement.condition,
                },
              },
            ),
          );
        }
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      [],
      warnings,
      [],
      0,
    );
  },
};

/**
 * All equipment unit type validation rules
 */
export const EQUIPMENT_UNIT_TYPE_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    EquipmentUnitTypeCompatibility,
    EquipmentLocationCompatibility,
    TurretMountingRequirements,
    IncompatibleEquipmentCheck,
    RequiredEquipmentCheck,
  ];
