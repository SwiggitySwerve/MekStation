/**
 * Weapon quirk modifiers.
 */

import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

import { WEAPON_QUIRK_IDS } from './catalog';

const NATIVE_IMPROVED_COOLING_ID = 'imp_cooling';

export {
  parseMtfWeaponQuirkLines as parseWeaponQuirksFromMTF,
  parseBlkWeaponQuirkEntries as parseWeaponQuirksFromBLK,
} from '@/utils/serialization/weaponQuirkParsing';

/**
 * Accurate weapon: -1 to-hit.
 */
export function calculateAccurateWeaponModifier(
  weaponQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!weaponQuirks.includes(WEAPON_QUIRK_IDS.ACCURATE)) return null;

  return {
    name: 'Accurate Weapon',
    value: -1,
    source: 'quirk',
    description: 'Weapon has Accurate quirk: -1',
  };
}

/**
 * Inaccurate weapon: +1 to-hit.
 */
export function calculateInaccurateWeaponModifier(
  weaponQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!weaponQuirks.includes(WEAPON_QUIRK_IDS.INACCURATE)) return null;

  return {
    name: 'Inaccurate Weapon',
    value: 1,
    source: 'quirk',
    description: 'Weapon has Inaccurate quirk: +1',
  };
}

/**
 * Stable Weapon: -1 to running movement penalty.
 * Only applies when attacker is running.
 */
export function calculateStableWeaponModifier(
  weaponQuirks: readonly string[],
  attackerMovementType: MovementType,
): IToHitModifierDetail | null {
  if (!weaponQuirks.includes(WEAPON_QUIRK_IDS.STABLE_WEAPON)) return null;
  if (attackerMovementType !== MovementType.Run) return null;

  return {
    name: 'Stable Weapon',
    value: -1,
    source: 'quirk',
    description: 'Stable Weapon: -1 running penalty',
  };
}

/**
 * Weapon cooling quirk heat modifier.
 * @returns Heat change after Improved Cooling's floor, then Poor/No Cooling additions.
 */
export function getWeaponCoolingHeatModifier(
  weaponQuirks: readonly string[],
  baseHeat: number,
): number {
  // MegaMek 48fcb2f64 WeaponMounted.java:167-178 uses independent checks.
  let heat = baseHeat;
  if (
    weaponQuirks.includes(WEAPON_QUIRK_IDS.IMPROVED_COOLING) ||
    weaponQuirks.includes(NATIVE_IMPROVED_COOLING_ID)
  ) {
    heat = Math.max(1, heat - 1);
  }
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.POOR_COOLING)) heat += 1;
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.NO_COOLING)) heat += 2;
  return heat - baseHeat;
}

/**
 * Get weapon quirks for a specific weapon by its ID.
 */
export function getWeaponQuirks(
  weaponQuirks: Readonly<Record<string, readonly string[]>> | undefined,
  weaponId: string,
): readonly string[] {
  if (!weaponQuirks) return [];
  return weaponQuirks[weaponId] ?? [];
}
