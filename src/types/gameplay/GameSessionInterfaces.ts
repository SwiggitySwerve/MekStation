/**
 * Game Session Interfaces
 * Core type definitions for the game session system.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

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
}

/**
 * Side/team in the game.
 */
export enum GameSide {
  Player = 'player',
  Opponent = 'opponent',
}

// =============================================================================
// Event Interfaces
// =============================================================================

/**
 * Base interface for all game events.
 */
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
  readonly reason: 'destruction' | 'concede' | 'turn_limit' | 'objective';
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
  /** MP spent */
  readonly mpUsed: number;
  /** Heat generated */
  readonly heatGenerated: number;
}

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
   * Per `add-authoritative-roll-arbitration` (Wave 3a): every individual
   * d6 the server consumed for this event, in consumption order
   * (typically the to-hit 2d6 + the location 2d6 on hit). OPTIONAL so
   * single-player / hot-seat resolvers compile without populating it.
   */
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
  /** Source of the hit */
  readonly source: 'head_hit' | 'ammo_explosion' | 'mech_destruction';
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
 * Unit destroyed event payload.
 */
export interface IUnitDestroyedPayload {
  /** Unit that was destroyed */
  readonly unitId: string;
  /** Cause of destruction */
  readonly cause: 'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown';
  /** Unit that killed this unit (undefined for self-destruction: ammo explosions, pilot death, etc.) */
  readonly killerUnitId?: string;
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

export interface IPhysicalAttackDeclaredPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: 'punch' | 'kick' | 'charge' | 'dfa' | 'push';
  readonly toHitNumber: number;
}

export interface IPhysicalAttackResolvedPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: 'punch' | 'kick' | 'charge' | 'dfa' | 'push';
  readonly roll: number;
  readonly toHitNumber: number;
  readonly hit: boolean;
  readonly damage?: number;
  readonly location?: string;
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
   * Per `add-authoritative-roll-arbitration` (Wave 3a): the two d6 that
   * compose `roll`. OPTIONAL.
   */
  readonly rolls?: readonly number[];
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
 */
export interface ILocationDestroyedPayload {
  readonly unitId: string;
  readonly location: string;
  readonly cascadedTo?: string;
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
  | IDamageAppliedPayload
  | IHeatPayload
  | IPilotHitPayload
  | IUnitDestroyedPayload
  | ICriticalHitResolvedPayload
  | IPSRTriggeredPayload
  | IPSRResolvedPayload
  | IUnitFellPayload
  | IUnitStoodPayload
  | IPhysicalAttackDeclaredPayload
  | IPhysicalAttackResolvedPayload
  | IShutdownCheckPayload
  | IStartupAttemptPayload
  | IAmmoConsumedPayload
  | IAttackInvalidPayload
  | ILocationDestroyedPayload
  | ITransferDamagePayload
  | IComponentDestroyedPayload
  | IRetreatTriggeredPayload
  | IMotiveDamagedPayload
  | IMotivePenaltyAppliedPayload
  | IVehicleImmobilizedPayload
  | ITurretLockedPayload
  | IVehicleCrewStunnedPayload
  | IVTOLCrashCheckPayload;

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
   * Ammo bin construction data (one entry per ton of ammo carried).
   * When present, `createGameSession` seeds this unit's `ammoState` so
   * the attack resolver can consume bins per fire. When absent, the
   * unit has zero ammo bins; any ammo-consuming weapon fire will emit
   * `AttackInvalid { reason: 'OutOfAmmo' }`. Producers (e.g.,
   * `InteractiveSession`) populate this from catalog / construction
   * data per `wire-ammo-consumption`.
   */
  readonly ammoConstruction?: readonly IAmmoConstructionInit[];
}

/**
 * Minimal ammo construction shape carried on `IGameUnit` for session-start
 * bin initialization. Mirrors `IAmmoConstructionData` in
 * `ammoTracking/types.ts` but is declared here to avoid a circular
 * import from the types package into the gameplay utils.
 */
export interface IAmmoConstructionInit {
  readonly binId: string;
  readonly weaponType: string;
  readonly location: string;
  readonly maxRounds: number;
  readonly damagePerRound: number;
  readonly isExplosive: boolean;
}

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
  /** Armor remaining per location */
  readonly armor: Record<string, number>;
  /** Structure remaining per location */
  readonly structure: Record<string, number>;
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
