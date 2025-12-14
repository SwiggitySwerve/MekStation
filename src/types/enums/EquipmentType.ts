/**
 * EquipmentType - Top-level equipment type enumeration
 * 
 * Defines the primary categories of equipment that can be mounted on a unit.
 * This is distinct from sub-categories (WeaponCategory, AmmoCategory, etc.)
 * which provide finer-grained classification within each type.
 * 
 * @spec core-enumerations/spec.md
 */

/**
 * Top-level equipment types for classification and lookup.
 */
export enum EquipmentType {
  /** Weapons (energy, ballistic, missile, physical) */
  WEAPON = 'Weapon',
  
  /** Ammunition for weapons that require it */
  AMMUNITION = 'Ammunition',
  
  /** Electronic equipment (ECM, targeting, C3, etc.) */
  ELECTRONICS = 'Electronics',
  
  /** Miscellaneous equipment (heat sinks, jump jets, MASC, etc.) */
  MISCELLANEOUS = 'Miscellaneous',
}

/**
 * Array of all EquipmentType values for iteration
 */
export const ALL_EQUIPMENT_TYPES: readonly EquipmentType[] = Object.freeze([
  EquipmentType.WEAPON,
  EquipmentType.AMMUNITION,
  EquipmentType.ELECTRONICS,
  EquipmentType.MISCELLANEOUS,
]);

/**
 * Type guard to check if a value is a valid EquipmentType
 */
export function isEquipmentType(value: unknown): value is EquipmentType {
  return typeof value === 'string' && 
    Object.values(EquipmentType).includes(value as EquipmentType);
}

