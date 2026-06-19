/**
 * Combat state, context, cluster, and battle-armor event types.
 */

import type {
  IDiceRoll,
  IToHitModifierDetail,
  IWeaponAttack,
} from './CombatAttackTypes';
import type { CombatLocation } from './CombatLocationTypes';
import type { IToHitModifier } from './GameSessionAttackEvents';
import type { ITerrainFeature } from './TerrainTypes';

import { MechLocation } from '../construction/CriticalSlotAllocation';
import { VehicleLocation, VTOLLocation } from '../construction/UnitLocation';
import { TurretType } from '../unit/VehicleInterfaces';
import { FiringArc, RangeBracket, MovementType } from './HexGridInterfaces';

export type PilotMatchTerminalState =
  | 'unhurt'
  | 'wounded'
  | 'unconscious'
  | 'kia'
  | 'ejected';

/**
 * Per-match per-pilot summary record. One entry per pilot active in
 * the match, regardless of side. Conservation invariant from
 * `after-combat-report/spec.md`: the count of summaries grouped by
 * `matchTerminalState` MUST sum to the total pilot roster size, and
 * `count('kia')` MUST equal the count of `UnitDestroyed` events with
 * `cause: 'pilot_death'` OR `cause: 'head_destroyed'` (per side).
 */
export interface IPilotMatchSummary {
  /** Stable pilot identifier (synthetic or vault). */
  readonly pilotId: string;
  /** Unit the pilot was assigned to during the match. */
  readonly unitId: string;
  /** Side label — `'player'`, `'opfor'`, or any custom side identifier. */
  readonly sideId: string;
  /** Closed enum — see `PilotMatchTerminalState`. */
  readonly matchTerminalState: PilotMatchTerminalState;
  /** Cumulative wound count at match end (0-6, capped). */
  readonly finalWoundCount: number;
  /** True if the pilot was conscious at match end. */
  readonly wasConscious: boolean;
}

// =============================================================================
// Cluster Weapons
// =============================================================================

/**
 * Cluster hit table row.
 */
export interface IClusterHitRow {
  /** 2d6 roll value */
  readonly roll: number;
  /** Hits by cluster size (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20) */
  readonly hits: Record<number, number>;
}

/**
 * Cluster attack result.
 */
export interface IClusterResult {
  /** Weapon fired */
  readonly weapon: IWeaponAttack;
  /** Roll on cluster table */
  readonly clusterRoll: IDiceRoll;
  /** Number of missiles/projectiles that hit */
  readonly hitsScored: number;
  /** Damage per hit */
  readonly damagePerHit: number;
  /** Total damage */
  readonly totalDamage: number;
  /** Distribution of hits across locations */
  readonly hitDistribution: readonly IClusterHitLocation[];
}

/**
 * Single cluster hit location.
 */
export interface IClusterHitLocation {
  /** Location hit */
  readonly location: CombatLocation;
  /** Hit location roll */
  readonly roll: IDiceRoll;
  /** Damage at this location */
  readonly damage: number;
}

// =============================================================================
// Combat Context
// =============================================================================

/**
 * Actuator damage state for an arm.
 */
export interface IActuatorDamage {
  /** Shoulder actuator destroyed */
  readonly shoulderDestroyed: boolean;
  /** Upper arm actuator destroyed */
  readonly upperArmDestroyed: boolean;
  /** Lower arm actuator destroyed */
  readonly lowerArmDestroyed: boolean;
}

/**
 * Secondary target information.
 */
export interface ISecondaryTarget {
  /** Whether this is a secondary target */
  readonly isSecondary: boolean;
  /** Whether the secondary target is in the front arc */
  readonly inFrontArc: boolean;
}

/**
 * Indirect fire information.
 */
export interface IIndirectFire {
  /** Whether this is an indirect fire attack */
  readonly isIndirect: boolean;
  /** Whether the spotter walked this turn. Legacy field for +1 walk-only callers. */
  readonly spotterWalked: boolean;
  /** Optional represented spotter movement penalty: walk=1, run=2, jump=3. */
  readonly spotterMovementPenalty?: number;
}

/**
 * Attacker combat state for to-hit calculation.
 */
export interface IAttackerState {
  readonly gunnery: number;
  readonly movementType: MovementType;
  readonly isAirborne?: boolean;
  readonly heat: number;
  readonly damageModifiers: readonly IToHitModifierDetail[];
  readonly pilotWounds?: number;
  readonly sensorHits?: number;
  readonly actuatorDamage?: IActuatorDamage;
  readonly targetingComputer?: boolean;
  readonly prone?: boolean;
  readonly isSpotting?: boolean;
  readonly secondaryTarget?: ISecondaryTarget;
  readonly indirectFire?: IIndirectFire;
  readonly calledShot?: boolean;
  readonly teammateCalledShot?: boolean;
  /** Set false for source-backed BattleMech combat paths that must not apply local called-shot SPA helper reductions. */
  readonly applyLocalCalledShotAbilityReduction?: boolean;
  readonly abilities?: readonly string[];
  /**
   * Explicit represented neural-interface state for VDNI/BVDNI/TCP effects.
   * Undefined preserves legacy implicit-active fixtures; false means installed
   * neural hardware is not connected for this attack state.
   */
  readonly neuralInterfaceActive?: boolean;
  readonly weaponType?: string;
  readonly designatedWeaponType?: string;
  readonly weaponCategory?: string;
  readonly designatedWeaponCategory?: string;
  readonly targetId?: string;
  readonly designatedTargetId?: string;
  readonly designatedRangeBracket?: RangeBracket;
  readonly designatedEnvironment?: string;
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  /**
   * Vehicle-only context fields. Populated when the attacker is a ground or
   * VTOL combat vehicle so the to-hit pipeline can apply vehicle-scoped
   * modifiers (e.g. chin-turret pivot penalty). Mech / aerospace / battle
   * armor callers leave these undefined and incur no vehicle penalty paths.
   *
   * @see calculateChinTurretPivotModifier (utils/gameplay/toHit/vehicleModifiers.ts)
   */
  readonly vehicleTurretType?: TurretType;
  readonly vehicleTurretPivotedThisTurn?: boolean;
  readonly vehicleWeaponMountLocation?: VehicleLocation | VTOLLocation;
  readonly vehicleWeaponIsTurretMounted?: boolean;
}

/**
 * Target combat state for to-hit calculation.
 */
export interface ITargetState {
  readonly unitType?: string;
  readonly movementType: MovementType;
  readonly isAirborne?: boolean;
  readonly hexesMoved: number;
  readonly prone: boolean;
  readonly immobile: boolean;
  readonly partialCover: boolean;
  /** Whether the target is in hull-down position (shields legs from front arc). */
  readonly hullDown?: boolean;
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  readonly abilities?: readonly string[];
  readonly isDodging?: boolean;
  readonly isEvading?: boolean;
  /**
   * Optional source-backed evasion to-hit bonus copied into combat state.
   * When absent, explicit `isEvading` keeps the normal +1; explicit 0 models
   * Skilled Evasion cases that create an evading state without a bonus.
   */
  readonly evasionBonus?: number;
  /**
   * Explicit target movement state for optional TacOps Sprint. Declared
   * sprint movement and replayed/prehydrated sprint state feed source-backed
   * to-hit resolution.
   */
  readonly sprintedThisTurn?: boolean;
  readonly terrainFeatures?: readonly ITerrainFeature[];
}

/**
 * Full combat context for attack resolution.
 */
export interface ICombatContext {
  /** Attacker state */
  readonly attacker: IAttackerState;
  /** Target state */
  readonly target: ITargetState;
  /** Range to target */
  readonly range: number;
  /** Firing arc */
  readonly arc: FiringArc;
  /** Environmental modifiers */
  readonly environmental: readonly IToHitModifierDetail[];
}

// Re-export IToHitModifier for convenience
export type { IToHitModifier };

export {
  getFrontCombatLocation,
  getTransferCombatLocation,
  getTransferLocation,
  isLimbLocation,
  isRearCombatLocation,
  isTorsoLocation,
} from './CombatLocationHelpers';

// =============================================================================
// Battle Armor Combat State
// =============================================================================

/**
 * Per-trooper state tracked throughout a match. Dead troopers are retained
 * with `alive: false` so index positions remain stable for mounted-trooper
 * location lookups. Indices are 1-based (LOC_TROOPER_1..LOC_TROOPER_6) per
 * MegaMek convention.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */
export interface ITrooperState {
  /** 1-based trooper index (1..squadSize). */
  readonly index: number;
  /** False once armorRemaining reaches 0 (kills are permanent). */
  alive: boolean;
  /** Armor points left; reaching 0 kills the trooper. */
  armorRemaining: number;
  /** Equipment slot IDs destroyed by crit events on this trooper. */
  equipmentDestroyed: string[];
}

/**
 * Squad-level combat slice for a BA unit. Carried alongside the immutable
 * `IBattleArmorUnit` construction record so the engine can track per-battle
 * mutable state without mutating the unit definition.
 *
 * `swarmedByUnitIds` exists here so this interface can be embedded on ANY
 * unit (a host mech will have this field populated while a BA squad is
 * attached, even though the mech itself has no troopers).
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */
export interface IBASquadCombatState {
  /** Per-trooper state array; dead troopers retained with alive=false. */
  readonly troopers: ITrooperState[];
  /** ID of the host mech this squad is currently attached to as a swarmer. */
  swarmingUnitId?: string;
  /** IDs of BA squads currently swarming THIS unit (on the host side). */
  swarmedByUnitIds: string[];
  /** ID of the friendly host this squad is mounted on as a passenger. */
  mountedOn?: string;
  /** True when mimetic armor was activated this turn (squad did not move). */
  mimeticActiveThisTurn: boolean;
  /** True when stealth armor was activated this turn. */
  stealthActiveThisTurn: boolean;
}

// =============================================================================
// Battle Armor Combat Events
// =============================================================================

/**
 * Discriminated union of all BA-specific combat events emitted by the
 * battle-armor combat pipeline.
 *
 * The `squadId` / `attackerId` / `hostId` fields are unit IDs that can be
 * correlated with `IGameUnit.id` in the session state.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 * @spec openspec/changes/add-battle-armor-combat/specs/combat-resolution/spec.md
 */
export type BACombatEvent =
  /** Emitted when a BA squad successfully attaches to a host mech via swarm. */
  | { kind: 'BASwarmAttached'; attackerId: string; hostId: string }
  /** Emitted when a BA squad detaches from a host mech. */
  | {
      kind: 'BASwarmDetached';
      attackerId: string;
      hostId: string;
      reason: 'BrushedOff' | 'DroppedProne' | 'SquadDestroyed';
    }
  /** Emitted each turn the squad fires squad-mounted weapons while swarming. */
  | {
      kind: 'BASwarmDamageApplied';
      attackerId: string;
      hostId: string;
      totalDamage: number;
      perWeapon: { weaponId: string; damage: number }[];
    }
  /** Emitted when a BA squad resolves a leg attack. */
  | {
      kind: 'BALegAttackResolved';
      attackerId: string;
      targetId: string;
      hitLocation: MechLocation;
      damage: number;
      critModifier: number;
    }
  /** Emitted when a BA squad resolves a vibroclaw melee attack. */
  | {
      kind: 'BAVibroclawAttackResolved';
      attackerId: string;
      targetId: string;
      damage: number;
      missileHits: number;
      vibroClawCount: number;
    }
  /** Emitted when a trooper's armorRemaining reaches 0. */
  | {
      kind: 'BATrooperKilled';
      squadId: string;
      trooperIndex: number;
      hostId?: string;
    }
  /** Emitted when a mech attempts to brush off an attached swarmer. */
  | {
      kind: 'BABrushOffAttempted';
      hostId: string;
      targetSwarmerId: string;
      outcome: 'hit' | 'miss';
    };
