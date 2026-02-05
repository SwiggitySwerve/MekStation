/**
 * Weapon Utility Functions
 *
 * Query and filter functions for weapons.
 *
 * @spec openspec/specs/weapon-system/spec.md
 */

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';

import { TechBase } from '../../enums/TechBase';
import { IWeapon, WeaponCategory } from './interfaces';

/**
 * Get all standard weapons (excluding artillery and capital weapons)
 * Uses JSON-loaded data from EquipmentLoaderService
 */
export function getAllStandardWeapons(): IWeapon[] {
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    return loader
      .getAllWeapons()
      .filter((w) => w.category !== WeaponCategory.ARTILLERY);
  }
  return [];
}

/**
 * All standard weapons combined (legacy export)
 * @deprecated Use getAllStandardWeapons() for runtime-loaded data
 */
export const ALL_STANDARD_WEAPONS: readonly IWeapon[] = [] as const;

/**
 * Get weapon by ID
 * Uses JSON-loaded data from EquipmentLoaderService
 */
export function getWeaponById(id: string): IWeapon | undefined {
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    return loader.getWeaponById(id) ?? undefined;
  }
  return undefined;
}

/**
 * Get weapons by category
 */
export function getWeaponsByCategory(category: WeaponCategory): IWeapon[] {
  return getAllStandardWeapons().filter((w) => w.category === category);
}

/**
 * Get weapons by tech base
 */
export function getWeaponsByTechBase(techBase: TechBase): IWeapon[] {
  return getAllStandardWeapons().filter((w) => w.techBase === techBase);
}

/**
 * Get weapons by sub-type
 */
export function getWeaponsBySubType(subType: string): IWeapon[] {
  return getAllStandardWeapons().filter((w) => w.subType === subType);
}

/**
 * Get weapons available by year
 */
export function getWeaponsAvailableByYear(year: number): IWeapon[] {
  return getAllStandardWeapons().filter((w) => w.introductionYear <= year);
}

// ============================================================================
// DIRECT FIRE WEAPON UTILITIES (for Targeting Computer calculations)
// ============================================================================

/**
 * Direct fire weapon categories
 *
 * Per BattleTech TechManual:
 * - Energy weapons (lasers, PPCs, flamers) = DIRECT FIRE
 * - Ballistic weapons (autocannons, Gauss) = DIRECT FIRE
 * - Missile weapons (LRMs, SRMs) = INDIRECT FIRE (excluded)
 * - Artillery = INDIRECT FIRE (excluded)
 */
export const DIRECT_FIRE_CATEGORIES: readonly WeaponCategory[] = [
  WeaponCategory.ENERGY,
  WeaponCategory.BALLISTIC,
] as const;

/**
 * Check if a weapon category is direct fire
 * Direct fire weapons are those that benefit from Targeting Computers:
 * - Energy weapons (lasers, PPCs, flamers)
 * - Ballistic weapons (autocannons, Gauss rifles, machine guns)
 *
 * Excluded (indirect fire):
 * - Missile weapons (LRMs, SRMs, MRMs, ATMs)
 * - Artillery weapons
 *
 * @param category - The weapon category to check
 * @returns true if the category is direct fire
 */
export function isDirectFireCategory(category: WeaponCategory): boolean {
  return DIRECT_FIRE_CATEGORIES.includes(category);
}

/**
 * Check if a weapon is a direct fire weapon
 * Direct fire weapons benefit from Targeting Computers.
 *
 * @param weapon - The weapon to check
 * @returns true if the weapon is direct fire (energy or ballistic)
 */
export function isDirectFireWeapon(weapon: IWeapon): boolean {
  return isDirectFireCategory(weapon.category);
}

/**
 * Check if a weapon ID corresponds to a direct fire weapon
 *
 * @param weaponId - The weapon ID to check
 * @returns true if the weapon is direct fire, false if not found or indirect fire
 */
export function isDirectFireWeaponById(weaponId: string): boolean {
  const weapon = getWeaponById(weaponId);
  return weapon ? isDirectFireWeapon(weapon) : false;
}

/**
 * Get all direct fire weapons
 */
export function getDirectFireWeapons(): IWeapon[] {
  return getAllStandardWeapons().filter(isDirectFireWeapon);
}

/**
 * Calculate total direct fire weapon tonnage from weapon IDs
 * Used for Targeting Computer weight calculations.
 *
 * @param weaponIds - Array of weapon IDs to check
 * @returns Total weight of direct fire weapons in tons
 */
export function calculateDirectFireWeaponTonnage(
  weaponIds: readonly string[],
): number {
  let totalTonnage = 0;

  for (const weaponId of weaponIds) {
    const weapon = getWeaponById(weaponId);
    if (weapon && isDirectFireWeapon(weapon)) {
      totalTonnage += weapon.weight;
    }
  }

  return totalTonnage;
}

/**
 * Calculate direct fire weapon tonnage from weapons array
 * Used for Targeting Computer weight calculations.
 *
 * @param weapons - Array of weapons
 * @returns Total weight of direct fire weapons in tons
 */
export function calculateDirectFireTonnageFromWeapons(
  weapons: readonly IWeapon[],
): number {
  return weapons
    .filter(isDirectFireWeapon)
    .reduce((sum, weapon) => sum + weapon.weight, 0);
}
