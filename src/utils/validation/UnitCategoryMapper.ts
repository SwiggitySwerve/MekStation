/**
 * Unit Category Mapper
 *
 * Maps unit types to their categories for validation rule selection.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '../../types/unit/BattleMechInterfaces';
import { UnitCategory } from '../../types/validation/UnitValidationInterfaces';

/**
 * Mapping of unit types to their categories
 */
const UNIT_TYPE_TO_CATEGORY: ReadonlyMap<UnitType, UnitCategory> = new Map([
  // Mech category
  [UnitType.BATTLEMECH, UnitCategory.MECH],
  [UnitType.OMNIMECH, UnitCategory.MECH],
  [UnitType.INDUSTRIALMECH, UnitCategory.MECH],
  [UnitType.PROTOMECH, UnitCategory.MECH],

  // Vehicle category
  [UnitType.VEHICLE, UnitCategory.VEHICLE],
  [UnitType.VTOL, UnitCategory.VEHICLE],
  [UnitType.SUPPORT_VEHICLE, UnitCategory.VEHICLE],

  // Aerospace category
  [UnitType.AEROSPACE, UnitCategory.AEROSPACE],
  [UnitType.CONVENTIONAL_FIGHTER, UnitCategory.AEROSPACE],
  [UnitType.SMALL_CRAFT, UnitCategory.AEROSPACE],
  [UnitType.DROPSHIP, UnitCategory.AEROSPACE],
  [UnitType.JUMPSHIP, UnitCategory.AEROSPACE],
  [UnitType.WARSHIP, UnitCategory.AEROSPACE],
  [UnitType.SPACE_STATION, UnitCategory.AEROSPACE],

  // Personnel category
  [UnitType.INFANTRY, UnitCategory.PERSONNEL],
  [UnitType.BATTLE_ARMOR, UnitCategory.PERSONNEL],
]);

/**
 * Mapping of categories to their unit types
 */
const CATEGORY_TO_UNIT_TYPES: ReadonlyMap<UnitCategory, readonly UnitType[]> =
  new Map([
    [
      UnitCategory.MECH,
      [
        UnitType.BATTLEMECH,
        UnitType.OMNIMECH,
        UnitType.INDUSTRIALMECH,
        UnitType.PROTOMECH,
      ],
    ],
    [
      UnitCategory.VEHICLE,
      [UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE],
    ],
    [
      UnitCategory.AEROSPACE,
      [
        UnitType.AEROSPACE,
        UnitType.CONVENTIONAL_FIGHTER,
        UnitType.SMALL_CRAFT,
        UnitType.DROPSHIP,
        UnitType.JUMPSHIP,
        UnitType.WARSHIP,
        UnitType.SPACE_STATION,
      ],
    ],
    [UnitCategory.PERSONNEL, [UnitType.INFANTRY, UnitType.BATTLE_ARMOR]],
  ]);

/**
 * Get the category for a unit type
 * @param unitType - The unit type to categorize
 * @returns The unit category, or undefined for unknown types
 */
export function getCategoryForUnitType(
  unitType: UnitType,
): UnitCategory | undefined {
  return UNIT_TYPE_TO_CATEGORY.get(unitType);
}

/**
 * Get all unit types in a category
 * @param category - The unit category
 * @returns Array of unit types in the category
 */
export function getUnitTypesInCategory(
  category: UnitCategory,
): readonly UnitType[] {
  return CATEGORY_TO_UNIT_TYPES.get(category) ?? [];
}

/**
 * Check if a unit type belongs to a category
 * @param unitType - The unit type to check
 * @param category - The category to check against
 * @returns True if the unit type is in the category
 */
export function isUnitTypeInCategory(
  unitType: UnitType,
  category: UnitCategory,
): boolean {
  return getCategoryForUnitType(unitType) === category;
}

/**
 * Check if a unit type is a mech (BattleMech, OmniMech, IndustrialMech, ProtoMech)
 */
export function isMechType(unitType: UnitType): boolean {
  return isUnitTypeInCategory(unitType, UnitCategory.MECH);
}

/**
 * Check if a unit type is a vehicle (Vehicle, VTOL, SupportVehicle)
 */
export function isVehicleType(unitType: UnitType): boolean {
  return isUnitTypeInCategory(unitType, UnitCategory.VEHICLE);
}

/**
 * Check if a unit type is aerospace
 */
export function isAerospaceType(unitType: UnitType): boolean {
  return isUnitTypeInCategory(unitType, UnitCategory.AEROSPACE);
}

/**
 * Check if a unit type is personnel (Infantry, BattleArmor)
 */
export function isPersonnelType(unitType: UnitType): boolean {
  return isUnitTypeInCategory(unitType, UnitCategory.PERSONNEL);
}

/**
 * Check if a unit type is a combat mech (BattleMech or OmniMech)
 */
export function isCombatMech(unitType: UnitType): boolean {
  return unitType === UnitType.BATTLEMECH || unitType === UnitType.OMNIMECH;
}

/**
 * Check if a unit type requires a gyro (all mechs except ProtoMech)
 */
export function requiresGyro(unitType: UnitType): boolean {
  return (
    unitType === UnitType.BATTLEMECH ||
    unitType === UnitType.OMNIMECH ||
    unitType === UnitType.INDUSTRIALMECH
  );
}

/**
 * Check if a unit type requires minimum heat sinks (BattleMech, OmniMech)
 */
export function requiresMinimumHeatSinks(unitType: UnitType): boolean {
  return unitType === UnitType.BATTLEMECH || unitType === UnitType.OMNIMECH;
}

/**
 * Get all unit categories
 */
export function getAllCategories(): readonly UnitCategory[] {
  return [
    UnitCategory.MECH,
    UnitCategory.VEHICLE,
    UnitCategory.AEROSPACE,
    UnitCategory.PERSONNEL,
  ];
}

/**
 * Get all unit types
 */
export function getAllUnitTypes(): readonly UnitType[] {
  return Array.from(UNIT_TYPE_TO_CATEGORY.keys());
}

/**
 * Check if a value is a valid UnitType
 */
export function isValidUnitType(value: unknown): value is UnitType {
  return (
    typeof value === 'string' && UNIT_TYPE_TO_CATEGORY.has(value as UnitType)
  );
}
