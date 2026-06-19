/**
 * Combat attack declaration and resolution types.
 */

import type { CombatLocation } from './CombatLocationTypes';
import type { WeaponFireMode } from './IndirectFireInterfaces';

import { MechLocation } from '../construction/CriticalSlotAllocation';
import { VehicleLocation, VTOLLocation } from '../construction/UnitLocation';
import { WeaponCategory } from '../equipment/weapons/interfaces';
import { FiringArc, RangeBracket } from './HexGridInterfaces';

export function combatLocationToMechLocation(
  loc: CombatLocation,
): MechLocation {
  const map: Record<CombatLocation, MechLocation> = {
    head: MechLocation.HEAD,
    center_torso: MechLocation.CENTER_TORSO,
    center_torso_rear: MechLocation.CENTER_TORSO, // Rear uses same base location
    left_torso: MechLocation.LEFT_TORSO,
    left_torso_rear: MechLocation.LEFT_TORSO,
    right_torso: MechLocation.RIGHT_TORSO,
    right_torso_rear: MechLocation.RIGHT_TORSO,
    left_arm: MechLocation.LEFT_ARM,
    right_arm: MechLocation.RIGHT_ARM,
    left_leg: MechLocation.LEFT_LEG,
    right_leg: MechLocation.RIGHT_LEG,
  };
  return map[loc];
}

// =============================================================================
// Enums
// =============================================================================

/**
 * Attack result types.
 */
export enum AttackResult {
  Hit = 'hit',
  Miss = 'miss',
  CriticalHit = 'critical_hit',
  AutomaticMiss = 'automatic_miss',
}

/**
 * Critical hit severity.
 */
export enum CriticalSeverity {
  /** Standard critical - 1 slot damaged */
  Standard = 'standard',
  /** Through armor critical (TAC) - 2 slots damaged */
  ThroughArmor = 'through_armor',
  /** Limb blown off */
  LimbBlownOff = 'limb_blown_off',
}

// =============================================================================
// Attack Declaration
// =============================================================================

/**
 * Weapon used in an attack.
 */
export interface IWeaponAttack {
  /** Weapon ID (slot reference) */
  readonly weaponId: string;
  /** Weapon name */
  readonly weaponName: string;
  /** Resolved per-weapon fire mode for this attack. Defaults to Direct. */
  readonly mode?: WeaponFireMode;
  /** Mounted firing arc, when known. Missing means legacy omnidirectional. */
  readonly mountingArc?: FiringArc;
  /**
   * Mounted firing arcs when the represented mount covers multiple chassis
   * arcs. Missing means legacy omnidirectional/unknown coverage.
   */
  readonly mountingArcs?: readonly FiringArc[];
  /** Mounted chassis location, when known. */
  readonly location?: string;
  /** Vehicle mount location, when this attack originates from a vehicle. */
  readonly vehicleMountLocation?: VehicleLocation | VTOLLocation;
  /** True when the attack weapon is mounted in the vehicle primary turret. */
  readonly vehicleIsTurretMounted?: boolean;
  /** Damage per hit */
  readonly damage: number;
  /** Heat generated */
  readonly heat: number;
  /** Weapon category */
  readonly category: WeaponCategory;
  /** Ammo type (if applicable) */
  readonly ammoType?: string;
  /** Minimum range (0 = no minimum) */
  readonly minRange: number;
  /** Short range (0-N: +0) */
  readonly shortRange: number;
  /** Medium range (short+1 to N: +2) */
  readonly mediumRange: number;
  /** Long range (medium+1 to N: +4) */
  readonly longRange: number;
  /** Extreme range (long+1 to N: +6, optional for non-artillery weapons) */
  readonly extremeRange?: number;
  /** Is this a cluster weapon? */
  readonly isCluster: boolean;
  /** Cluster size (if cluster weapon) */
  readonly clusterSize?: number;
  /** True for represented torpedo weapons that must remain in water. */
  readonly isTorpedo?: boolean;
  /** Attack declares a TacOps-style called shot. */
  readonly calledShot?: boolean;
  /** Called-shot setup was provided by a teammate. */
  readonly teammateCalledShot?: boolean;
}

/**
 * Attack declaration before resolution.
 */
export interface IAttackDeclaration {
  /** Unique declaration ID */
  readonly id: string;
  /** Attacker unit ID */
  readonly attackerId: string;
  /** Target unit ID */
  readonly targetId: string;
  /** Weapon(s) being fired */
  readonly weapons: readonly IWeaponAttack[];
  /** Range to target (in hexes) */
  readonly range: number;
  /** Range bracket */
  readonly rangeBracket: RangeBracket;
  /** Firing arc to target */
  readonly firingArc: FiringArc;
  /** Total heat generated */
  readonly totalHeat: number;
  /** Ammo consumed per weapon */
  readonly ammoConsumed: Record<string, number>;
}

/**
 * Validation result for attack declaration.
 */
export interface IAttackValidation {
  /** Is the attack valid? */
  readonly valid: boolean;
  /** Error messages if invalid */
  readonly errors: readonly string[];
  /** Warnings (attack valid but suboptimal) */
  readonly warnings: readonly string[];
}

// =============================================================================
// To-Hit Calculation
// =============================================================================

/**
 * To-hit modifier source categories.
 */
export type ToHitModifierSource =
  | 'base'
  | 'range'
  | 'attacker_movement'
  | 'target_movement'
  | 'heat'
  | 'damage'
  | 'terrain'
  | 'equipment'
  | 'spa'
  | 'quirk'
  | 'environmental'
  | 'other';

/**
 * Extended to-hit modifier with typed source.
 * Use this for detailed combat calculations.
 * The base IToHitModifier from GameSessionInterfaces is used in events.
 */
export interface IToHitModifierDetail {
  /** Modifier name for display */
  readonly name: string;
  /** Modifier value (positive = harder to hit) */
  readonly value: number;
  /** Source category */
  readonly source: ToHitModifierSource;
  /** Detailed description */
  readonly description?: string;
}

/**
 * Complete to-hit calculation breakdown.
 */
export interface IToHitCalculation {
  /** Base to-hit (gunnery skill) */
  readonly baseToHit: number;
  /** All modifiers applied */
  readonly modifiers: readonly IToHitModifierDetail[];
  /** Final to-hit number */
  readonly finalToHit: number;
  /** Is hit impossible (to-hit > 12)? */
  readonly impossible: boolean;
  /** Probability of success (2d6 >= finalToHit) */
  readonly probability: number;
}

// =============================================================================
// Attack Resolution
// =============================================================================

/**
 * Dice roll result.
 */
export interface IDiceRoll {
  /** Individual dice values */
  readonly dice: readonly number[];
  /** Total roll value */
  readonly total: number;
  /** Is this a natural 2 (snake eyes)? */
  readonly isSnakeEyes: boolean;
  /** Is this a natural 12 (boxcars)? */
  readonly isBoxcars: boolean;
}

/**
 * Single weapon attack resolution.
 */
export interface IWeaponResolution {
  /** Weapon that was fired */
  readonly weapon: IWeaponAttack;
  /** To-hit calculation */
  readonly toHit: IToHitCalculation;
  /** Attack roll */
  readonly roll: IDiceRoll;
  /** Attack result */
  readonly result: AttackResult;
  /** Hit location (if hit) */
  readonly hitLocation?: CombatLocation;
  /** Damage dealt (if hit) */
  readonly damage?: number;
  /** Cluster hits (for cluster weapons) */
  readonly clusterHits?: number;
}

/**
 * Complete attack resolution.
 */
export interface IAttackResolution {
  /** Original declaration */
  readonly declaration: IAttackDeclaration;
  /** Resolution for each weapon */
  readonly weaponResolutions: readonly IWeaponResolution[];
  /** Total damage dealt */
  readonly totalDamage: number;
  /** Locations hit */
  readonly locationsHit: readonly CombatLocation[];
}
