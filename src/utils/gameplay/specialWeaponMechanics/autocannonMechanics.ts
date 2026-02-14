/**
 * Autocannon Mechanics Module
 *
 * Implements BattleTech autocannon resolution:
 * - Ultra AC: 2 independent shots, jam on natural 2
 * - Rotary AC: 1-6 shots selected by pilot, jam on natural 2
 *
 * @spec openspec/changes/full-combat-parity/specs/weapon-system/spec.md
 */

import { FiringArc, CombatLocation } from '@/types/gameplay';
import { IWeaponAttack, IDiceRoll } from '@/types/gameplay';

import { type DiceRoller } from '../diceTypes';
import { determineHitLocationFromRoll } from '../hitLocation';
import {
  IShotResult,
  IMultiShotResult,
  RACRateOfFire,
  WeaponFireMode,
} from './types';

// =============================================================================
// Weapon Type Detection
// =============================================================================

export function isUltraAC(weaponId: string): boolean {
  return (
    (/^(clan-)?u?ac-\d+$/i.test(weaponId) &&
      weaponId.toLowerCase().startsWith('uac')) ||
    weaponId.toLowerCase().includes('ultra')
  );
}

export function isRotaryAC(weaponId: string): boolean {
  return (
    weaponId.toLowerCase().startsWith('rac') ||
    weaponId.toLowerCase().includes('rotary')
  );
}

// =============================================================================
// 13.1: Ultra AC Resolution
// =============================================================================

/**
 * Resolve an Ultra AC attack.
 *
 * UAC fires 2 independent shots:
 * - Each has its own to-hit roll
 * - Each hit resolves its own hit location
 * - If EITHER roll is a natural 2 (snake eyes), the weapon jams
 * - A jammed weapon cannot fire until repaired (rest of game)
 *
 * Heat: UAC in ultra mode generates 1 extra heat (weapon heat is for standard mode).
 */
export function resolveUltraAC(
  weapon: IWeaponAttack,
  toHitNumber: number,
  firingArc: FiringArc,
  diceRoller: DiceRoller,
): IMultiShotResult {
  const shots: IShotResult[] = [];
  let jammed = false;
  let totalHits = 0;
  let totalDamage = 0;

  for (let shotNum = 1; shotNum <= 2; shotNum++) {
    const roll = diceRoller();
    const causedJam = roll.isSnakeEyes;
    if (causedJam) {
      jammed = true;
    }

    const hit = roll.total >= toHitNumber && !causedJam;

    let hitLocation: CombatLocation | undefined;
    let locationRoll: IDiceRoll | undefined;
    let damage = 0;

    if (hit) {
      locationRoll = diceRoller();
      const locResult = determineHitLocationFromRoll(firingArc, locationRoll);
      hitLocation = locResult.location;
      damage = weapon.damage;
      totalHits++;
      totalDamage += damage;
    }

    shots.push({
      shotNumber: shotNum,
      roll,
      hit,
      hitLocation,
      locationRoll,
      damage,
      causedJam,
    });
  }

  return {
    weapon,
    fireMode: 'ultra',
    shots,
    totalHits,
    totalDamage,
    jammed,
    heatGenerated: weapon.heat + 1, // Ultra mode = +1 heat over standard
  };
}

// =============================================================================
// 13.2: Rotary AC Resolution
// =============================================================================

/**
 * Resolve a Rotary AC attack.
 *
 * RAC fires 1-6 shots (selected by pilot):
 * - Each has its own to-hit roll
 * - Each hit resolves its own hit location
 * - If ANY roll is a natural 2 (snake eyes), the weapon jams
 * - Heat scales with number of shots selected
 * - More shots = more heat and more jam risk
 */
export function resolveRotaryAC(
  weapon: IWeaponAttack,
  toHitNumber: number,
  firingArc: FiringArc,
  rateOfFire: RACRateOfFire,
  diceRoller: DiceRoller,
): IMultiShotResult {
  const shots: IShotResult[] = [];
  let jammed = false;
  let totalHits = 0;
  let totalDamage = 0;

  for (let shotNum = 1; shotNum <= rateOfFire; shotNum++) {
    const roll = diceRoller();
    const causedJam = roll.isSnakeEyes;
    if (causedJam) {
      jammed = true;
    }

    const hit = roll.total >= toHitNumber && !causedJam;

    let hitLocation: CombatLocation | undefined;
    let locationRoll: IDiceRoll | undefined;
    let damage = 0;

    if (hit) {
      locationRoll = diceRoller();
      const locResult = determineHitLocationFromRoll(firingArc, locationRoll);
      hitLocation = locResult.location;
      damage = weapon.damage;
      totalHits++;
      totalDamage += damage;
    }

    shots.push({
      shotNumber: shotNum,
      roll,
      hit,
      hitLocation,
      locationRoll,
      damage,
      causedJam,
    });
  }

  // RAC heat = base weapon heat × rate of fire multiplier
  // Standard heat for RAC/2 is 1/shot, RAC/5 is 1/shot
  const heatGenerated = weapon.heat * rateOfFire;

  return {
    weapon,
    fireMode: 'rotary',
    shots,
    totalHits,
    totalDamage,
    jammed,
    heatGenerated,
  };
}

// =============================================================================
// Fire Mode Helpers
// =============================================================================

export function getDefaultFireMode(weaponId: string): WeaponFireMode {
  if (isUltraAC(weaponId)) return 'ultra';
  if (isRotaryAC(weaponId)) return 'rotary';
  return 'standard';
}

export function getFireModeHeatMultiplier(
  fireMode: WeaponFireMode,
  racRateOfFire?: RACRateOfFire,
): number {
  switch (fireMode) {
    case 'ultra':
      return 2; // Double heat for 2 shots
    case 'rotary':
      return racRateOfFire ?? 1;
    default:
      return 1;
  }
}
