/**
 * Core game session enums and event envelopes
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import { MovementType } from './HexGridInterfaces';

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
  MovementInvalid = 'movement_invalid',
  MovementLocked = 'movement_locked',
  RuntimeMovementStateChanged = 'runtime_movement_state_changed',
  MovementEnhancementActivated = 'movement_enhancement_activated',
  FacingChanged = 'facing_changed',

  // Combat events
  AttackDeclared = 'attack_declared',
  AttackLocked = 'attack_locked',
  AttacksRevealed = 'attacks_revealed',
  AttackResolved = 'attack_resolved',
  DamageApplied = 'damage_applied',
  SpottingDeclared = 'spotting_declared',

  // Indirect-fire events (Wave 8 PR-K4)
  IndirectFireSpotterSelected = 'indirect_fire_spotter_selected',
  IndirectFireSpotterLost = 'indirect_fire_spotter_lost',
  IndirectFireForwardObserver = 'indirect_fire_forward_observer',
  IndirectFireNarcOverride = 'indirect_fire_narc_override',

  // Status events
  HeatGenerated = 'heat_generated',
  HeatDissipated = 'heat_dissipated',
  HeatEffectApplied = 'heat_effect_applied',
  CommandResultPublished = 'command_result_published',
  PilotHit = 'pilot_hit',
  UnitDestroyed = 'unit_destroyed',
  TerrainChanged = 'terrain_changed',
  MinefieldChanged = 'minefield_changed',
  EmpMinefieldEffectApplied = 'emp_minefield_effect_applied',
  AmmoExplosion = 'ammo_explosion',
  CriticalHit = 'critical_hit',

  // Phase 4: Extended combat events
  CriticalHitResolved = 'critical_hit_resolved',
  PSRTriggered = 'psr_triggered',
  PSRResolved = 'psr_resolved',
  UnitFell = 'unit_fell',
  UnitStuck = 'unit_stuck',
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
  GroundObjectPickedUp = 'ground_object_picked_up',
  GroundObjectDropped = 'ground_object_dropped',
  ShutdownCheck = 'shutdown_check',
  StartupAttempt = 'startup_attempt',
  AmmoConsumed = 'ammo_consumed',
  AMSInterception = 'ams_interception',
  /**
   * A zero-damage designator hit changed target marker state. NARC and
   * iNARC markers persist on the target; TAG designations are transient.
   */
  DesignatorMarkerApplied = 'designator_marker_applied',
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
   * Fired when a pilot ejects from a unit. The unit leaves active combat
   * immediately without being marked destroyed and without mutating
   * armor/structure.
   */
  UnitEjected = 'unit_ejected',
  /**
   * A represented neural-interface jack-in/jack-out state changed for a unit.
   * VDNI, Buffered VDNI, and Triple-Core Processor combat effects read this
   * replayable unit state instead of assuming implants are always connected.
   */
  NeuralInterfaceStateChanged = 'neural_interface_state_changed',
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
   * Per `add-battle-armor-combat` (Wave 8 PR-L3): a BA squad leg-attack
   * resolved against a Mek or Vehicle target using the new
   * `IBASquadCombatState` shape. Distinct from `LegAttack` so the older
   * `add-battlearmor-combat-behavior` event stream (success/damageToLeg/
   * selfDamage/survivingTroopers) stays untouched while the new shape
   * carries `hit / hitLocation / damage / critModifier`. Emitted by
   * `applyInteractiveSessionLegAttack` for both hit and clean-miss
   * outcomes (both-legs-destroyed against a Mek emits a `hit: false`
   * event; the action still consumes the squad's attack).
   */
  LegAttackResolved = 'leg_attack_resolved',
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

  // Scenario objective events
  /**
   * Per `add-scenario-objective-engine` (D7): emitted by the per-turn
   * control-detection pass when an objective marker's `controlSide`
   * changes to a side (was neutral / contested / the other side).
   * Carries the marker id, capturing side, and turn number so the
   * event log fully replays objective state.
   */
  ObjectiveCaptured = 'objective_captured',
  /**
   * Per `add-scenario-objective-engine` (D7): emitted when a marker
   * that a side controlled becomes contested, neutral, or flips to the
   * other side. The marker's `controlSide` stays sticky on contest /
   * vacate — this event records the loss of accrued hold, not a
   * change of the stored controller.
   */
  ObjectiveLost = 'objective_lost',
  /**
   * Per `add-scenario-objective-engine` (D7): emitted when a marker's
   * `holdProgress` changes during the control-detection pass (Capture
   * scenarios advance toward `holdTurnsRequired`).
   */
  ObjectiveProgress = 'objective_progress',

  // Combat morale and withdrawal events
  /**
   * Per `add-combat-morale-and-withdrawal` (D2 / D8): emitted when a
   * side's in-battle `battleMorale` changes in response to a combat
   * event. The morale shift is a deterministic, pure function of the
   * event log — replaying the log reconstructs morale exactly. Carries
   * `side`, `from`, `to`, `cause`, and `turn`.
   */
  MoraleShifted = 'morale_shifted',
  /**
   * Per `add-combat-morale-and-withdrawal` (D4 / D8): emitted when a
   * unit is flagged to withdraw — either a human player declaring
   * withdrawal for an owned unit (`declaredBy: 'player'`) or the
   * Forced Withdrawal rule auto-withdrawing it (`declaredBy: 'forced'`).
   * Carries the chosen target edge; the reducer latches the unit's
   * `isWithdrawing` flag and `retreatTargetEdge`.
   */
  WithdrawalDeclared = 'withdrawal_declared',
  /**
   * Per `add-combat-morale-and-withdrawal` (D5 / D8): emitted by the
   * end-of-phase Forced Withdrawal check for each unit it compels to
   * withdraw. `reason` distinguishes a broken-morale trigger from a
   * crippled-unit trigger. Always paired with a `WithdrawalDeclared`
   * event for the same unit.
   */
  ForcedWithdrawalTriggered = 'forced_withdrawal_triggered',
}

/**
 * Side/team in the game.
 */
export enum GameSide {
  Player = 'player',
  Opponent = 'opponent',
}

/**
 * Origin domain of a replay event log. Discriminates the five replay sources
 * the engine produces so the central replay index, filesystem partition, and
 * Library UI can route entries without filename archaeology.
 *
 * Per add-replay-library (Council #4 — Option C hybrid): the enum values are
 * the literal strings written to NDJSON and used as filesystem partition
 * directory names (e.g. ReplaySource.Swarm → simulation-reports/swarm/).
 *
 * Why an enum instead of a string union: sc2reader's 7-year deprecation pain
 * came from a string discriminator that drifted as new replay sources were
 * added with no exhaustiveness check. An enum forces every consumer to
 * handle every variant or fail compilation.
 *
 * `Encounter` (added by `link-encounters-to-replays` PR 1) is the fifth
 * variant — encounter sessions launched from `/gameplay/encounters/[id]`
 * persist their event log under `simulation-reports/encounter/<gameId>.jsonl`
 * so they appear alongside swarm / quick / pvp / campaign rows in the
 * Replay Library. The corresponding manifest shape is
 * `IEncounterReplayManifestEntry` in `src/replay-library/types.ts`.
 */
export enum ReplaySource {
  Swarm = 'swarm',
  Quick = 'quick',
  PvP = 'pvp',
  Campaign = 'campaign',
  Encounter = 'encounter',
}

// =============================================================================
// Networked Game Intents
// =============================================================================

/**
 * Guest-to-host intent types for networked 1v1 game sessions.
 */
export const GAME_INTENT_TYPES = [
  'declareMovement',
  'stand',
  'goProne',
  'activateMovementEnhancement',
  'torsoTwist',
  'declareAttack',
  'declarePhysical',
  'requestSpot',
  'confirmHeat',
  'endPhase',
  'eject',
  'withdraw',
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
  /**
   * Replay source discriminator. Set at emission time by whichever subsystem
   * authored the event (swarm runner → Swarm; quick-game store → Quick;
   * future PvP → PvP; future campaign emitter → Campaign).
   *
   * Field name is `replaySource` (not `source`) to avoid collision with
   * payload-level `source` strings on heat events ("movement"|"weapons"|
   * "dissipation") and pilot-hit events ("head_hit"|"ammo_explosion"|...).
   *
   * Optional so legacy NDJSON streams written before this field landed
   * replay unchanged. Per add-replay-library: consumers may infer
   * `ReplaySource.Swarm` for files discovered under the legacy
   * `simulation-reports/games/<ts>/` flat layout.
   */
  readonly replaySource?: ReplaySource;
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

// =============================================================================
// Combat Morale
// =============================================================================

/**
 * Per `add-combat-morale-and-withdrawal` (D1): the seven-level ordinal
 * morale scale, ordered worst → best. Reuses the vocabulary of
 * campaign-layer morale for consistency, but the in-battle state is
 * wholly separate (D3) — this type never reads or writes campaign
 * morale storage.
 */
export type MoraleLevel =
  | 'ROUTED'
  | 'BROKEN'
  | 'SHAKEN'
  | 'STEADY'
  | 'CONFIDENT'
  | 'INSPIRED'
  | 'OVERWHELMING';

/**
 * Canonical ordering of `MoraleLevel`, worst → best. Array index is the
 * ordinal used by morale-shift clamping arithmetic.
 */
export const MORALE_LEVELS: readonly MoraleLevel[] = [
  'ROUTED',
  'BROKEN',
  'SHAKEN',
  'STEADY',
  'CONFIDENT',
  'INSPIRED',
  'OVERWHELMING',
] as const;

/**
 * Per `add-combat-morale-and-withdrawal` (D1): in-battle per-side
 * morale. Carried on the derived game state — `battleMorale` records a
 * `MoraleLevel` for every `GameSide`, every side starting at `STEADY`.
 * Reconstructed deterministically by replaying `MoraleShifted` events.
 */
export interface ISessionMoraleState {
  readonly battleMorale: Record<GameSide, MoraleLevel>;
}
