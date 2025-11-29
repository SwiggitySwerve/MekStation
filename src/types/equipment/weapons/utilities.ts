/**
 * Weapon Utility Functions
 * 
 * Query and filter functions for weapons.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/weapon-system/spec.md
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

