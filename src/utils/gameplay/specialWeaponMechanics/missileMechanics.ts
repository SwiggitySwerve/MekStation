/**
 * Missile Mechanics Module
 *
 * Implements BattleTech missile weapon resolution:
 * - LB-X: slug (standard) vs cluster (cluster table, -1 to-hit) modes
 * - Artemis IV/prototype IV/V: +2/+1/+3 cluster table roll bonus
 * - Narc/iNarc: +2 cluster table roll bonus for NARC-compatible missiles vs marked target
 * - Low Profile: -4 cluster table roll penalty against qualifying targets
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
// =============================================================================
// Weapon Type Detection
// =============================================================================
import {
  ILBXClusterResult,
  IClusterModifiers,
  ITargetStatusFlags,
  IWeaponEquipmentFlags,
  WeaponFireMode,
} from './types';

export function isMissileWeapon(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id.includes('lrm') ||
    id.includes('srm') ||
    id.includes('mml') ||
    id.includes('mrm') ||
    id.includes('atm')
  );
}

export function isArtemisCompatibleMissileWeapon(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  if (id.includes('streak')) return false;
  return id.includes('lrm') || id.includes('srm') || id.includes('mml');
}

export function isNarcCompatibleMissileWeapon(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  if (id.includes('streak')) return false;
  return (
    id.includes('lrm') ||
    id.includes('srm') ||
    id.includes('mml') ||
    id.includes('nlrm')
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
  return /semi[-\s]?guided/.test(id) || /\bsg[-\s]?lrm\b/.test(id);
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
// 13.5: Artemis IV/prototype IV/V Cluster Bonus
// =============================================================================

function isArtemisSuppressedByECM(targetStatus: ITargetStatusFlags): boolean {
  return (
    targetStatus.flightPathEcmAffected === true ||
    targetStatus.ecmProtected === true
  );
}

/**
 * Calculate Artemis IV cluster table bonus.
 * +2 to cluster hit table roll when equipped and linked.
 * Nullified by enemy ECM, indirect fire, and active stealth on the attacker.
 */
export function getArtemisIVBonus(
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
): number {
  if (!equipment.hasArtemisIV) return 0;
  if (targetStatus.isIndirectFire) return 0;
  if (isArtemisSuppressedByECM(targetStatus)) return 0;
  if (targetStatus.attackerStealthActive) return 0;
  return 2;
}

/**
 * Calculate prototype Artemis IV cluster table bonus.
 * +1 to cluster hit table roll when equipped and linked.
 */
export function getPrototypeArtemisIVBonus(
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
): number {
  if (!equipment.hasPrototypeArtemisIV) return 0;
  if (targetStatus.isIndirectFire) return 0;
  if (isArtemisSuppressedByECM(targetStatus)) return 0;
  if (targetStatus.attackerStealthActive) return 0;
  return 1;
}

/**
 * Calculate Artemis V cluster table bonus.
 * +3 to cluster hit table roll when equipped and linked.
 */
export function getArtemisVBonus(
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
): number {
  if (!equipment.hasArtemisV) return 0;
  if (targetStatus.isIndirectFire) return 0;
  if (isArtemisSuppressedByECM(targetStatus)) return 0;
  if (targetStatus.attackerStealthActive) return 0;
  return 3;
}

// =============================================================================
// 13.6: Narc/iNarc Beacon
// =============================================================================

/**
 * Calculate Narc beacon cluster table bonus.
 * +2 to cluster hit table roll for NARC-compatible missile attacks against narced target.
 * Nullified by enemy ECM.
 */
export function getNarcBonus(targetStatus: ITargetStatusFlags): number {
  if (!targetStatus.narcedTarget) return 0;
  if (targetStatus.isIndirectFire) return 0;
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

export function getLowProfileClusterModifier(
  targetStatus: ITargetStatusFlags,
): number {
  return targetStatus.lowProfile === true ? -4 : 0;
}

function normalizeWeaponDesignation(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function designationMatchesWeapon(
  designatedWeaponType: string,
  weaponId: string,
  weaponName?: string,
): boolean {
  const normalizedDesignation =
    normalizeWeaponDesignation(designatedWeaponType);
  return [weaponId, weaponName]
    .filter((value): value is string => typeof value === 'string')
    .some(
      (value) => normalizeWeaponDesignation(value) === normalizedDesignation,
    );
}

export function getSandblasterClusterModifier(options: {
  readonly hasSandblaster?: boolean;
  readonly weaponId: string;
  readonly weaponName?: string;
  readonly designatedWeaponType?: string;
  readonly range?: number;
  readonly shortRange?: number;
  readonly mediumRange?: number;
}): number {
  const {
    designatedWeaponType,
    hasSandblaster,
    mediumRange,
    range,
    shortRange,
    weaponId,
    weaponName,
  } = options;

  if (hasSandblaster !== true || !designatedWeaponType) return 0;
  if (range === undefined || shortRange === undefined) return 0;
  if (!designationMatchesWeapon(designatedWeaponType, weaponId, weaponName)) {
    return 0;
  }

  if (mediumRange !== undefined && range > mediumRange) return 2;
  if (range > shortRange) return 3;
  return 4;
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
 * Calculate total cluster roll modifier from all source-backed cluster-table
 * sources. Semi-guided TAG behavior is intentionally excluded here because the
 * source-backed behavior is to-hit target-movement and indirect-fire relief.
 */
export function calculateClusterModifiers(
  weaponId: string,
  equipment: IWeaponEquipmentFlags,
  targetStatus: ITargetStatusFlags,
  clusterHitterSPA: boolean = false,
  sandblasterBonus: number = 0,
): IClusterModifiers {
  const artemisBonus = isArtemisCompatibleMissileWeapon(weaponId)
    ? equipment.hasArtemisV
      ? getArtemisVBonus(equipment, targetStatus)
      : equipment.hasArtemisIV
        ? getArtemisIVBonus(equipment, targetStatus)
        : getPrototypeArtemisIVBonus(equipment, targetStatus)
    : 0;
  const narcBonus = isNarcCompatibleMissileWeapon(weaponId)
    ? getNarcBonus(targetStatus)
    : 0;
  const lowProfilePenalty = getLowProfileClusterModifier(targetStatus);
  const clusterHitterBonus =
    sandblasterBonus > 0 ? 0 : clusterHitterSPA ? 1 : 0;
  const mrmPenalty = getMRMClusterModifier(weaponId);

  return {
    artemisBonus,
    narcBonus,
    lowProfilePenalty,
    sandblasterBonus,
    clusterHitterBonus,
    mrmPenalty,
    total:
      artemisBonus +
      narcBonus +
      lowProfilePenalty +
      sandblasterBonus +
      clusterHitterBonus +
      mrmPenalty,
  };
}

// =============================================================================
// Cluster Hit Resolution with Modifiers (Enhanced)
// =============================================================================

/**
 * Resolve cluster weapon hits with all applicable modifiers.
 * Applies source-backed cluster modifiers such as Artemis, Narc, MRM, and
 * Cluster Hitter.
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
// Fire Mode Helpers
// =============================================================================

export function getLBXClusterToHitModifier(fireMode: WeaponFireMode): number {
  return fireMode === 'lbx-cluster' ? -1 : 0;
}
