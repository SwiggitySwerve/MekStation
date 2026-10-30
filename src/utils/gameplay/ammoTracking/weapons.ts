/**
 * Weapon Utilities
 * Fireable weapons filtering and energy weapon detection.
 */

import { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  getTotalAmmo,
  hasAmmoForWeapon,
  normalizeAmmoWeaponType,
} from './state';

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
  const normalized = normalizeAmmoWeaponType(name);
  if (normalized === 'clan-plasma-cannon' || normalized === 'plasma-rifle') {
    return false;
  }

  return (
    name.includes('laser') ||
    name.includes('ppc') ||
    name.includes('flamer') ||
    name.includes('plasma')
  );
}

interface IWeaponAmmoData {
  readonly name: string;
  readonly ammoPerTon: number;
}

/** Whether AI and adapters account for ammunition on this weapon. */
export function isAmmoDependent(weapon: IWeaponAmmoData): boolean {
  return weapon.ammoPerTon > 0;
}

/** Preserve the AI's legacy unknown-count allowance. */
export function hasAmmoForAI(
  weapon: IWeaponAmmoData,
  remaining: number | undefined,
): boolean {
  return !(
    isAmmoDependent(weapon) &&
    remaining !== undefined &&
    remaining <= 0
  );
}

/** Preview historically treats zero capacity differently from the AI. */
export function hasAmmoForDamagePreview(
  weapon: IWeaponAmmoData,
  remaining: number | undefined,
): boolean {
  return !(
    weapon.ammoPerTon !== -1 &&
    remaining !== undefined &&
    remaining <= 0
  );
}

/** Project current compatible-bin totals without inventing quantities. */
export function ammoFromWeapons(
  weapons: readonly (IWeaponAmmoData & { readonly id: string })[],
  ammoState: Record<string, IAmmoSlotState>,
): Record<string, number> {
  const ammo: Record<string, number> = {};
  for (const weapon of weapons) {
    if (isAmmoDependent(weapon)) {
      ammo[weapon.id] = getTotalAmmo(ammoState, weapon.name);
    }
  }
  return ammo;
}

/** Runner compatibility policy before ammunition readiness correction. */
export function hasAmmoForAttack(
  ammoState: Record<string, IAmmoSlotState> | undefined,
  weapon: IWeaponAmmoData,
  ammoWeaponType: string,
): boolean {
  if (isEnergyWeapon(weapon.name)) return true;
  if (!ammoState || Object.keys(ammoState).length === 0) return true;
  return hasAmmoForWeapon(ammoState, ammoWeaponType);
}
