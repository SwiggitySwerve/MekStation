/**
 * Equipment page helper functions
 */
import { EquipmentCategory } from '@/types/equipment';
import {
  getCategoryColors,
  getAmmoColors,
} from '@/utils/colors/equipmentColors';

/**
 * Get colors for an equipment item (handles ammo sub-types)
 */
export function getEquipmentDisplayColors(
  category: EquipmentCategory | undefined,
  name: string,
):
  | ReturnType<typeof getCategoryColors>
  | ReturnType<typeof getAmmoColors>
  | null {
  if (!category) return null;

  // For ammunition, use name-based detection for missile vs ballistic
  if (category === EquipmentCategory.AMMUNITION) {
    return getAmmoColors(name);
  }

  return getCategoryColors(category);
}
