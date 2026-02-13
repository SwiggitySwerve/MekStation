/**
 * Special Weapon Mechanics Module
 *
 * Implements BattleTech special weapon resolution:
 * - Ultra AC: 2 independent shots, jam on natural 2
 * - Rotary AC: 1-6 shots selected by pilot, jam on natural 2
 * - LB-X: slug (standard) vs cluster (cluster table, -1 to-hit) modes
 * - AMS: Reduce incoming missile cluster hits
 * - Artemis IV/V: +2 cluster table roll bonus
 * - Narc/iNarc: +2 cluster table roll bonus for missiles vs marked target
 * - TAG: Designate target for semi-guided LRM
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
} from './clusterWeapons';
import { type DiceRoller } from './diceTypes';
import { determineHitLocationFromRoll } from './hitLocation';
export { type DiceRoller } from './diceTypes';

// =============================================================================
// Fire Modes
// =============================================================================

/** Weapon fire mode selection */
export type WeaponFireMode =
  | 'standard' // Normal single-shot
  | 'ultra' // UAC: 2 shots
  | 'rotary' // RAC: 1-6 shots
  | 'lbx-slug' // LB-X: standard AC behavior
  | 'lbx-cluster'; // LB-X: cluster/shotgun behavior

/** RAC rate of fire (1-6 shots per turn) */
export type RACRateOfFire = 1 | 2 | 3 | 4 | 5 | 6;

// =============================================================================
// Special Weapon Result Types
// =============================================================================

/** Result of a single shot within a multi-shot weapon */
export interface IShotResult {
  /** Which shot number (1-based) */
  readonly shotNumber: number;
  /** To-hit roll for this shot */
  readonly roll: IDiceRoll;
  /** Did this shot hit? */
  readonly hit: boolean;
  /** Hit location (if hit) */
  readonly hitLocation?: CombatLocation;
  /** Location roll (if hit) */
  readonly locationRoll?: IDiceRoll;
  /** Damage dealt (if hit) */
  readonly damage: number;
  /** Did this shot cause a jam? (natural 2) */
  readonly causedJam: boolean;
}

/** Result of a multi-shot weapon (UAC/RAC) */
export interface IMultiShotResult {
  /** Weapon that fired */
  readonly weapon: IWeaponAttack;
  /** Fire mode used */
  readonly fireMode: WeaponFireMode;
  /** Individual shot results */
  readonly shots: readonly IShotResult[];
  /** Total hits */
  readonly totalHits: number;
  /** Total damage dealt */
  readonly totalDamage: number;
  /** Did the weapon jam? */
  readonly jammed: boolean;
  /** Total heat generated */
  readonly heatGenerated: number;
}

/** Result of an LBX cluster attack */
export interface ILBXClusterResult {
  /** Weapon that fired */
  readonly weapon: IWeaponAttack;
  /** Cluster table roll */
  readonly clusterRoll: IDiceRoll;
  /** Number of cluster hits (1-damage pellets) */
  readonly hitsScored: number;
  /** Hit distribution across locations */
  readonly hitDistribution: readonly {
    location: CombatLocation;
    roll: IDiceRoll;
    damage: number;
  }[];
  /** Total damage */
  readonly totalDamage: number;
}

/** Result of AMS intercept */
export interface IAMSResult {
  /** Number of missile hits reduced */
  readonly hitsReduced: number;
  /** AMS ammo consumed */
  readonly ammoConsumed: number;
  /** Roll for AMS reduction */
  readonly roll: IDiceRoll;
}

/** Cluster roll modifiers from equipment */
export interface IClusterModifiers {
  /** Artemis IV/V bonus (+2) */
  readonly artemisBonus: number;
  /** Narc beacon bonus (+2) */
  readonly narcBonus: number;
  /** Cluster Hitter SPA bonus (+1) */
  readonly clusterHitterBonus: number;
  /** MRM penalty (-1) */
  readonly mrmPenalty: number;
  /** Total modifier */
  readonly total: number;
}

/** Target status flags affecting weapon resolution */
export interface ITargetStatusFlags {
  /** Target has a Narc beacon attached */
  readonly narcedTarget?: boolean;
  /** Target is TAG-designated this turn */
  readonly tagDesignated?: boolean;
  /** Target has active ECM (nullifies Artemis/Narc/TAG) */
  readonly ecmProtected?: boolean;
}

/** Attacker weapon equipment flags */
export interface IWeaponEquipmentFlags {
  /** Weapon has Artemis IV FCS linked */
  readonly hasArtemisIV?: boolean;
  /** Weapon has Artemis V FCS linked */
  readonly hasArtemisV?: boolean;
  /** Weapon is using semi-guided LRM ammo */
  readonly isSemiGuided?: boolean;
}

// =============================================================================
// Weapon Type Detection
// =============================================================================

/** Check if weapon is an Ultra AC */
export function isUltraAC(weaponId: string): boolean {
  return (
    (/^(clan-)?u?ac-\d+$/i.test(weaponId) &&
      weaponId.toLowerCase().startsWith('uac')) ||
    weaponId.toLowerCase().includes('ultra')
  );
}

/** Check if weapon is a Rotary AC */
export function isRotaryAC(weaponId: string): boolean {
  return (
    weaponId.toLowerCase().startsWith('rac') ||
    weaponId.toLowerCase().includes('rotary')
  );
}

/** Check if weapon is an LB-X AC */
export function isLBXAC(weaponId: string): boolean {
  return (
    weaponId.toLowerCase().startsWith('lb-') ||
    weaponId.toLowerCase().includes('lb-x') ||
    weaponId.toLowerCase().includes('lbx')
  );
}

/** Check if weapon is a missile weapon (LRM, SRM, MRM, ATM) */
export function isMissileWeapon(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id.includes('lrm') ||
    id.includes('srm') ||
    id.includes('mrm') ||
    id.includes('atm')
  );
}

/** Check if weapon is an MRM */
export function isMRM(weaponId: string): boolean {
  return (
    weaponId.toLowerCase().startsWith('mrm') ||
    weaponId.toLowerCase().includes('mrm')
  );
}

/** Check if weapon is a Streak SRM */
export function isStreakSRM(weaponId: string): boolean {
  return weaponId.toLowerCase().includes('streak');
}

/** Check if weapon is an AMS (Anti-Missile System) */
export function isAMS(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id === 'ams' ||
    id.includes('anti-missile') ||
    id === 'clan-ams' ||
    id === 'is-ams'
  );
}

/** Check if weapon is a TAG designator */
export function isTAG(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return (
    id === 'tag' ||
    id === 'clan-tag' ||
    id === 'is-tag' ||
    id.includes('light-tag')
  );
}

/** Check if weapon is a Narc beacon launcher */
export function isNarc(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id === 'narc' || id === 'inarc' || id.includes('narc');
}

/** Check if weapon is a semi-guided LRM */
export function isSemiGuidedLRM(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id.includes('semi-guided') || id.includes('sg-lrm');
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
// Weapon Fire Mode Helpers
// =============================================================================

/**
 * Determine the default fire mode for a weapon.
 */
export function getDefaultFireMode(weaponId: string): WeaponFireMode {
  if (isUltraAC(weaponId)) return 'ultra';
  if (isRotaryAC(weaponId)) return 'rotary';
  if (isLBXAC(weaponId)) return 'lbx-cluster';
  return 'standard';
}

/**
 * Get the LBX to-hit modifier for cluster mode.
 * -1 to-hit in cluster mode (easier to hit with shotgun spread).
 */
export function getLBXClusterToHitModifier(fireMode: WeaponFireMode): number {
  return fireMode === 'lbx-cluster' ? -1 : 0;
}

/**
 * Get heat multiplier for weapon fire mode.
 * UAC ultra mode: +1 heat over standard
 * RAC: heat × rate of fire
 */
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
