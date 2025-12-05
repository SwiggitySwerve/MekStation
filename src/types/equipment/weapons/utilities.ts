/**
 * Weapon Utility Functions
 * 
 * Query and filter functions for weapons.
 * 
 * @spec openspec/specs/weapon-system/spec.md
 */

import { TechBase } from '../../enums/TechBase';
import { IWeapon, WeaponCategory } from './interfaces';
import { ENERGY_WEAPONS } from './EnergyWeapons';
import { BALLISTIC_WEAPONS } from './BallisticWeapons';
import { MISSILE_WEAPONS } from './MissileWeapons';

/**
 * All standard weapons combined
 */
export const ALL_STANDARD_WEAPONS: readonly IWeapon[] = [
  ...ENERGY_WEAPONS,
  ...BALLISTIC_WEAPONS,
  ...MISSILE_WEAPONS,
] as const;

/**
 * Get weapon by ID
 */
export function getWeaponById(id: string): IWeapon | undefined {
  return ALL_STANDARD_WEAPONS.find(w => w.id === id);
}

/**
 * Get weapons by category
 */
export function getWeaponsByCategory(category: WeaponCategory): IWeapon[] {
  return ALL_STANDARD_WEAPONS.filter(w => w.category === category);
}

/**
 * Get weapons by tech base
 */
export function getWeaponsByTechBase(techBase: TechBase): IWeapon[] {
  return ALL_STANDARD_WEAPONS.filter(w => w.techBase === techBase);
}

/**
 * Get weapons by sub-type
 */
export function getWeaponsBySubType(subType: string): IWeapon[] {
  return ALL_STANDARD_WEAPONS.filter(w => w.subType === subType);
}

/**
 * Get weapons available by year
 */
export function getWeaponsAvailableByYear(year: number): IWeapon[] {
  return ALL_STANDARD_WEAPONS.filter(w => w.introductionYear <= year);
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
  return ALL_STANDARD_WEAPONS.filter(isDirectFireWeapon);
}

/**
 * Calculate total direct fire weapon tonnage from weapon IDs
 * Used for Targeting Computer weight calculations.
 * 
 * @param weaponIds - Array of weapon IDs to check
 * @returns Total weight of direct fire weapons in tons
 */
export function calculateDirectFireWeaponTonnage(weaponIds: readonly string[]): number {
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
export function calculateDirectFireTonnageFromWeapons(weapons: readonly IWeapon[]): number {
  return weapons
    .filter(isDirectFireWeapon)
    .reduce((sum, weapon) => sum + weapon.weight, 0);
}

