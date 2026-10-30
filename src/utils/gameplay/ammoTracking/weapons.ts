/**
 * Weapon Utilities
 * Fireable weapons filtering and energy weapon detection.
 */

import { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import { isMissileWeapon } from '../specialWeaponMechanics/missileMechanics';
import {
  findAvailableAmmoBin,
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
  readonly ammoWeaponType?: string;
  readonly firingModes?: {
    readonly modes: readonly { readonly ammoWeaponType?: string }[];
  };
}

/** Missing capacity on a known missile cannot imply an unlimited energy supply. */
export function requiresExplicitAmmo(weapon: IWeaponAmmoData): boolean {
  return !(weapon.ammoPerTon > 0) && isMissileWeapon(weapon.name);
}

function isUsableRoundCount(count: number | undefined): boolean {
  return count !== undefined && Number.isInteger(count) && count > 0;
}

/** Whether AI and adapters account for ammunition on this weapon. */
export function isAmmoDependent(weapon: IWeaponAmmoData): boolean {
  return weapon.ammoPerTon > 0 || requiresExplicitAmmo(weapon);
}

/** Preserve the AI's legacy unknown-count allowance. */
export function hasAmmoForAI(
  weapon: IWeaponAmmoData,
  remaining: number | undefined,
): boolean {
  if (requiresExplicitAmmo(weapon)) return isUsableRoundCount(remaining);
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
  if (requiresExplicitAmmo(weapon)) return isUsableRoundCount(remaining);
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
      const families = new Set(
        [
          weapon.ammoWeaponType ?? weapon.name,
          ...(weapon.firingModes?.modes.flatMap((mode) =>
            mode.ammoWeaponType === undefined ? [] : [mode.ammoWeaponType],
          ) ?? []),
        ].map(normalizeAmmoWeaponType),
      );
      ammo[weapon.id] = [...families].reduce(
        (total, family) =>
          total +
          (requiresExplicitAmmo(weapon) &&
          !hasAmmoForAttack(ammoState, weapon, family)
            ? 0
            : getTotalAmmo(ammoState, family)),
        0,
      );
    }
  }
  return ammo;
}

/** Require a usable selected bin for unknown-capacity missiles; retain legacy fallback. */
export function hasAmmoForAttack(
  ammoState: Record<string, IAmmoSlotState> | undefined,
  weapon: IWeaponAmmoData,
  ammoWeaponType: string,
): boolean {
  if (requiresExplicitAmmo(weapon)) {
    const bin = ammoState && findAvailableAmmoBin(ammoState, ammoWeaponType);
    return isUsableRoundCount(bin?.remainingRounds);
  }
  if (isEnergyWeapon(weapon.name)) return true;
  if (!ammoState || Object.keys(ammoState).length === 0) return true;
  return hasAmmoForWeapon(ammoState, ammoWeaponType);
}
