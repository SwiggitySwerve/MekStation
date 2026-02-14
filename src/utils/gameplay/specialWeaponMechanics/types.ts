/**
 * Special Weapon Mechanics Types
 *
 * Shared type definitions for weapon equipment flags, fire modes, and target status.
 */

import { CombatLocation } from '@/types/gameplay';
import { IWeaponAttack, IDiceRoll } from '@/types/gameplay';

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
