/**
 * Weapon quirk modifiers.
 */

import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

import { WEAPON_QUIRK_IDS } from './catalog';

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
 * @returns Heat modifier: Improved Cooling floors final heat at 1, Poor Cooling adds 1, No Cooling adds 2.
 */
export function getWeaponCoolingHeatModifier(
  weaponQuirks: readonly string[],
  baseHeat: number,
): number {
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.IMPROVED_COOLING)) {
    return Math.max(1, baseHeat - 1) - baseHeat;
  }
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.POOR_COOLING)) return 1;
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.NO_COOLING)) return 2;
  return 0;
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
