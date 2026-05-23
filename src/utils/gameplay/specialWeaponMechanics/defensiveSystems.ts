/**
 * Defensive Systems Module
 *
 * Implements BattleTech defensive weapon systems:
 * - AMS: Reduce incoming missile cluster hits
 * - TAG: Designate target for semi-guided LRM
 *
 * @spec openspec/changes/full-combat-parity/specs/weapon-system/spec.md
 */

import { lookupClusterHits } from '../clusterWeapons';
import { type DiceRoller } from '../diceTypes';
import { IAMSResult, ITargetStatusFlags } from './types';

// =============================================================================
// Weapon Type Detection
// =============================================================================

export function isAMS(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id === 'ams' ||
    id.endsWith('-ams') ||
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
 * AMS reduces missile clusters by applying a -4 cluster-table modifier:
 * - Consumes AMS ammo per activation
 * - Cannot reduce below the cluster table's minimum roll
 *
 * @param incomingHits Number of missile hits before AMS
 * @param diceRoller Dice roller for cluster roll evidence
 * @param rackSize Missile rack size for cluster-table lookup
 * @returns AMS result with hits reduced and remaining
 */
export function resolveAMS(
  incomingHits: number,
  diceRoller: DiceRoller,
  rackSize: number = incomingHits,
): IAMSResult {
  const roll = diceRoller();
  const clusterRoll = roll.total;
  const clusterModifier = -4;
  const modifiedClusterRoll = Math.max(2, clusterRoll + clusterModifier);
  const hitsRemaining = lookupClusterHits(modifiedClusterRoll, rackSize);
  const hitsReduced = Math.max(0, incomingHits - hitsRemaining);

  return {
    hitsReduced,
    hitsRemaining,
    ammoConsumed: 1,
    roll,
    clusterRoll,
    clusterModifier,
    modifiedClusterRoll,
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
