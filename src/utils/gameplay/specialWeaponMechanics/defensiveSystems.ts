/**
 * Defensive Systems Module
 *
 * Implements BattleTech defensive weapon systems:
 * - AMS: Reduce incoming missile cluster hits
 * - TAG: Designate target for semi-guided LRM
 *
 * @spec openspec/changes/full-combat-parity/specs/weapon-system/spec.md
 */

import { IWeaponAttack } from '@/types/gameplay';

import { type DiceRoller } from '../diceTypes';
import { IAMSResult, ITargetStatusFlags } from './types';

// =============================================================================
// Weapon Type Detection
// =============================================================================

export function isAMS(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id === 'ams' ||
    id.includes('anti-missile') ||
    id === 'clan-ams' ||
    id === 'is-ams'
  );
}

export function isTAG(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id === 'tag' ||
    id === 'clan-tag' ||
    id === 'is-tag' ||
    id.includes('light-tag')
  );
}

// =============================================================================
// 13.4: AMS (Anti-Missile System)
// =============================================================================

/**
 * Resolve AMS intercept against incoming missile attack.
 *
 * AMS reduces the number of missile cluster hits:
 * - Standard AMS: Reduces by 1d6 (uses 1d6 from 2d6 roll)
 * - Consumes AMS ammo per activation
 * - Cannot reduce below 0 hits
 *
 * @param incomingHits Number of missile hits after cluster table roll
 * @param diceRoller Dice roller for AMS reduction roll
 * @returns AMS result with hits reduced
 */
export function resolveAMS(
  incomingHits: number,
  diceRoller: DiceRoller,
): IAMSResult {
  // AMS rolls a d6 to determine reduction (we use first die of 2d6 roll)
  const roll = diceRoller();
  const reduction = roll.dice[0]; // Use first die as d6 result
  const hitsReduced = Math.min(reduction, incomingHits);

  return {
    hitsReduced,
    ammoConsumed: 1, // AMS consumes 1 ton of ammo per activation
    roll,
  };
}

/**
 * Apply AMS reduction to missile cluster hits.
 *
 * @param originalHits Hits from cluster table
 * @param amsResult AMS intercept result
 * @returns Remaining hits after AMS reduction (minimum 0)
 */
export function applyAMSReduction(
  originalHits: number,
  amsResult: IAMSResult,
): number {
  return Math.max(0, originalHits - amsResult.hitsReduced);
}

// =============================================================================
// 13.7: TAG Designation
// =============================================================================

/**
 * Check if a target is TAG-designated.
 * TAG designation enables semi-guided LRM and provides targeting bonus.
 */
export function isTargetTAGDesignated(
  targetStatus: ITargetStatusFlags,
): boolean {
  if (!targetStatus.tagDesignated) return false;
  if (targetStatus.ecmProtected) return false; // ECM nullifies TAG
  return true;
}
