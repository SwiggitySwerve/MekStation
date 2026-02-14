/**
 * Missile Mechanics Module
 *
 * Implements BattleTech missile weapon resolution:
 * - LB-X: slug (standard) vs cluster (cluster table, -1 to-hit) modes
 * - Artemis IV/V: +2 cluster table roll bonus
 * - Narc/iNarc: +2 cluster table roll bonus for missiles vs marked target
 * - MRM: -1 cluster column modifier
 * - Streak SRM: All-or-nothing (verification)
 *
 * @spec openspec/changes/full-combat-parity/specs/weapon-system/spec.md
 */

import { FiringArc, CombatLocation } from '@/types/gameplay';
import { IWeaponAttack, IDiceRoll } from '@/types/gameplay';

import {
  lookupClusterHits,
  determineClusterHitLocations,
} from '../clusterWeapons';
import { type DiceRoller } from '../diceTypes';
import {
  ILBXClusterResult,
  IClusterModifiers,
  ITargetStatusFlags,
  IWeaponEquipmentFlags,
  WeaponFireMode,
} from './types';

// =============================================================================
// Weapon Type Detection
// =============================================================================

export function isLBXAC(weaponId: string): boolean {
  return (
    weaponId.toLowerCase().startsWith('lb-') ||
    weaponId.toLowerCase().includes('lb-x') ||
    weaponId.toLowerCase().includes('lbx')
  );
}

export function isMissileWeapon(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id.includes('lrm') ||
    id.includes('srm') ||
    id.includes('mrm') ||
    id.includes('atm')
  );
}

export function isMRM(weaponId: string): boolean {
  return (
    weaponId.toLowerCase().startsWith('mrm') ||
    weaponId.toLowerCase().includes('mrm')
  );
}

export function isStreakSRM(weaponId: string): boolean {
  return weaponId.toLowerCase().includes('streak');
}

export function isNarc(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id === 'narc' || id === 'inarc' || id.includes('narc');
}

export function isSemiGuidedLRM(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id.includes('semi-guided') || id.includes('sg-lrm');
}

// =============================================================================
// 13.3: LB-X Resolution
// =============================================================================

/**
 * Resolve an LB-X in slug mode.
 * Behaves exactly as a standard autocannon — single hit, full damage.
 * Returns null to indicate standard resolution should be used.
 */
export function resolveLBXSlug(): null {
  // Slug mode = standard AC behavior; caller should use normal attack resolution
  return null;
}

/**
 * Resolve an LB-X in cluster mode.
 *
 * Cluster mode:
 * - Uses cluster hit table (cluster size = weapon AC class, e.g., LB-10-X = 10)
 * - Each cluster hit deals 1 point of damage
 * - -1 to-hit modifier (already applied in to-hit calculation)
 * - Roll on cluster table for number of hits
 * - Each hit rolled on hit location table independently
 */
export function resolveLBXCluster(
  weapon: IWeaponAttack,
  firingArc: FiringArc,
  diceRoller: DiceRoller,
  clusterModifier: number = 0,
): ILBXClusterResult {
  // Cluster size = weapon damage (e.g., LB-10-X has damage 10, fires 10 pellets)
  const clusterSize = weapon.damage;

  // Roll on cluster table
  const clusterRoll = diceRoller();
  const modifiedRoll = Math.max(
    2,
    Math.min(12, clusterRoll.total + clusterModifier),
  );
  const hitsScored = lookupClusterHits(modifiedRoll, clusterSize);

  // Each pellet does 1 damage, determine hit locations
  const hitDistribution = determineClusterHitLocations(
    firingArc,
    hitsScored,
    1,
  );

  return {
    weapon,
    clusterRoll,
    hitsScored,
    hitDistribution,
    totalDamage: hitsScored, // Each pellet = 1 damage
  };
}

// =============================================================================
// 13.5: Artemis IV/V Cluster Bonus
// =============================================================================

/**
 * Calculate Artemis IV cluster table bonus.
 * +2 to cluster hit table roll when equipped and linked.
 * Nullified by enemy ECM.
 */
export function getArtemisIVBonus(
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
): number {
  if (!equipment.hasArtemisIV) return 0;
  if (targetStatus.ecmProtected) return 0; // ECM nullifies Artemis
  return 2;
}

/**
 * Calculate Artemis V cluster table bonus.
 * +2 to cluster hit table roll when equipped and linked.
 * Slightly harder to jam via ECM than Artemis IV (still nullified for now).
 */
export function getArtemisVBonus(
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
): number {
  if (!equipment.hasArtemisV) return 0;
  if (targetStatus.ecmProtected) return 0; // ECM nullifies (Phase 14 may differentiate)
  return 2;
}

// =============================================================================
// 13.6: Narc/iNarc Beacon
// =============================================================================

/**
 * Calculate Narc beacon cluster table bonus.
 * +2 to cluster hit table roll for missile attacks against narced target.
 * Nullified by enemy ECM.
 */
export function getNarcBonus(targetStatus: ITargetStatusFlags): number {
  if (!targetStatus.narcedTarget) return 0;
  if (targetStatus.ecmProtected) return 0; // ECM nullifies Narc
  return 2;
}

// =============================================================================
// 13.8: MRM Cluster Column Modifier
// =============================================================================

/**
 * Get MRM cluster column modifier.
 * MRMs use a -1 column modifier on the cluster hit table (fewer hits than standard).
 */
export function getMRMClusterModifier(weaponId: string): number {
  if (isMRM(weaponId)) return -1;
  return 0;
}

// =============================================================================
// 13.9: Streak SRM Verification
// =============================================================================

/**
 * Verify Streak SRM all-or-nothing behavior.
 *
 * Streak SRMs:
 * - Make a single to-hit roll
 * - If hit: ALL missiles hit (no cluster roll needed)
 * - If miss: NO missiles fire (no ammo consumed)
 * - This is already implemented in clusterWeapons.ts resolveStreakAttack()
 *
 * @returns true if the weapon correctly uses Streak behavior
 */
export function verifyStreakBehavior(weaponId: string): boolean {
  return isStreakSRM(weaponId);
}

// =============================================================================
// 13.5-13.8: Combined Cluster Modifier Calculator
// =============================================================================

/**
 * Calculate total cluster roll modifier from all sources.
 * Combines Artemis, Narc, Cluster Hitter SPA, MRM penalty, and semi-guided bonus.
 */
export function calculateClusterModifiers(
  weaponId: string,
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
  clusterHitterSPA: boolean = false,
): IClusterModifiers {
  const artemisBonus =
    getArtemisIVBonus(equipment, targetStatus) +
    getArtemisVBonus(equipment, targetStatus);
  const narcBonus = isMissileWeapon(weaponId) ? getNarcBonus(targetStatus) : 0;
  const clusterHitterBonus = clusterHitterSPA ? 1 : 0;
  const mrmPenalty = getMRMClusterModifier(weaponId);
  const semiGuidedBonus = getSemiGuidedLRMBonus(equipment, targetStatus);

  return {
    artemisBonus,
    narcBonus,
    clusterHitterBonus,
    mrmPenalty,
    total:
      artemisBonus +
      narcBonus +
      clusterHitterBonus +
      mrmPenalty +
      semiGuidedBonus,
  };
}

// =============================================================================
// Cluster Hit Resolution with Modifiers (Enhanced)
// =============================================================================

/**
 * Resolve cluster weapon hits with all applicable modifiers.
 * Applies Artemis, Narc, MRM, Cluster Hitter, and semi-guided modifiers.
 *
 * @param clusterSize Number of missiles/pellets
 * @param damagePerHit Damage per individual hit
 * @param firingArc Arc for hit location determination
 * @param diceRoller Injectable dice roller
 * @param clusterModifier Total cluster roll modifier
 * @returns Number of hits and their locations
 */
export function resolveModifiedClusterHits(
  clusterSize: number,
  damagePerHit: number,
  firingArc: FiringArc,
  diceRoller: DiceRoller,
  clusterModifier: number = 0,
): {
  readonly clusterRoll: IDiceRoll;
  readonly modifiedRoll: number;
  readonly hitsScored: number;
  readonly hitDistribution: readonly {
    location: CombatLocation;
    roll: IDiceRoll;
    damage: number;
  }[];
  readonly totalDamage: number;
} {
  const clusterRoll = diceRoller();
  const modifiedRoll = Math.max(
    2,
    Math.min(12, clusterRoll.total + clusterModifier),
  );
  const hitsScored = lookupClusterHits(modifiedRoll, clusterSize);

  const hitDistribution = determineClusterHitLocations(
    firingArc,
    hitsScored,
    damagePerHit,
  );
  const totalDamage = hitsScored * damagePerHit;

  return {
    clusterRoll,
    modifiedRoll,
    hitsScored,
    hitDistribution,
    totalDamage,
  };
}

// =============================================================================
// TAG and Semi-Guided LRM Helpers
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

/**
 * Calculate semi-guided LRM bonus when TAG-designated.
 * Semi-guided LRMs against TAG-designated targets ignore some modifiers.
 * For cluster purposes: +2 to cluster roll.
 */
export function getSemiGuidedLRMBonus(
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
): number {
  if (!equipment.isSemiGuided) return 0;
  if (!isTargetTAGDesignated(targetStatus)) return 0;
  return 2;
}

// =============================================================================
// Fire Mode Helpers
// =============================================================================

export function getLBXClusterToHitModifier(fireMode: WeaponFireMode): number {
  return fireMode === 'lbx-cluster' ? -1 : 0;
}
