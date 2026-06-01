/**
 * Ammo State Management
 * Initialization, consumption, availability checks, bin selection, totals, and queries.
 */

import {
  IAmmoSlotState,
  IAmmoConsumedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IAmmoConstructionData, IAmmoConsumeResult } from './types';

/**
 * Normalize weapon/ammo keys that arrive as catalog ids (`ac-20`),
 * record-sheet names (`AC/20`), or construction spellings (`LRM 20`).
 * Matching stays tech-base aware: Clan-prefixed keys normalize to
 * `clan-*` and do not collide with Inner Sphere bins.
 */
export function normalizeAmmoWeaponType(weaponType: string): string {
  const raw = weaponType.toLowerCase().trim();
  const compact = raw.replace(/[^a-z0-9]+/g, '');
  if (
    /^(?:cl|clan)?plasmacannon(?:ammo)?$/.test(compact) ||
    compact === 'plasmacannonclan' ||
    compact === 'plasmacannonclanammo'
  ) {
    return 'clan-plasma-cannon';
  }
  if (/^(?:is)?plasmarifle(?:ammo)?$/.test(compact)) {
    return 'plasma-rifle';
  }

  const clanPrefixed =
    /(?:^|\s|\()clan(?:\)|\s|-|$)|^cl[\s-]/.test(raw) ||
    /^clams(?:[\s-]*ammo)?$/.test(raw);
  const innerSphereStripped = raw.replace(/^is[\s-]+/, '');
  const clanStripped = innerSphereStripped
    .replace(/\(clan\)/g, '')
    .replace(/^clan[\s-]+/, '')
    .replace(/^cl[\s-]+/, '');
  let normalized = clanStripped
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const patterns: ReadonlyArray<readonly [RegExp, string]> = [
    [/^(?:auto-cannon|autocannon|ac)-?(\d+)$/, 'ac-$1'],
    [/^semi-guided-lrm-?(\d+)$/, 'lrm-$1'],
    [/^lrm-?(\d+)-semi-guided$/, 'lrm-$1'],
    [/^sg-lrm-?(\d+)$/, 'lrm-$1'],
    [/^lrm-?(\d+)$/, 'lrm-$1'],
    [/^srm-?(\d+)$/, 'srm-$1'],
    [/^mrm-?(\d+)$/, 'mrm-$1'],
    [/^atm-?(\d+)$/, 'atm-$1'],
    [/^mml-?(\d+)$/, 'mml-$1'],
    [/^(?:ultra-ac|uac)-?(\d+)$/, 'uac-$1'],
    [/^(?:rotary-ac|rac)-?(\d+)$/, 'rac-$1'],
    [/^lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'],
    [/^lb-x-ac-?(\d+)$/, 'lb-$1-x-ac'],
    [/^streak-srm-?(\d+)$/, 'streak-srm-$1'],
    [/^streak-lrm-?(\d+)$/, 'streak-lrm-$1'],
    [/^machine-gun$/, 'machine-gun'],
    [/^mg$/, 'machine-gun'],
    [/^gauss-rifle$/, 'gauss-rifle'],
    [/^clams(?:-ammo)?$/, 'ams'],
    [/^(?:ams|isams)(?:-ammo)?$/, 'ams'],
    [/^anti-missile-system(?:-ammo)?$/, 'ams'],
    [/^narc(?:-missile)?-beacon$/, 'narc'],
    [/^i-narc(?:-launcher)?$/, 'inarc'],
    [/^inarc(?:-launcher)?$/, 'inarc'],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, replacement);
      break;
    }
  }

  return clanPrefixed && !normalized.startsWith('clan-')
    ? `clan-${normalized}`
    : normalized;
}

/**
 * Initialize ammo bin state from unit construction data at game start.
 * Each ton of ammo becomes a separate bin.
 */
export function initializeAmmoState(
  constructionData: readonly IAmmoConstructionData[],
): Record<string, IAmmoSlotState> {
  const ammoState: Record<string, IAmmoSlotState> = {};

  for (const data of constructionData) {
    ammoState[data.binId] = {
      binId: data.binId,
      weaponType: data.weaponType,
      location: data.location,
      remainingRounds: data.maxRounds,
      maxRounds: data.maxRounds,
      isExplosive: data.isExplosive,
    };
  }

  return ammoState;
}

/**
 * Consume ammunition for a weapon firing.
 * Finds the first non-empty, non-destroyed bin matching the weapon type.
 */
export function consumeAmmo(
  ammoState: Record<string, IAmmoSlotState>,
  unitId: string,
  weaponType: string,
  rounds: number = 1,
): IAmmoConsumeResult | null {
  const bin = findAvailableAmmoBin(ammoState, weaponType);
  if (!bin) return null;

  const newRemainingRounds = Math.max(0, bin.remainingRounds - rounds);

  const updatedAmmoState: Record<string, IAmmoSlotState> = {
    ...ammoState,
    [bin.binId]: {
      ...bin,
      remainingRounds: newRemainingRounds,
    },
  };

  const event: IAmmoConsumedPayload = {
    unitId,
    binId: bin.binId,
    weaponType,
    roundsConsumed: rounds,
    roundsRemaining: newRemainingRounds,
  };

  return {
    updatedAmmoState,
    event,
    success: true,
  };
}

/**
 * Check if a weapon has ammo available to fire.
 * Energy weapons always return true (no ammo required).
 */
export function hasAmmoForWeapon(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
  isEnergyWeapon: boolean = false,
): boolean {
  if (isEnergyWeapon) return true;
  return findAvailableAmmoBin(ammoState, weaponType) !== null;
}

/**
 * Find the first non-empty ammo bin matching a weapon type.
 */
export function findAvailableAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
): IAmmoSlotState | null {
  const bins = Object.values(ammoState);
  const requestedType = normalizeAmmoWeaponType(weaponType);

  for (const bin of bins) {
    if (
      normalizeAmmoWeaponType(bin.weaponType) === requestedType &&
      bin.remainingRounds > 0
    ) {
      return bin;
    }
  }

  return null;
}

/**
 * Get total remaining ammo for a weapon type across all bins.
 */
export function getTotalAmmo(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
): number {
  const requestedType = normalizeAmmoWeaponType(weaponType);
  return Object.values(ammoState)
    .filter((bin) => normalizeAmmoWeaponType(bin.weaponType) === requestedType)
    .reduce((total, bin) => total + bin.remainingRounds, 0);
}

/**
 * Get all ammo bins at a specific location.
 */
export function getAmmoBinsAtLocation(
  ammoState: Record<string, IAmmoSlotState>,
  location: string,
): readonly IAmmoSlotState[] {
  return Object.values(ammoState).filter((bin) => bin.location === location);
}

/**
 * Select a random non-empty ammo bin for heat-induced explosion.
 */
export function selectRandomAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  diceRoller: () => number,
): string | null {
  const nonEmptyBins = Object.values(ammoState).filter(
    (bin) => bin.remainingRounds > 0,
  );
  if (nonEmptyBins.length === 0) return null;

  const roll = diceRoller();
  const index = (roll - 1) % nonEmptyBins.length;
  return nonEmptyBins[index].binId;
}
