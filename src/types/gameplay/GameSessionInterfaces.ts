/**
 * Game Session Interfaces
 * Core type definitions for the game session system.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import type { IAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import type { IInfantryCombatState } from '@/utils/gameplay/infantry/state';
import type { IProtoMechCombatState } from '@/utils/gameplay/protomech/state';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type { IAmmoConstructionInit } from './AmmoTypes';
import type { IBattleArmorCombatState } from './BattleArmorCombatInterfaces';
import type {
  ILegAttackPayload,
  IMimeticBonusPayload,
  ISquadEliminatedPayload,
  IStealthBonusPayload,
  ISwarmAttachedPayload,
  ISwarmDamagePayload,
  ISwarmDismountedPayload,
  ITrooperKilledPayload,
} from './BattleArmorCombatInterfaces';
import type { IEnvironmentalConditions } from './EnvironmentalConditions';

import { IHexCoordinate, Facing, MovementType } from './HexGridInterfaces';

// =============================================================================
// Enums
// =============================================================================

/**
 * Game session lifecycle states.
 */
export enum GameStatus {
  /** Game is being configured */
  Setup = 'setup',
  /** Game is actively being played */
  Active = 'active',
  /** Game has ended */
  Completed = 'completed',
  /** Game was abandoned */
  Abandoned = 'abandoned',
}

/**
 * Game phases in turn order.
 */
export enum GamePhase {
  /** Determine initiative order */
  Initiative = 'initiative',
  /** Units move in alternating order */
  Movement = 'movement',
  /** Weapon attacks are declared and resolved */
  WeaponAttack = 'weapon_attack',
  /** Physical attacks (future) */
  PhysicalAttack = 'physical_attack',
  /** Heat accumulation and dissipation */
  Heat = 'heat',
  /** End of turn cleanup and victory check */
  End = 'end',
}

/**
 * Lock states for actions.
 */
export enum LockState {
  /** Action not yet started */
  Pending = 'pending',
  /** Action is being planned (can be changed) */
  Planning = 'planning',
  /** Action is locked (cannot be changed) */
  Locked = 'locked',
  /** Action has been revealed */
  Revealed = 'revealed',
  /** Action has been resolved */
  Resolved = 'resolved',
}

/**
 * All game event types.
 */
export enum GameEventType {
  // Lifecycle events
  GameCreated = 'game_created',
  GameStarted = 'game_started',
  GameEnded = 'game_ended',

  // Turn/Phase events
  TurnStarted = 'turn_started',
  TurnEnded = 'turn_ended',
  PhaseChanged = 'phase_changed',

  // Initiative events
  InitiativeRolled = 'initiative_rolled',
  InitiativeOrderSet = 'initiative_order_set',

  // Movement events
  MovementDeclared = 'movement_declared',
  MovementLocked = 'movement_locked',
  FacingChanged = 'facing_changed',

  // Combat events
  AttackDeclared = 'attack_declared',
  AttackLocked = 'attack_locked',
  AttacksRevealed = 'attacks_revealed',
  AttackResolved = 'attack_resolved',
  DamageApplied = 'damage_applied',

  // Status events
  HeatGenerated = 'heat_generated',
  HeatDissipated = 'heat_dissipated',
  HeatEffectApplied = 'heat_effect_applied',
  PilotHit = 'pilot_hit',
  UnitDestroyed = 'unit_destroyed',
  AmmoExplosion = 'ammo_explosion',
  CriticalHit = 'critical_hit',

  // Phase 4: Extended combat events
  CriticalHitResolved = 'critical_hit_resolved',
  PSRTriggered = 'psr_triggered',
  PSRResolved = 'psr_resolved',
  UnitFell = 'unit_fell',
  /**
   * Per `wire-piloting-skill-rolls` task 0.5.2: emitted when a prone
   * unit successfully passes an `AttemptStand` PSR and returns to its
   * upright state. Carries the roll + TN so UI / replay consumers can
   * show the stand-up attempt without re-computing it from the
   * preceding `PSRResolved` event.
   */
  UnitStood = 'unit_stood',
  PhysicalAttackDeclared = 'physical_attack_declared',
  PhysicalAttackResolved = 'physical_attack_resolved',
  ShutdownCheck = 'shutdown_check',
  StartupAttempt = 'startup_attempt',
  AmmoConsumed = 'ammo_consumed',
  /**
   * Per `wire-ammo-consumption`: attack attempt was rejected before any
   * damage, heat, or `AttackResolved` event fired. Reasons grow over
   * time; the union is future-extensible.
   */
  AttackInvalid = 'attack_invalid',
  /**
   * Per `integrate-damage-pipeline`: fired when a location's internal
   * structure reaches zero. Also carries optional `cascadedTo` when the
   * destruction triggers a linked-location destruction (e.g., side-torso
   * → arm cascade).
   */
  LocationDestroyed = 'location_destroyed',
  /**
   * Per `integrate-damage-pipeline`: fired when damage transfers from one
   * destroyed location to its canonical transfer target (arms → side
   * torso; legs → side torso; side torso → center torso).
   */
  TransferDamage = 'transfer_damage',
  /**
   * Per `integrate-damage-pipeline`: fired when a critical-hit roll
   * destroys a specific component (engine, gyro, weapon, heat sink, etc.)
   * in a location. Provides the slot index so UI / replay consumers can
   * highlight the destroyed slot on the record sheet.
   */
  ComponentDestroyed = 'component_destroyed',
  /**
   * Per `wire-bot-ai-helpers-and-capstone`: fired when a bot-controlled
   * unit crosses its retreat threshold (structural integrity or
   * through-armor crit on cockpit/gyro/engine) and commits to disengage
   * toward a chosen edge. Once emitted for a unit, that unit's
   * `isRetreating` flag stays true for the rest of the match (no
   * toggling back to combat). Carries the resolved edge so the move AI
   * can score subsequent moves against it.
   */
  RetreatTriggered = 'retreat_triggered',
  /**
   * Per `add-bot-retreat-behavior` § 7: fired when a retreating bot unit
   * successfully reaches a hex on its locked `retreatTargetEdge`. The unit
   * is considered to have withdrawn from the battlefield — it is marked
   * as no-longer-participating for victory-check purposes but is
   * distinguished from combat destruction (see `IUnitGameState.hasRetreated`).
   * Emitted in the same turn as the `MovementDeclared` event that placed
   * the unit on the edge hex.
   */
  UnitRetreated = 'unit_retreated',
  /**
   * Per `add-vehicle-combat-behavior`: fired when a vehicle takes a
   * structure-exposing hit (or an any-hit for Hover/Naval/Hydrofoil/Submarine/WiGE
   * motion types) triggering a motive-damage roll. Carries the 2d6 dice,
   * severity, and resulting MP penalty so replay / UI can explain the
   * cruise-MP drop.
   */
  MotiveDamaged = 'motive_damaged',
  /**
   * Per `add-vehicle-combat-behavior`: emitted after a motive-damage roll
   * mutates the vehicle's effective MP (cruise/flank). Distinct from
   * `MotiveDamaged` so consumers that only care about MP changes (e.g., AI
   * pathfinder invalidation) don't have to parse the roll payload.
   */
  MotivePenaltyApplied = 'motive_penalty_applied',
  /**
   * Per `add-vehicle-combat-behavior`: fired when a motive roll immobilizes
   * the vehicle (natural 12, wheeled/hover aggravation on "heavy", or a
   * VTOL rotor kill). Immobilized is one-way for the rest of the game.
   */
  VehicleImmobilized = 'vehicle_immobilized',
  /**
   * Per `add-vehicle-combat-behavior`: fired when a vehicle crit or damage
   * roll locks a turret. Locked turrets fire in the chassis Front arc only.
   */
  TurretLocked = 'turret_locked',
  /**
   * Per `add-vehicle-combat-behavior`: fired when a vehicle crew-stunned
   * crit applies — crew skips the next movement + weapon phase.
   */
  VehicleCrewStunned = 'vehicle_crew_stunned',
  /**
   * Per `add-vehicle-combat-behavior` §7: VTOL rotor damage triggers a
   * crash check. Carries the altitude at trigger time and the fall-damage
   * that will apply on a failed check (10 × altitude).
   */
  VTOLCrashCheck = 'vtol_crash_check',

  // Phase 7 Wave 4: Battle Armor combat events
  /**
   * Per `add-battlearmor-combat-behavior`: a single BA trooper was killed by
   * an incoming hit. Carries the trooper index (into the squad's troopers
   * array) and the surviving-trooper count after the casualty.
   */
  TrooperKilled = 'trooper_killed',
  /**
   * Per `add-battlearmor-combat-behavior`: the final trooper in the squad
   * fell; the squad is removed from active play.
   */
  SquadEliminated = 'squad_eliminated',
  /**
   * Per `add-battlearmor-combat-behavior`: a BA squad with Magnetic Clamps
   * successfully attached to a mech via a swarm attack.
   */
  SwarmAttached = 'swarm_attached',
  /**
   * Per `add-battlearmor-combat-behavior`: a swarming BA squad dealt its
   * per-turn attack-tick damage against the host mech.
   */
  SwarmDamage = 'swarm_damage',
  /**
   * Per `add-battlearmor-combat-behavior`: the swarming BA squad detached
   * from its host mech (dismount roll, squad destroyed, or host destroyed).
   */
  SwarmDismounted = 'swarm_dismounted',
  /**
   * Per `add-battlearmor-combat-behavior`: a BA leg-attack was declared and
   * resolved (success or failure). Carries the target leg damage and any
   * BA self-damage on a failed roll.
   */
  LegAttack = 'leg_attack',
  /**
   * Per `add-battlearmor-combat-behavior`: mimetic to-hit bonus applied to
   * an attacker targeting this squad (e.g., +1 when the squad stood still).
   */
  MimeticBonus = 'mimetic_bonus',
  /**
   * Per `add-battlearmor-combat-behavior`: stealth to-hit bonus applied to
   * an attacker targeting this squad (Basic / Improved / Prototype).
   */
  StealthBonus = 'stealth_bonus',
}

/**
 * Side/team in the game.
 */
export enum GameSide {
  Player = 'player',
  Opponent = 'opponent',
}

// =============================================================================
// Networked Game Intents
// =============================================================================

/**
 * Guest-to-host intent types for networked 1v1 game sessions.
 */
export const GAME_INTENT_TYPES = [
  'declareMovement',
  'declareAttack',
  'declarePhysical',
  'confirmHeat',
  'endPhase',
  'concede',
] as const;

export type GameIntentType = (typeof GAME_INTENT_TYPES)[number];

/**
 * Intent envelope used when a peer requests that the host validate and execute
 * an action.
 */
export interface IGameIntent {
  /** Requested action type */
  readonly type: GameIntentType;
  /** Action-specific request payload */
  readonly payload: unknown;
  /** Peer that authored the request */
  readonly authorPeerId: string;
}

// =============================================================================
// Event Interfaces
// =============================================================================

/**
 * Base interface for all game events.
 */
export type GameEventVisibility =
  | 'public'
  | 'actor-only'
  | 'observer-visible'
  | 'target-visible';

export interface IGameEventBase {
  /** Unique event ID */
  readonly id: string;
  /** Game this event belongs to */
  readonly gameId: string;
  /** Sequence number within the game */
  readonly sequence: number;
  /** Event timestamp */
  readonly timestamp: string;
  /** Event type */
  readonly type: GameEventType;
  /** Turn number (1-based) */
  readonly turn: number;
  /** Phase when event occurred */
  readonly phase: GamePhase;
  /** Unit that triggered the event (if applicable) */
  readonly actorId?: string;
  /** Fog-of-war delivery class used by multiplayer event filtering. */
  readonly visibility?: GameEventVisibility;
  /**
   * Side denormalization. Derived from `actorId` at emission time by
   * `createGameEvent` so consumers can filter/display side without joining
   * unitId to IGameUnit.side. Optional for back-compat with NDJSON event
   * streams written before this denormalization landed.
   */
  readonly side?: GameSide;
}

/**
 * Game created event payload.
 */
export interface IGameCreatedPayload {
  /** Game configuration */
  readonly config: IGameConfig;
  /** Participating units */
  readonly units: readonly IGameUnit[];
}

/**
 * Game started event payload.
 */
export interface IGameStartedPayload {
  /** Starting player (who moves first in first turn) */
  readonly firstSide: GameSide;
}

/**
 * Game ended event payload.
 */
export interface IGameEndedPayload {
  /** Winning side */
  readonly winner: GameSide | 'draw';
  /** Reason for game end */
  readonly reason:
    | 'destruction'
    | 'concede'
    | 'turn_limit'
    | 'objective'
    | 'aborted';
  /**
   * Final turn count when the game ended. Optional for back-compat with
   * NDJSON event streams written before this field was populated.
   */
  readonly turns?: number;
}

/**
 * Turn started event payload.
 * Empty object for events that don't carry additional data.
 */
export interface ITurnStartedPayload {
  /** Intentionally empty - turn number is in the event base */
  readonly _type?: 'turn_started';
}

/**
 * Turn ended event payload.
 * Empty object for events that don't carry additional data.
 */
export interface ITurnEndedPayload {
  /** Intentionally empty - turn number is in the event base */
  readonly _type?: 'turn_ended';
}

/**
 * Phase changed event payload.
 */
export interface IPhaseChangedPayload {
  /** Previous phase */
  readonly fromPhase: GamePhase;
  /** New phase */
  readonly toPhase: GamePhase;
}

/**
 * Initiative rolled event payload.
 */
export interface IInitiativeRolledPayload {
  /** Player roll result (2d6) */
  readonly playerRoll: number;
  /** Opponent roll result (2d6) */
  readonly opponentRoll: number;
  /** Winner of initiative */
  readonly winner: GameSide;
  /** Did the winner choose to move first? */
  readonly movesFirst: GameSide;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): every individual
   * d6 the server consumed to produce this event, in consumption order
   * (typically 4: player d6 + d6, opponent d6 + d6). OPTIONAL so legacy
   * single-player / hot-seat resolvers (which don't go through the
   * `RollCapture` wrapper) keep working without filling this in. The
   * multiplayer client renders dice straight from this array.
   */
  readonly rolls?: readonly number[];
}

export type MovementAnimationMode =
  | MovementType.Walk
  | MovementType.Run
  | MovementType.Jump;

export type AttackVisualCategory =
  | 'laser'
  | 'missile'
  | 'ballistic'
  | 'physical'
  | 'energy';

export type HeatVisualThreshold =
  | 'normal'
  | 'warm'
  | 'hot'
  | 'overheat'
  | 'critical';

/**
 * Movement declared event payload.
 */
export interface IMovementDeclaredPayload {
  /** Unit that moved */
  readonly unitId: string;
  /** Starting position */
  readonly from: IHexCoordinate;
  /** Ending position */
  readonly to: IHexCoordinate;
  /** New facing */
  readonly facing: Facing;
  /** Movement type used */
  readonly movementType: MovementType;
  /**
   * Phase 7 animation mode. Optional so legacy event streams that only
   * serialized `movementType` continue to replay.
   */
  readonly mode?: MovementAnimationMode;
  /**
   * Ordered axial coordinates visited by the committed move, including
   * the origin and destination. Optional for legacy replay backfill.
   */
  readonly path?: readonly IHexCoordinate[];
  /** MP spent */
  readonly mpUsed: number;
  /** Heat generated */
  readonly heatGenerated: number;
  /**
   * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
   * delta — Movement Decomposition Fields): total hex transitions in the
   * move (`path.length - 1`). Equals the count of forward + backward +
   * lateral + jump steps that result in a hex-position change. Optional
   * for legacy event-stream compat.
   */
  readonly hexesMoved?: number;
  /**
   * Per the same delta: hexes entered without a facing change in the
   * same step (forward + backward + lateral, excluding turns and
   * stand-up / go-prone steps). Used by the readable-companion formatter
   * to render `mp=N(s<sh>+t<th>)` with the straight-vs-turning split.
   */
  readonly straightHexes?: number;
  /**
   * Per the same delta: MP spent on facing changes only. Equals
   * `mpUsed - straightHexes - sum(jumpMpCost) - sum(specialStepMpCost)`.
   */
  readonly turningMpCost?: number;
  /**
   * Per the same delta: `hexDistance(from, to)` — straight-line distance
   * from start to end regardless of path. Already used for TMM elsewhere;
   * just denormalized onto the event payload.
   */
  readonly netDisplacement?: number;
  /**
   * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
   * delta — Movement Phase Step Chain Emission). The chain of micro-moves
   * the unit executed in commit order. Optional for legacy event-stream
   * compat. Discriminated union keyed on `kind`.
   */
  readonly steps?: readonly IMovementStep[];
}

/**
 * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
 * delta — Movement Phase Step Chain Emission): a single micro-move
 * within a committed move. The `IMovementStep` union covers the
 * BattleMech ground-combat subset of MegaMek's `MoveStepType`
 * (`E:/Projects/megamek/megamek/src/megamek/common/enums/MoveStepType.java`).
 * Aerospace / infantry / battle-armor step types are out-of-scope
 * follow-ons named in `proposal.md`.
 */
export interface IForwardStep {
  readonly kind: 'forward';
  /** 0-based ordinal within the move's `steps` array. */
  readonly index: number;
  /** Direction of travel — FORWARDS or BACKWARDS in MegaMek terms. */
  readonly direction: 'forward' | 'backward';
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  /** Base MP plus terrain modifier (e.g. +1 entering Light Woods). */
  readonly mpCost: number;
  /**
   * `TerrainType`-as-string for forward-compat with new terrain types
   * appearing in source data without breaking serialized event logs.
   */
  readonly terrainEntered: string;
  /** `toElevation - fromElevation` — positive = climbing, negative = falling. */
  readonly elevationDelta: number;
}

export interface ITurnStep {
  readonly kind: 'turn';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly fromFacing: Facing;
  readonly toFacing: Facing;
  /** 1 MP per facing-step (TURN_LEFT / TURN_RIGHT each cost 1 MP). */
  readonly mpCost: number;
}

export interface ILateralStep {
  readonly kind: 'lateral';
  readonly index: number;
  /**
   * Sideslip direction — covers MegaMek's LATERAL_LEFT / LATERAL_RIGHT
   * and their backward variants used during skid resolution.
   */
  readonly direction: 'left' | 'right' | 'left-backwards' | 'right-backwards';
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly mpCost: number;
  readonly terrainEntered: string;
}

export interface IJumpStep {
  readonly kind: 'jump';
  readonly index: number;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  /** Distance jumped (1 MP per hex of jump distance for ground 'Mechs). */
  readonly mpCost: number;
  readonly terrainEntered: string;
}

export interface IStandUpStep {
  readonly kind: 'standUp';
  readonly index: number;
  readonly at: IHexCoordinate;
  /** Typically 2 MP per Total Warfare Errata stand-up cost. */
  readonly mpCost: number;
  /** AttemptStand fires regardless of stand outcome — always `true`. */
  readonly psrTriggered: boolean;
}

export interface IGoProneStep {
  readonly kind: 'goProne';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly mpCost: number;
}

export interface IChargeDeclaredStep {
  readonly kind: 'chargeDeclared';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly targetId: string;
  /** Length of the trailing forward run that qualifies the charge. */
  readonly straightLineHexes: number;
}

export interface IDfaDeclaredStep {
  readonly kind: 'dfaDeclared';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly targetId: string;
  readonly jumpHeight: number;
}

export interface IShakeOffSwarmStep {
  readonly kind: 'shakeOffSwarm';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly psrTriggered: boolean;
}

/**
 * Discriminated union of all movement-step shapes. Consumers narrow on
 * `step.kind` before reading kind-specific fields.
 */
export type IMovementStep =
  | IForwardStep
  | ITurnStep
  | ILateralStep
  | IJumpStep
  | IStandUpStep
  | IGoProneStep
  | IChargeDeclaredStep
  | IDfaDeclaredStep
  | IShakeOffSwarmStep;

/**
 * Movement locked event payload.
 */
export interface IMovementLockedPayload {
  /** Unit whose movement was locked */
  readonly unitId: string;
}

/**
 * Attack locked event payload.
 */
export interface IAttackLockedPayload {
  /** Unit whose attack was locked */
  readonly unitId: string;
}

/**
 * Attack declared event payload.
 */
export interface IAttackDeclaredPayload {
  /** Attacking unit */
  readonly attackerId: string;
  /** Target unit */
  readonly targetId: string;
  /** Weapon ID(s) used (backward-compatible) */
  readonly weapons: readonly string[];
  /** Full weapon attack data (damage, heat, ranges per weapon) */
  readonly weaponAttacks?: readonly IWeaponAttackData[];
  /** Calculated to-hit number */
  readonly toHitNumber: number;
  /** All to-hit modifiers */
  readonly modifiers: readonly IToHitModifier[];
  /**
   * Per `add-combat-fidelity-suite` Phase 2 (`combat-resolution` delta):
   * range bracket the to-hit calculation used. Values match the
   * `RangeBracket` enum string values (`'short' | 'medium' | 'long' |
   * 'extreme'`); `'out_of_range'` is filtered upstream and emits
   * `AttackInvalid` instead. Optional for backward compatibility with
   * pre-P2 callers (legacy InteractiveSession multi-weapon emission
   * path doesn't yet populate it).
   */
  readonly range?: 'short' | 'medium' | 'long' | 'extreme';
  /**
   * Per `add-combat-fidelity-suite` Phase 2: firing arc relative to the
   * target's facing the to-hit calculation used. Symmetric with
   * `IAttackResolvedPayload.attackerArc`. Optional for backward
   * compatibility.
   */
  readonly firingArc?: 'front' | 'left' | 'right' | 'rear';
}

/**
 * Weapon attack data stored in attack events.
 * Carries the real weapon stats so resolveAttack can use actual damage/heat values.
 */
export interface IWeaponAttackData {
  /** Weapon ID */
  readonly weaponId: string;
  /** Weapon name */
  readonly weaponName: string;
  /** Damage per hit */
  readonly damage: number;
  /** Heat generated */
  readonly heat: number;
}

/**
 * Attack resolved event payload.
 */
export interface IAttackResolvedPayload {
  /** Attacking unit */
  readonly attackerId: string;
  /** Target unit */
  readonly targetId: string;
  /** Weapon used */
  readonly weaponId: string;
  /** Dice roll result */
  readonly roll: number;
  /** To-hit number */
  readonly toHitNumber: number;
  /** Hit or miss */
  readonly hit: boolean;
  /** Hit location (if hit) */
  readonly location?: string;
  /** Damage dealt (if hit) */
  readonly damage?: number;
  /**
   * Heat generated by firing this weapon. Set to the weapon's catalog heat
   * value (per `wire-real-weapon-data`). UI consumers and `gameSessionHeat`
   * read this to accumulate firing heat on the attacker during the heat
   * phase instead of approximating `weapons.length * N`.
   */
  readonly heat?: number;
  /**
   * Firing arc used to select the hit-location table (per
   * `wire-firing-arc-resolution`). Exposed on the event so UI + replay
   * consumers can show "AC/20 hit rear CT" rather than assuming Front.
   * Values match the `FiringArc` enum ('front' | 'left' | 'right' |
   * 'rear'). Absent on misses (no arc needed) and on same-hex
   * invalidations.
   */
  readonly attackerArc?: 'front' | 'left' | 'right' | 'rear';
  /**
   * Per `wire-ammo-consumption`: `null` for energy weapons; set to the
   * bin id that was drawn from for ammo-consuming weapons. Enables UI
   * + replay consumers to trace which bin fed each shot.
   */
  readonly ammoBinId?: string | null;
  /**
   * Phase 7 tactical visual hint. Optional so existing event streams and
   * combat resolvers remain replay-compatible; UI layers may derive a
   * category from weapon metadata when this is absent.
   */
  readonly visualCategory?: AttackVisualCategory;
  /**
   * Stable subtype key for visual color/stagger maps, such as
   * `medium-laser`, `lrm-20`, or `kick`. Optional for legacy streams.
   */
  readonly visualSubtype?: string;
  /**
   * Projectile/tracer count for cluster and multi-shot weapons. Optional
   * because non-cluster weapons can render a single primitive by default.
   */
  readonly projectileCount?: number;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): every individual
   * d6 the server consumed for this event, in consumption order
   * (typically the to-hit 2d6 + the location 2d6 on hit). OPTIONAL so
   * single-player / hot-seat resolvers compile without populating it.
   */
  readonly rolls?: readonly number[];
}

/**
 * Fog-of-war redacted attack resolution. Sent to the target owner when the
 * attacker is hidden; weapon and attacker identifiers are intentionally absent.
 */
export interface IRedactedAttackResolvedPayload {
  readonly targetId: string;
  readonly roll: number;
  readonly toHitNumber: number;
  readonly hit: boolean;
  readonly location?: string;
  readonly damage?: number;
  readonly rolls?: readonly number[];
}

/**
 * Attack-invalid event payload — emitted when an attack attempt is
 * rejected BEFORE any damage, heat, or `AttackResolved` event fires.
 * Reasons are future-extensible; initial users are `wire-ammo-consumption`
 * (OutOfAmmo) and `wire-firing-arc-resolution` (SameHex, retrofitted).
 */
export interface IAttackInvalidPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId?: string;
  readonly reason:
    | 'OutOfAmmo'
    | 'SameHex'
    | 'OutOfRange'
    | 'NoLineOfSight'
    | 'InvalidTarget';
  readonly details?: string;
}

/**
 * Damage applied event payload.
 */
export interface IDamageAppliedPayload {
  /** Unit that took damage */
  readonly unitId: string;
  /** Location hit */
  readonly location: string;
  /** Damage amount */
  readonly damage: number;
  /** Armor remaining after damage */
  readonly armorRemaining: number;
  /** Structure remaining after damage */
  readonly structureRemaining: number;
  /** Was location destroyed? */
  readonly locationDestroyed: boolean;
  /** Critical hits triggered */
  readonly criticals?: readonly string[];
  /** Unit that dealt the damage (undefined for self-damage: ammo explosions, falling, heat, etc.) */
  readonly sourceUnitId?: string;
  /** Attack ID that caused this damage (links to AttackResolved event) */
  readonly attackId?: string;
}

/**
 * Heat event payload.
 *
 * Per `wire-heat-generation-and-effects` task 0.5.4: the `source`
 * union breaks heat generation down by cause so UI + AI consumers can
 * distinguish firing heat from engine-hit heat without parsing
 * adjacent events. `'weapons'` is kept as a legacy alias for
 * `'firing'`; `'external'` is kept for fall / crash / jump-jet
 * backfires that pre-date this change.
 */
export interface IHeatPayload {
  /** Unit */
  readonly unitId: string;
  /** Heat amount (positive for generated, negative for dissipated) */
  readonly amount: number;
  /** Heat source */
  readonly source:
    | 'movement'
    | 'firing'
    | 'weapons'
    | 'engine_hit'
    | 'environment'
    | 'dissipation'
    | 'external';
  /** New total heat */
  readonly newTotal: number;
  /**
   * Previous total heat when known. Optional because legacy event creators
   * only carried the post-event total.
   */
  readonly previousTotal?: number;
  /**
   * UI threshold transition metadata for Phase 7 heat indicators. Optional
   * so renderers can derive it from `previousTotal`/`newTotal` or fall back
   * to `newTotal` alone for old replays.
   */
  readonly previousThreshold?: HeatVisualThreshold;
  readonly currentThreshold?: HeatVisualThreshold;
  /** Whether the new heat total is in the ammo-explosion warning band. */
  readonly ammoExplosionRisk?: boolean;
  /**
   * Per `wire-heat-generation-and-effects` task 13.2: optional
   * dissipation breakdown. Populated only on `HeatDissipated` events
   * so UI / replay consumers can show "10 base + 4 water" without
   * re-reading terrain state. `baseDissipation` is the heat-sink
   * contribution (count × rating − destroyed × rating), `waterBonus`
   * is the water-cooling add per `getWaterCoolingBonus(depth)`.
   */
  readonly breakdown?: {
    readonly baseDissipation: number;
    readonly waterBonus: number;
  };
}

/**
 * Pilot hit event payload.
 */
export interface IPilotHitPayload {
  /** Unit */
  readonly unitId: string;
  /** Wounds inflicted */
  readonly wounds: number;
  /** Total wounds */
  readonly totalWounds: number;
  /**
   * Source of the hit.
   *
   * Per `wire-heat-generation-and-effects` task 12.3: `'heat'` is
   * emitted when the heat phase applies pilot damage (heat ≥ 15 with
   * life-support damage); distinct from `'head_hit'` (head-location
   * critical) so UI / replay consumers can show the right cause.
   */
  readonly source: 'head_hit' | 'ammo_explosion' | 'mech_destruction' | 'heat';
  /** Consciousness check required? */
  readonly consciousnessCheckRequired: boolean;
  /** Consciousness check result (if required) */
  readonly consciousnessCheckPassed?: boolean;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): consumed d6s for
   * the consciousness check (when required). OPTIONAL.
   */
  readonly rolls?: readonly number[];
}

/**
 * Ammo explosion event payload.
 *
 * Per `wire-heat-generation-and-effects` task 11.4: emitted when an
 * explosive ammo bin detonates. `source` distinguishes heat-induced
 * explosions (rolled during the heat phase at heat ≥ 19) from
 * crit-induced explosions (explosive component destroyed by through-
 * armor crit or damage-transfer). `damage` is the total point value
 * delivered to the bin's location (`remainingRounds × damagePerRound`
 * for heat, or the crit-caller's damage for `CritInduced`).
 */
export interface IAmmoExplosionPayload {
  /** Unit whose ammo exploded */
  readonly unitId: string;
  /** Location of the bin that exploded */
  readonly location: string;
  /** Bin id that exploded (when known) */
  readonly binId?: string;
  /** Weapon type the bin fed (when known) */
  readonly weaponType?: string;
  /** Rounds destroyed in the blast */
  readonly roundsDestroyed?: number;
  /** Damage delivered to the internal structure */
  readonly damage: number;
  /** Why the bin exploded */
  readonly source: 'HeatInduced' | 'CritInduced';
}

/**
 * Unit destroyed event payload.
 */
export interface IUnitDestroyedPayload {
  /** Unit that was destroyed */
  readonly unitId: string;
  /**
   * Cause of destruction.
   *
   * Closed snake_case enum unified across the three type files
   * (`GameSessionInterfaces.ts`, `CombatInterfaces.ts`, and
   * `utils/gameplay/damage/types.ts`) per the
   * `add-combat-fidelity-suite` Phase 0.5 reconciliation.
   *
   * Mutually exclusive — exactly one value per `UnitDestroyed`
   * event. Priority order when multiple conditions apply in the same
   * turn (per `damage-system` spec):
   *   `pilot_death` > `head_destroyed` > `ct_destroyed` >
   *   `engine_destroyed` > `ammo_explosion` > `shutdown` > `damage`.
   */
  readonly cause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'shutdown'
    | 'ct_destroyed'
    | 'head_destroyed';
  /** Unit that killed this unit (undefined for self-destruction: ammo explosions, pilot death, etc.) */
  readonly killerUnitId?: string;
}

/**
 * Fog-of-war redacted destruction notice. Sent when a hidden enemy is destroyed
 * without leaking cause, damage, crit, pilot, or killer detail.
 */
export interface IRedactedUnitDestroyedPayload {
  readonly unitId: string;
}

/**
 * To-hit modifier for tracking.
 */
export interface IToHitModifier {
  /** Modifier name */
  readonly name: string;
  /** Modifier value */
  readonly value: number;
  /** Modifier source */
  readonly source: string;
}

// =============================================================================
// Phase 4: Extended Combat Event Payloads
// =============================================================================

export interface ICriticalHitResolvedPayload {
  readonly unitId: string;
  readonly location: string;
  readonly slotIndex: number;
  readonly componentType: string;
  readonly componentName: string;
  readonly effect: string;
  readonly destroyed: boolean;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): the server's
   * consumed d6 sequence for this crit (determination roll + slot
   * roll). OPTIONAL — see the field-level docs on
   * `IInitiativeRolledPayload`.
   */
  readonly rolls?: readonly number[];
}

export interface IPSRTriggeredPayload {
  readonly unitId: string;
  readonly reason: string;
  readonly additionalModifier: number;
  readonly triggerSource: string;
  /**
   * The unit's pilot piloting skill BEFORE per-trigger and cumulative
   * modifiers (i.e. the raw value from `IGameUnit.piloting`). Consumers
   * use this to render the full PSR target-number arithmetic
   * (`basePilotingSkill + additionalModifier + cumulative-mods = TN`)
   * without separately joining to the unit record. Optional for
   * back-compat with NDJSON event streams written before this field
   * landed.
   */
  readonly basePilotingSkill?: number;
}

export interface IPSRResolvedPayload {
  readonly unitId: string;
  readonly targetNumber: number;
  readonly roll: number;
  readonly modifiers: number;
  readonly passed: boolean;
  readonly reason: string;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): the two d6 that
   * compose `roll`. OPTIONAL — see `IInitiativeRolledPayload.rolls`.
   */
  readonly rolls?: readonly number[];
}

export interface IUnitFellPayload {
  readonly unitId: string;
  readonly fallDamage: number;
  readonly newFacing: Facing;
  readonly pilotDamage: number;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): consumed d6s for
   * the fall direction + per-cluster hit-location rolls. OPTIONAL.
   */
  readonly rolls?: readonly number[];
  /**
   * Location at which the fall happened (e.g. `'left_leg'`, `'center_torso'`,
   * or a hex-coordinate string when the trigger was terrain). Sourced from
   * the PSR resolution context that caused the fall. Optional for
   * back-compat with NDJSON event streams written before this field
   * landed.
   */
  readonly location?: string;
  /**
   * Free-string reason describing the fall cause (e.g. `'gyro-hit'`,
   * `'took-20-damage'`). PR E (`structure-psr-reason-as-discriminated-code`)
   * tightens this to a `PSRReasonCode` discriminated union; for now it is
   * deliberately string-typed to remain compatible with the existing
   * free-form PSR reason strings emitted by the runner. Optional for
   * back-compat.
   */
  readonly reason?: string;
}

/**
 * Per `wire-piloting-skill-rolls` task 0.5.4: emitted when a prone
 * unit passes an `AttemptStand` PSR and returns to upright state.
 */
export interface IUnitStoodPayload {
  readonly unitId: string;
  readonly turn: number;
  readonly roll: number;
  readonly targetNumber: number;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): the two d6 that
   * compose `roll`. OPTIONAL.
   */
  readonly rolls?: readonly number[];
}

/**
 * Per `implement-physical-attack-phase` task 2.2: physical attack event
 * types include core physical attacks plus the four melee-weapon variants
 * (hatchet, sword, mace, lance). The resolved payload uses the same
 * union so club swings and charges emit the same event shape.
 */
export type PhysicalAttackEventType =
  | 'punch'
  | 'kick'
  | 'charge'
  | 'dfa'
  | 'push'
  | 'hatchet'
  | 'sword'
  | 'mace'
  | 'lance';

export interface IPhysicalAttackDeclaredPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackEventType;
  readonly toHitNumber: number;
  /**
   * Per `implement-physical-attack-phase` task 2.3: limb targeted by the
   * declaration. Required for `punch` and `kick`; may be supplied for
   * club attacks. OPTIONAL.
   */
  readonly limb?: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
}

export interface IPhysicalAttackResolvedPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackEventType;
  readonly roll: number;
  readonly toHitNumber: number;
  readonly hit: boolean;
  readonly damage?: number;
  readonly location?: string;
  /**
   * Per `implement-physical-attack-phase` tasks 6.4 / 7.4: per-cluster
   * (damage, location) pairs for charge and DFA, where the total damage
   * is split into 5-point clusters and each cluster rolls a fresh
   * hit-location. OPTIONAL — omitted for single-cluster attacks.
   */
  readonly clusters?: readonly {
    readonly damage: number;
    readonly location: string;
  }[];
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): consumed d6s for
   * the to-hit + hit-location rolls (location omitted on miss). OPTIONAL.
   */
  readonly rolls?: readonly number[];
}

export interface IShutdownCheckPayload {
  readonly unitId: string;
  readonly heatLevel: number;
  readonly targetNumber: number;
  readonly roll: number;
  readonly shutdownOccurred: boolean;
  /**
   * Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution` delta —
   * Heat Lifecycle Events): `true` when `heatLevel >= 30` so consumers
   * can distinguish auto-shutdown (no roll possible) from a 14-29 heat
   * shutdown check that the pilot was given a chance to avoid. Optional
   * for backward compat with pre-P4 emitters.
   */
  readonly automatic?: boolean;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): the two d6 that
   * compose `roll`. OPTIONAL.
   */
  readonly rolls?: readonly number[];
}

/**
 * Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution` delta —
 * Heat Lifecycle Events): emitted when a unit's heat crosses one of
 * the canonical Total Warfare thresholds (5 / 8 / 13 / 14 / 15 / 17 /
 * 19 / 23 / 24 / 25 / 28 / 30). The runner emits one event per
 * threshold the unit's NEW heat meets, in ascending threshold order,
 * so consumers can render every effect that just became active.
 *
 * `effect` is a coarse classification (movement penalty, attack
 * penalty, shutdown gates, pilot heat damage, ammo-explosion warning)
 * that maps to several thresholds — UI / replay layers can show the
 * exact threshold via the `threshold` field.
 *
 * Heat 0 emits NOTHING — the runner skips this event when no
 * threshold was met. `HeatGenerated` and `HeatDissipated` still fire
 * unconditionally (per spec scenario "Heat phase events fire even
 * when heat is zero").
 *
 * Spec contract:
 *   `combat-resolution/spec.md` — Heat Lifecycle Events
 *     "`HeatEffectApplied { unitId, threshold, effect }` MUST fire
 *      when crossing thresholds at 5 / 10 / 15 / 20 / 25 / 30".
 */
export interface IHeatEffectAppliedPayload {
  readonly unitId: string;
  /** Heat threshold met by the unit's new total. */
  readonly threshold: number;
  /**
   * Coarse effect classification.
   *
   *   - `'movement_penalty'` — heat ≥ 5 (MP reduction starts).
   *   - `'attack_penalty'` — heat ≥ 8 / 13 / 17 / 24 (to-hit modifier).
   *   - `'shutdown_check'` — heat ≥ 14 (avoidable shutdown).
   *   - `'shutdown'` — heat ≥ 30 (auto-shutdown).
   *   - `'pilot_damage'` — heat ≥ 15 (pilot heat damage with life
   *     support hit).
   *   - `'ammo_explosion_risk'` — heat ≥ 19 / 23 / 28 (ammo cookoff
   *     check).
   */
  readonly effect:
    | 'movement_penalty'
    | 'attack_penalty'
    | 'shutdown_check'
    | 'shutdown'
    | 'pilot_damage'
    | 'ammo_explosion_risk';
  /** Unit's current heat level when the effect applied. */
  readonly heatLevel: number;
}

export interface IStartupAttemptPayload {
  readonly unitId: string;
  readonly targetNumber: number;
  readonly roll: number;
  readonly success: boolean;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): the two d6 that
   * compose `roll`. OPTIONAL.
   */
  readonly rolls?: readonly number[];
}

export interface IAmmoConsumedPayload {
  readonly unitId: string;
  readonly binId: string;
  readonly weaponType: string;
  readonly roundsConsumed: number;
  readonly roundsRemaining: number;
}

/**
 * Per `integrate-damage-pipeline`: a location's internal structure has
 * reached zero. `cascadedTo` is set when the destruction triggered a
 * linked-location destruction (e.g., LT destroyed → LA also destroyed).
 *
 * Per `add-combat-fidelity-suite` Phase 2 (`combat-resolution` /
 * `damage-system` deltas): `viaTransfer` distinguishes direct
 * destruction (`false` — the shot landed on this location and zeroed
 * armor + structure) from cascade destruction (`true` — residual damage
 * flowed in from a previous destroyed location in the transfer chain).
 * Optional for backward compatibility with pre-P2 emitters; new
 * `weaponAttack.ts` emissions always populate it.
 */
export interface ILocationDestroyedPayload {
  readonly unitId: string;
  readonly location: string;
  readonly cascadedTo?: string;
  readonly viaTransfer?: boolean;
}

/**
 * Per `integrate-damage-pipeline`: damage has transferred from a
 * destroyed `fromLocation` to its canonical `toLocation`. Multiple
 * events may fire in sequence for a single shot (arm → side torso →
 * center torso, etc.).
 */
export interface ITransferDamagePayload {
  readonly unitId: string;
  readonly fromLocation: string;
  readonly toLocation: string;
  readonly damage: number;
}

/**
 * Per `integrate-damage-pipeline`: a critical-hit roll destroyed a
 * specific component at `slotIndex` in `location`. `componentType`
 * names the broad class (engine / gyro / weapon / heat sink / etc.)
 * so UI consumers can pick the right icon without parsing
 * `componentName`.
 */
export interface IComponentDestroyedPayload {
  readonly unitId: string;
  readonly location: string;
  readonly componentType: string;
  readonly slotIndex: number;
  readonly componentName?: string;
}

/**
 * `CriticalHit` event payload.
 *
 * Per `add-combat-fidelity-suite` Phase 3 (`combat-resolution` delta):
 * the runner emits one `CriticalHit` per resolved critical-hit slot
 * (carrying `component`, `count: 1`, `location`, plus the attacker
 * id as `sourceUnitId`). Legacy session-side emitters that surface
 * crits per component may continue to emit the same shape — the
 * payload's `component` and `count` fields are both optional so
 * either producer's omission stays compatible.
 *
 * Discriminated-union members tolerate either field combination per
 * P2's additive pattern; tests assert on the field they care about.
 *
 * Spec contract:
 *   `combat-resolution/spec.md` — Critical Hit Events Emitted by Runner
 *     "the event log MUST contain `CriticalHit { unitId, location: 'CT',
 *     count: 1 }`"
 */
export interface ICriticalHitPayload {
  readonly unitId: string;
  readonly location: string;
  /** Attacker unit id. Optional for synthesized / replay-only events. */
  readonly sourceUnitId?: string;
  /**
   * Component class destroyed by the crit (`engine` / `gyro` / `weapon`
   * / `actuator` / `heat_sink` / `ammo` / `cockpit` / `sensor` /
   * `life_support` / `jump_jet`). Required for legacy
   * `KeyMomentDetector.processCriticalHit` consumers; the runner P3
   * emitter populates it as well so the detector keeps working without
   * a switch to `CriticalHitResolved`.
   */
  readonly component?: string;
  /**
   * Number of crit-roll outcomes assigned to this location. The runner
   * emits one event per resolved slot with `count: 1` per spec
   * scenario "Gyro destruction event chain"; multi-slot crits (rolls
   * 10+) produce multiple events with the same `count: 1` rather than
   * a single `count: N` event so the per-slot causal chain stays
   * one-event-per-component.
   */
  readonly count?: number;
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: bot-controlled unit has crossed
 * its retreat threshold and committed to disengage. Carries the resolved
 * concrete edge so subsequent move scoring (via `scoreRetreatMove`) can
 * compute progress toward it. `reason` distinguishes structural-loss
 * triggers from through-armor-crit triggers for replay / UI consumers.
 */
export interface IRetreatTriggeredPayload {
  readonly unitId: string;
  readonly edge: 'north' | 'south' | 'east' | 'west';
  readonly reason: 'structural_threshold' | 'vital_crit';
}

/**
 * Per `add-bot-retreat-behavior` § 7: a retreating bot unit has reached a
 * hex on its locked `retreatTargetEdge`. The unit withdraws from the
 * battlefield — victory-check treats it as no-longer-participating but
 * post-battle summaries can distinguish withdrawal from combat destruction
 * via the `hasRetreated` flag on `IUnitGameState`. `turn` is the game
 * turn on which the retreat completed, for replay consumers.
 */
export interface IUnitRetreatedPayload {
  readonly unitId: string;
  readonly retreatEdge: 'north' | 'south' | 'east' | 'west';
  readonly turn: number;
}

/**
 * Per `add-vehicle-combat-behavior` §4: emitted when a vehicle hit
 * triggers a motive-damage roll. Carries the consumed 2d6, the severity
 * outcome, and the resulting MP penalty.
 */
export interface IMotiveDamagedPayload {
  readonly unitId: string;
  readonly severity: 'none' | 'minor' | 'moderate' | 'heavy' | 'immobilized';
  readonly mpPenalty: number;
  /**
   * The two d6 that compose the motive roll (same convention as the
   * existing PSR / crit events).
   */
  readonly rolls?: readonly number[];
}

/**
 * Per `add-vehicle-combat-behavior` §4: emitted after motive damage has
 * been applied to the running combat state. Consumers such as the move
 * pathfinder use this to invalidate cached reachability.
 */
export interface IMotivePenaltyAppliedPayload {
  readonly unitId: string;
  readonly previousCruiseMP: number;
  readonly newCruiseMP: number;
  readonly newFlankMP: number;
}

/**
 * Per `add-vehicle-combat-behavior` §4/§5: vehicle has become immobilized
 * (natural 12, Wheeled/Hover "heavy" aggravation, rotor kill, or two
 * engine hits).
 */
export interface IVehicleImmobilizedPayload {
  readonly unitId: string;
  readonly cause:
    | 'motive_roll'
    | 'aggravation'
    | 'rotor_destroyed'
    | 'engine_destroyed'
    | 'crew_killed';
}

/**
 * Per `add-vehicle-combat-behavior` §6: a vehicle turret has been locked
 * (either primary or secondary). A locked turret fires in the chassis
 * Front arc only.
 */
export interface ITurretLockedPayload {
  readonly unitId: string;
  readonly secondary: boolean;
}

/**
 * Per `add-vehicle-combat-behavior` §6: Crew Stunned crit effect. The
 * vehicle skips `phasesStunned` upcoming phases (movement + weapon).
 */
export interface IVehicleCrewStunnedPayload {
  readonly unitId: string;
  readonly phasesStunned: number;
}

/**
 * Per `add-vehicle-combat-behavior` §7: VTOL rotor damage triggered a
 * crash check. Carries the altitude at the trigger time and the
 * resulting fall damage (10 × altitude).
 */
export interface IVTOLCrashCheckPayload {
  readonly unitId: string;
  readonly altitude: number;
  readonly fallDamage: number;
}

/**
 * Union type for all event payloads.
 */
export type GameEventPayload =
  | IGameCreatedPayload
  | IGameStartedPayload
  | IGameEndedPayload
  | ITurnStartedPayload
  | ITurnEndedPayload
  | IPhaseChangedPayload
  | IInitiativeRolledPayload
  | IMovementDeclaredPayload
  | IMovementLockedPayload
  | IAttackDeclaredPayload
  | IAttackLockedPayload
  | IAttackResolvedPayload
  | IRedactedAttackResolvedPayload
  | IDamageAppliedPayload
  | IHeatPayload
  | IPilotHitPayload
  | IAmmoExplosionPayload
  | IUnitDestroyedPayload
  | IRedactedUnitDestroyedPayload
  | ICriticalHitResolvedPayload
  | IPSRTriggeredPayload
  | IPSRResolvedPayload
  | IUnitFellPayload
  | IUnitStoodPayload
  | IPhysicalAttackDeclaredPayload
  | IPhysicalAttackResolvedPayload
  | IShutdownCheckPayload
  | IHeatEffectAppliedPayload
  | IStartupAttemptPayload
  | IAmmoConsumedPayload
  | IAttackInvalidPayload
  | ILocationDestroyedPayload
  | ITransferDamagePayload
  | IComponentDestroyedPayload
  | ICriticalHitPayload
  | IRetreatTriggeredPayload
  | IUnitRetreatedPayload
  | IMotiveDamagedPayload
  | IMotivePenaltyAppliedPayload
  | IVehicleImmobilizedPayload
  | ITurretLockedPayload
  | IVehicleCrewStunnedPayload
  | IVTOLCrashCheckPayload
  | ITrooperKilledPayload
  | ISquadEliminatedPayload
  | ISwarmAttachedPayload
  | ISwarmDamagePayload
  | ISwarmDismountedPayload
  | ILegAttackPayload
  | IMimeticBonusPayload
  | IStealthBonusPayload;

/**
 * Complete game event with payload.
 */
export interface IGameEvent extends IGameEventBase {
  /** Event-specific payload */
  readonly payload: GameEventPayload;
}

// =============================================================================
// Game Configuration
// =============================================================================

/**
 * Game configuration.
 */
export interface IGameConfig {
  /** Map size (radius) */
  readonly mapRadius: number;
  /** Turn limit (0 = no limit) */
  readonly turnLimit: number;
  /** Victory conditions */
  readonly victoryConditions: readonly string[];
  /** Optional rules enabled */
  readonly optionalRules: readonly string[];
  /** Double-blind tactical visibility mode for multiplayer/fog-aware UIs. */
  readonly fogOfWar?: boolean;
  /** Environmental conditions (default: standard daylight, 1.0g, etc.) */
  readonly environmentalConditions?: IEnvironmentalConditions;
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5: encounter that
   * launched this session. Always populated when the session originated
   * from `EncounterService.launchEncounter`. Null/undefined for the
   * legacy quick-play / SimulationRunner flows that bypass that path.
   */
  readonly encounterId?: string | null;
  /**
   * Campaign this session belongs to. Populated for campaign-launched
   * encounters; null for standalone quick-play / handcrafted encounters.
   */
  readonly campaignId?: string | null;
  /**
   * Campaign contract this session resolves. Populated when the encounter
   * was generated from a contract. Null for standalone encounters.
   */
  readonly contractId?: string | null;
  /**
   * Scenario instance this session represents. Populated when scenario
   * generation produced the encounter. Null for handcrafted encounters.
   */
  readonly scenarioId?: string | null;
}

/**
 * Unit participating in a game.
 */
export interface IGameUnit {
  /** Unit ID */
  readonly id: string;
  /** Unit name */
  readonly name: string;
  /** Which side this unit belongs to */
  readonly side: GameSide;
  /** Unit reference (ID from unit database) */
  readonly unitRef: string;
  /** Pilot reference (ID from pilot database, or inline statblock) */
  readonly pilotRef: string;
  /** Pilot skills */
  readonly gunnery: number;
  readonly piloting: number;
  /** Total heat sinks on unit (default: 10 if not provided) */
  readonly heatSinks?: number;
  /**
   * Per `wire-heat-generation-and-effects` task 4.2: heat-sink rating.
   * - `'single'` → 1 dissipation per sink (default when omitted)
   * - `'double'` → 2 dissipation per sink (IS or Clan DHS)
   *
   * Destroyed sinks in `IComponentDamageState.heatSinksDestroyed` are
   * also debited at this rating (a destroyed DHS loses 2 dissipation).
   */
  readonly heatSinkType?: 'single' | 'double';
  /**
   * Ammo bin construction data (one entry per ton of ammo carried).
   * When present, `createGameSession` seeds this unit's `ammoState` so
   * the attack resolver can consume bins per fire. When absent, the
   * unit has zero ammo bins; any ammo-consuming weapon fire will emit
   * `AttackInvalid { reason: 'OutOfAmmo' }`. Producers (e.g.,
   * `InteractiveSession`) populate this from catalog / construction
   * data per `wire-ammo-consumption`.
   */
  readonly ammoConstruction?: readonly IAmmoConstructionInit[];
  /**
   * Construction-side `UnitType` (BattleMech / Aerospace / Infantry / Battle
   * Armor / ProtoMech / Vehicle / etc.). Per `wire-combat-behavior-dispatch`
   * (Council #1 PR7), `createInitialUnitState` branches on this value to
   * seed `IUnitGameState.combatState` via the matching per-type factory.
   *
   * Optional for backward compatibility: legacy callers (existing fixtures,
   * tests, lobby builders that haven't been updated) leave it `undefined`,
   * which behaves exactly like the prior mech-only path (no `combatState`
   * envelope, mech tokens render). New callers wiring aerospace / proto /
   * infantry / BA units MUST set both `unitType` AND the matching per-type
   * construction inputs below — the init-time assertion will throw otherwise.
   */
  readonly unitType?: import('@/types/unit/BattleMechInterfaces').UnitType;
  /**
   * Per-type construction inputs consumed by `createInitialUnitState` to
   * build `combatState` via `create{Type}CombatState` factories. Each block
   * is OPTIONAL at the type level so the legacy mech-only call path stays
   * compile-clean; the init-time assertion enforces presence at runtime
   * when `unitType` is one of the four supported per-type discriminants.
   */
  readonly aerospaceInit?: {
    readonly maxSI: number;
    readonly armorByArc: import('@/utils/gameplay/aerospace/state').IAerospaceArcArmor;
    readonly heatSinks: number;
    readonly fuelPoints: number;
    readonly safeThrust: number;
    readonly maxThrust: number;
    /** Initial altitude band; defaults to `1` (airborne) when omitted. */
    readonly altitude?: number;
  };
  readonly infantryInit?: import('@/types/unit/PersonnelInterfaces').IInfantry;
  readonly protoMechInit?: {
    readonly chassisType: import('@/types/unit/ProtoMechInterfaces').ProtoChassis;
    readonly hasMainGun: boolean;
    readonly armorByLocation: import('@/utils/gameplay/protomech/state').ProtoLocationSlotMap;
    readonly structureByLocation: import('@/utils/gameplay/protomech/state').ProtoLocationSlotMap;
    readonly altitude?: number;
  };
  readonly battleArmorInit?: {
    readonly squadSize: number;
    readonly armorPointsPerTrooper: number;
    readonly stealthKind?: import('./BattleArmorCombatInterfaces').BattleArmorStealthKind;
    readonly hasMagneticClamp?: boolean;
    readonly hasVibroClaws?: boolean;
    readonly vibroClawCount?: number;
  };
}

// `IAmmoConstructionInit` is imported at the top of this module (so
// `IGameUnit.ammoConstruction` can reference it) AND re-exported here so
// existing `import { IAmmoConstructionInit } from '@/types/gameplay/...'`
// call-sites keep working after the PR6 collapse. Source-of-truth lives in
// `./AmmoTypes` (also exposed via `@/types/gameplay/AmmoTypes`).
export type { IAmmoConstructionInit };

// =============================================================================
// Component Damage & Combat State Types
// =============================================================================

/**
 * Tracks component damage for a unit.
 * Each field directly maps to combat mechanics (to-hit modifiers, PSR triggers, heat effects).
 *
 * @see design.md D4: Component Damage as Typed State, Not Strings
 */
export interface IComponentDamageState {
  /** Engine critical hits: 0-3 (3 = destroyed). Each hit adds +5 heat/turn. */
  readonly engineHits: number;
  /** Gyro critical hits: 0-2 (2 = destroyed for standard gyro). Each hit adds +3 PSR modifier. */
  readonly gyroHits: number;
  /** Sensor critical hits: 0-2. Each hit adds +1/+2 to-hit penalty. */
  readonly sensorHits: number;
  /** Life support hits: 0-2. Enables pilot heat damage when damaged. */
  readonly lifeSupport: number;
  /** Cockpit destroyed = pilot killed. */
  readonly cockpitHit: boolean;
  /** Actuator destruction state per actuator type. */
  readonly actuators: Partial<Record<ActuatorType, boolean>>;
  /** IDs of destroyed weapons. */
  readonly weaponsDestroyed: readonly string[];
  /** Number of heat sinks destroyed (reduces dissipation by 1 single / 2 double each). */
  readonly heatSinksDestroyed: number;
  /** Number of jump jets destroyed (reduces max jump MP by 1 each). */
  readonly jumpJetsDestroyed: number;
}

/**
 * State of a single ammo bin during gameplay.
 */
export interface IAmmoSlotState {
  /** Unique bin identifier */
  readonly binId: string;
  /** Weapon type this ammo feeds */
  readonly weaponType: string;
  /** Location of the ammo bin */
  readonly location: string;
  /** Rounds remaining */
  readonly remainingRounds: number;
  /** Maximum rounds capacity */
  readonly maxRounds: number;
  /** Whether this ammo is explosive (for CASE interactions) */
  readonly isExplosive: boolean;
}

/**
 * A pending Piloting Skill Roll that must be resolved.
 */
export interface IPendingPSR {
  /** Entity/unit that must make the roll */
  readonly entityId: string;
  /** Human-readable reason for the PSR */
  readonly reason: string;
  /** Additional modifier to the piloting skill roll */
  readonly additionalModifier: number;
  /** What triggered this PSR */
  readonly triggerSource: string;
}

// =============================================================================
// Game State
// =============================================================================

/**
 * Current state of a unit in the game.
 */
export interface IUnitGameState {
  /** Unit ID */
  readonly id: string;
  /** Which side this unit belongs to */
  readonly side: GameSide;
  /** Current position */
  readonly position: IHexCoordinate;
  /** Current facing */
  readonly facing: Facing;
  /** Current heat */
  readonly heat: number;
  /** Movement this turn */
  readonly movementThisTurn: MovementType;
  /** Hexes moved this turn */
  readonly hexesMovedThisTurn: number;
  /**
   * Per `add-encounter-swarm-harness` Phase 1: pilot gunnery skill copied
   * from the binding `IGameUnit` at session-creation time. Optional for
   * backward compat with synthetic unit fixtures (`createMinimalUnitState`)
   * that do not seed pilot data — `toAIUnitState` falls back to
   * `DEFAULT_GUNNERY` when absent. Pilot skills do not change mid-match,
   * so this lives on the immutable per-unit state rather than being
   * looked up against the pilot vault every AI tick.
   */
  readonly gunnery?: number;
  /**
   * Per `add-encounter-swarm-harness` Phase 1: pilot piloting skill copied
   * from the binding `IGameUnit` at session-creation time. Same fallback
   * semantics as `gunnery` — `DEFAULT_PILOTING` applies when absent.
   */
  readonly piloting?: number;
  /** Armor remaining per location */
  readonly armor: Record<string, number>;
  /** Structure remaining per location */
  readonly structure: Record<string, number>;
  /**
   * Per `add-bot-retreat-behavior` § 2 (Trigger A): starting internal-structure
   * points per location, captured at session creation. Used by the retreat
   * trigger to compute `sum(starting - current) / sum(starting)` — the
   * spec-mandated points-of-internal-structure ratio (NOT the legacy
   * count-of-destroyed-locations ratio).
   *
   * Optional for backward compat: when missing or empty, callers fall back
   * to the legacy ratio. Producers (CompendiumAdapter, session builders)
   * SHALL seed this with the unit's full starting internal structure so
   * the trigger fires at the correct damage threshold.
   */
  readonly startingInternalStructure?: Record<string, number>;
  /** Destroyed locations */
  readonly destroyedLocations: readonly string[];
  /** Destroyed equipment */
  readonly destroyedEquipment: readonly string[];
  /** Ammo remaining per weapon */
  readonly ammo: Record<string, number>;
  /** Pilot wounds */
  readonly pilotWounds: number;
  /** Is pilot conscious? */
  readonly pilotConscious: boolean;
  /** Is unit destroyed? */
  readonly destroyed: boolean;
  /** Lock state for current phase */
  readonly lockState: LockState;
  /** Pending action (if planning) */
  readonly pendingAction?: unknown;
  /** Cumulative damage taken this phase (for 20+ damage PSR trigger) */
  readonly damageThisPhase?: number;
  /** Component damage tracking (engine, gyro, sensors, actuators, etc.) */
  readonly componentDamage?: IComponentDamageState;
  /** Unit is prone (fallen) */
  readonly prone?: boolean;
  /** Unit is shut down (reactor offline) */
  readonly shutdown?: boolean;
  /** Ammo bin state tracking */
  readonly ammoState?: Record<string, IAmmoSlotState>;
  /** Pending piloting skill rolls to resolve */
  readonly pendingPSRs?: readonly IPendingPSR[];
  readonly weaponsFiredThisTurn?: readonly string[];
  readonly edgePointsRemaining?: number;
  readonly isDodging?: boolean;
  /** Weapons that are jammed (UAC/RAC jam mechanic) */
  readonly jammedWeapons?: readonly string[];
  /** Target has Narc beacon attached */
  readonly narcedBy?: readonly string[];
  /** Target is TAG-designated this turn */
  readonly tagDesignated?: boolean;
  /**
   * Per `wire-bot-ai-helpers-and-capstone`: bot-controlled unit has
   * committed to retreat. Set true by `RetreatTriggered` reducer; never
   * cleared back to false in the same match (one-way latch).
   */
  readonly isRetreating?: boolean;
  /**
   * Per `wire-bot-ai-helpers-and-capstone`: the concrete edge the unit
   * is heading toward once retreating. Set once on `RetreatTriggered`
   * and locked. `undefined` until retreat begins.
   */
  readonly retreatTargetEdge?: 'north' | 'south' | 'east' | 'west';
  /**
   * Per `add-bot-retreat-behavior` § 7.4: set `true` by the
   * `UnitRetreated` reducer once a retreating unit reaches its target
   * map edge. Victory-check treats `hasRetreated` as "no longer
   * participating" (equivalent to destroyed for side-elimination
   * purposes) but keeps it distinct from `destroyed` so post-battle
   * summaries can list withdrawn units separately from combat losses.
   */
  readonly hasRetreated?: boolean;
  /**
   * Per-type combat-behavior envelope.
   *
   * Per Council #1 (`openspec/council-decisions/2026-05-02-cluster-F-combat-
   * behavior-wiring.md`) and openspec change `wire-combat-behavior-dispatch`,
   * aerospace / protomech / infantry / BA units carry their per-type combat
   * struct here so renderers and fog redaction read a single channel. Mech
   * and vehicle units leave this `undefined` until the `kind: 'vehicle'`
   * variant lands in PR9+.
   *
   * Producers: `createInitialUnitState` (initial seed); per-type reducers
   * (combat events update the inner `state` and replace the envelope).
   *
   * Consumers: `unitStateToToken` (projection); fog-of-war redaction.
   */
  readonly combatState?:
    | { readonly kind: 'aero'; readonly state: IAerospaceCombatState }
    | { readonly kind: 'proto'; readonly state: IProtoMechCombatState }
    | { readonly kind: 'platoon'; readonly state: IInfantryCombatState }
    | { readonly kind: 'squad'; readonly state: IBattleArmorCombatState };
}

/**
 * Overall game state derived from events.
 */
export interface IGameState {
  /** Game ID */
  readonly gameId: string;
  /** Current status */
  readonly status: GameStatus;
  /** Current turn number */
  readonly turn: number;
  /** Current phase */
  readonly phase: GamePhase;
  /** Initiative winner this turn */
  readonly initiativeWinner?: GameSide;
  /** Side that moves first this turn */
  readonly firstMover?: GameSide;
  /** Index of next unit to act (for alternating phases) */
  readonly activationIndex: number;
  /** Per-unit states */
  readonly units: Record<string, IUnitGameState>;
  /** Events this turn for display */
  readonly turnEvents: readonly IGameEvent[];
  /** Game result (if completed) */
  readonly result?: {
    readonly winner: GameSide | 'draw';
    readonly reason: string;
  };
}

// =============================================================================
// Game Session
// =============================================================================

/**
 * Game session with events and derived state.
 */
export interface IGameSession {
  /** Session ID */
  readonly id: string;
  /** Stable match ID used by multiplayer persistence/reconnect. */
  readonly matchId?: string;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last update timestamp */
  readonly updatedAt: string;
  /** Game configuration */
  readonly config: IGameConfig;
  /** Participating units */
  readonly units: readonly IGameUnit[];
  /** All events in sequence order */
  readonly events: readonly IGameEvent[];
  /** Current derived state */
  readonly currentState: IGameState;
  /** Network host peer id for P2P sessions; absent/null for local sessions */
  readonly hostPeerId?: string | null;
  /** Network guest peer id for P2P sessions; absent/null until joined */
  readonly guestPeerId?: string | null;
  /** Peer id that controls each side in networked sessions */
  readonly sideOwners?: Readonly<Record<GameSide, string>> | null;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for IGameEvent.
 */
export function isGameEvent(obj: unknown): obj is IGameEvent {
  if (typeof obj !== 'object' || obj === null) return false;
  const event = obj as IGameEvent;
  return (
    typeof event.id === 'string' &&
    typeof event.gameId === 'string' &&
    typeof event.sequence === 'number' &&
    typeof event.timestamp === 'string' &&
    typeof event.type === 'string' &&
    typeof event.turn === 'number' &&
    typeof event.phase === 'string' &&
    typeof event.payload === 'object'
  );
}

/**
 * Type guard for IGameSession.
 */
export function isGameSession(obj: unknown): obj is IGameSession {
  if (typeof obj !== 'object' || obj === null) return false;
  const session = obj as IGameSession;
  return (
    typeof session.id === 'string' &&
    typeof session.createdAt === 'string' &&
    typeof session.config === 'object' &&
    Array.isArray(session.units) &&
    Array.isArray(session.events) &&
    typeof session.currentState === 'object'
  );
}

// =============================================================================
// Side Ownership (Networked 1v1)
// =============================================================================

/**
 * Per `add-p2p-game-session-sync` § 6.3: returns true when the local
 * peer is allowed to issue commands (move, fire, lock) for the given
 * game side. Used by the combat UI to gate control affordances:
 * disable any control that would modify a unit whose side is owned by
 * the remote peer.
 *
 * Behaviour:
 *   - Local single-player / hot-seat session (`sideOwners` absent):
 *     local peer controls every side — return `true`.
 *   - Networked session: side is owned by `localPeerId` iff
 *     `sideOwners[side] === localPeerId`. Unknown peer returns `false`
 *     (e.g. spectator or stale awareness state).
 */
export function canLocalPeerControlSide(
  session: Pick<IGameSession, 'sideOwners'>,
  localPeerId: string | null | undefined,
  side: GameSide,
): boolean {
  if (!session.sideOwners) return true;
  if (!localPeerId) return false;
  return session.sideOwners[side] === localPeerId;
}

/**
 * Convenience wrapper for unit-level UI gating: looks up the unit's
 * side and forwards to `canLocalPeerControlSide`. Returns `false` when
 * the unit is unknown — fail-closed so the UI never lets a stale
 * reference modify someone else's mech.
 */
export function canLocalPeerControlUnit(
  session: Pick<IGameSession, 'units' | 'sideOwners'>,
  localPeerId: string | null | undefined,
  unitId: string,
): boolean {
  const unit = session.units.find((entry) => entry.id === unitId);
  if (!unit) return false;
  return canLocalPeerControlSide(session, localPeerId, unit.side);
}
