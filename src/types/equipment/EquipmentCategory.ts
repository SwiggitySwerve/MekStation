/**
 * Equipment Category Enum
 *
 * Defines the categories for equipment in the BattleTech universe.
 * Separated into its own file to avoid circular dependencies.
 *
 * @spec openspec/specs/equipment-database/spec.md
 */

/**
 * Equipment categories for unified access
 */
export enum EquipmentCategory {
  ENERGY_WEAPON = 'Energy Weapon',
  BALLISTIC_WEAPON = 'Ballistic Weapon',
  MISSILE_WEAPON = 'Missile Weapon',
  ARTILLERY = 'Artillery',
  CAPITAL_WEAPON = 'Capital Weapon',
  AMMUNITION = 'Ammunition',
  ELECTRONICS = 'Electronics',
  PHYSICAL_WEAPON = 'Physical Weapon',
  MOVEMENT = 'Movement',
  STRUCTURAL = 'Structural',
  MISC_EQUIPMENT = 'Misc Equipment',
}
