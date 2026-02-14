/**
 * Weapon Utilities
 * Fireable weapons filtering and energy weapon detection.
 */

import { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import { hasAmmoForWeapon } from './state';

/**
 * Get all weapons that can currently fire (have ammo or are energy weapons).
 */
export function getFireableWeapons(
  ammoState: Record<string, IAmmoSlotState>,
  weapons: readonly {
    weaponId: string;
    weaponType: string;
    isEnergy: boolean;
  }[],
): readonly string[] {
  return weapons
    .filter((w) => hasAmmoForWeapon(ammoState, w.weaponType, w.isEnergy))
    .map((w) => w.weaponId);
}

/**
 * Check if a weapon type requires ammo (is not an energy weapon).
 * Common energy weapons: lasers, PPCs, flamers.
 */
export function isEnergyWeapon(weaponName: string): boolean {
  const name = weaponName.toLowerCase();
  return (
    name.includes('laser') ||
    name.includes('ppc') ||
    name.includes('flamer') ||
    name.includes('plasma')
  );
}
