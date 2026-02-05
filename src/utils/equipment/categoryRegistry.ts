/**
 * Equipment Category Registry
 *
 * Provides a centralized mapping between weapon categories and equipment categories.
 * This eliminates duplicate switch statements across the codebase.
 *
 * @module utils/equipment/categoryRegistry
 */

import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';

/**
 * Registry mapping weapon categories to equipment categories.
 * To add a new weapon category, simply add a new entry to this registry.
 */
export const WEAPON_TO_EQUIPMENT_CATEGORY: Record<
  WeaponCategory,
  EquipmentCategory
> = {
  [WeaponCategory.ENERGY]: EquipmentCategory.ENERGY_WEAPON,
  [WeaponCategory.BALLISTIC]: EquipmentCategory.BALLISTIC_WEAPON,
  [WeaponCategory.MISSILE]: EquipmentCategory.MISSILE_WEAPON,
  [WeaponCategory.ARTILLERY]: EquipmentCategory.ARTILLERY,
  [WeaponCategory.PHYSICAL]: EquipmentCategory.PHYSICAL_WEAPON,
};

/**
 * Convert a weapon category to its corresponding equipment category.
 * Returns MISC_EQUIPMENT as fallback for unknown weapon categories.
 *
 * @param category - The weapon category to convert
 * @returns The corresponding equipment category
 */
export function weaponCategoryToEquipmentCategory(
  category: WeaponCategory,
): EquipmentCategory {
  return (
    WEAPON_TO_EQUIPMENT_CATEGORY[category] ?? EquipmentCategory.MISC_EQUIPMENT
  );
}
