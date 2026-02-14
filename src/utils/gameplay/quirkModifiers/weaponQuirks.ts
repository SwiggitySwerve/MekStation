/**
 * Weapon quirk modifiers.
 */

import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';
import { WEAPON_QUIRK_IDS } from './catalog';

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
 * @returns Heat modifier: -1 for Improved, +1 for Poor, or baseHeat for No Cooling (doubling)
 */
export function getWeaponCoolingHeatModifier(
  weaponQuirks: readonly string[],
  baseHeat: number,
): number {
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.IMPROVED_COOLING)) return -1;
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.POOR_COOLING)) return 1;
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.NO_COOLING)) return baseHeat; // Double heat
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

/**
 * Parse weapon quirk lines from MTF format.
 * MegaMek format: `weapon_quirk:quirk_name:weapon_name:location`
 * @param lines - All lines from the MTF file
 * @returns Record mapping weapon name to array of quirk IDs
 */
export function parseWeaponQuirksFromMTF(
  lines: readonly string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const line of lines) {
    if (!line.startsWith('weapon_quirk:')) continue;

    const parts = line.substring('weapon_quirk:'.length).split(':');
    if (parts.length < 2) continue;

    const quirkName = parts[0].trim();
    const weaponName = parts[1].trim();

    if (!quirkName || !weaponName) continue;

    if (!result[weaponName]) {
      result[weaponName] = [];
    }
    result[weaponName].push(quirkName);
  }

  return result;
}

/**
 * Parse weapon quirk tags from BLK format.
 * BLK format uses XML-like tags: `<weapon_quirks>` containing `quirk_name:weapon_name` lines.
 * @param rawQuirkEntries - Array of weapon quirk entries from BLK parser
 * @returns Record mapping weapon name to array of quirk IDs
 */
export function parseWeaponQuirksFromBLK(
  rawQuirkEntries: readonly string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const entry of rawQuirkEntries) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx < 0) continue;

    const quirkName = entry.substring(0, colonIdx).trim();
    const weaponName = entry.substring(colonIdx + 1).trim();

    if (!quirkName || !weaponName) continue;

    if (!result[weaponName]) {
      result[weaponName] = [];
    }
    result[weaponName].push(quirkName);
  }

  return result;
}
