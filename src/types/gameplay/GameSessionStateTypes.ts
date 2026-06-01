/**
 * Derived game session state types
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';
import type { IAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import type { IC3NetworkState } from '@/utils/gameplay/c3Network';
import type { IInfantryCombatState } from '@/utils/gameplay/infantry/state';
import type { IProtoMechCombatState } from '@/utils/gameplay/protomech/state';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type { IBattleArmorCombatState } from './BattleArmorCombatInterfaces';
import type { CombatLocation } from './CombatLocationTypes';
import type { IGameEvent } from './GameSessionStatusEvents';
import type { IGameConfig, IGameUnit } from './GameSessionUnitTypes';
import type { IVehicleCombatState } from './VehicleCombatInterfaces';

import {
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type MoraleLevel,
} from './GameSessionCoreTypes';
import {
  Facing,
  IHexCoordinate,
  MovementType,
  type MovementConversionMode,
} from './HexGridInterfaces';
import { PSRTrigger } from './PSRTriggerCodes';

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
  /**
   * Gyro critical hits. Standard/XL/compact/superheavy gyros are destroyed at
   * 2 hits; represented heavy-duty gyros are destroyed at 3 hits, or 4 hits
   * when the represented Playtest3 optional rule is enabled.
   */
  readonly gyroHits: number;
  /** Sensor critical hits: 0-2. Each hit adds +1/+2 to-hit penalty. */
  readonly sensorHits: number;
  /** Life support hits: 0-2. Enables pilot heat damage when damaged. */
  readonly lifeSupport: number;
  /** Cockpit destroyed = pilot killed. */
  readonly cockpitHit: boolean;
  /** Actuator destruction state per actuator type. */
  readonly actuators: Partial<Record<ActuatorType, boolean>>;
  /** Actuator destruction state keyed by combat location when source data carries it. */
  readonly actuatorsByLocation?: Partial<
    Record<CombatLocation, Partial<Record<ActuatorType, boolean>>>
  >;
  /** IDs of destroyed weapons. */
  readonly weaponsDestroyed: readonly string[];
  /**
   * Represented vehicle critical outcomes keyed by vehicle location. Used by
   * later vehicle critical fallthrough so static target-equipment metadata can
   * be reduced by already-applied weapon and stabilizer criticals.
   */
  readonly vehicleCriticalsByLocation?: Partial<
    Record<string, IVehicleCriticalLocationDamageState>
  >;
  /** Number of heat sinks destroyed (reduces dissipation by 1 single / 2 double each). */
  readonly heatSinksDestroyed: number;
  /** Number of jump jets destroyed (reduces max jump MP by 1 each). */
  readonly jumpJetsDestroyed: number;
}

export interface IVehicleCriticalLocationDamageState {
  readonly weaponsDestroyed?: number;
  readonly weaponsJammed?: number;
  readonly stabilizerHit?: boolean;
  readonly flightStabilizerHit?: boolean;
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
  /** Damage each round contributes when this bin explodes. */
  readonly damagePerRound?: number;
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
  /**
   * Per `structure-psr-reason-as-discriminated-code` (PR E): canonical
   * `PSRTrigger` enum value carried alongside the human-readable
   * `reason` string. Populated by every PSR factory in
   * `src/utils/gameplay/pilotingSkillRolls/`. The downstream event
   * builder (`createPSRTriggeredEvent`) threads this through to
   * `IPSRTriggeredPayload.reasonCode` so consumers can filter / bucket
   * PSRs by canonical code. OPTIONAL for back-compat with synthetic
   * `IPendingPSR` fixtures predating PR E.
   */
  readonly reasonCode?: PSRTrigger;
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
  /**
   * Canonical SPA ids copied from the session unit binding so rules projection
   * and commit validation can resolve pilot abilities without reaching back
   * into the campaign vault.
   */
  readonly pilotSpas?: readonly string[];
  /** Represented construction gyro type copied from the session unit binding. */
  readonly gyroType?: string;
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
  /** Unit is in a represented hull-down position. */
  readonly hullDown?: boolean;
  /**
   * True when the unit entered its current hull-down state through a backward
   * movement step. MegaMek uses this to flip vehicle hull-down protected-facing
   * hit-location behavior from front-facing to rear-facing cover.
   */
  readonly hullDownEnteredBackwards?: boolean;
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
   * Per `add-combat-morale-and-withdrawal` (D4): set `true` by the
   * `WithdrawalDeclared` reducer when a human player declares
   * withdrawal for this unit, or when the Forced Withdrawal rule
   * auto-withdraws it. Distinct from `isRetreating` (which is the
   * bot-only damage-trigger latch) so the two entry points stay
   * traceable — but both converge on the same edge-exit machinery via
   * `retreatTargetEdge`. Sticky for the rest of the match (one-way
   * latch); the player cannot cancel a declared withdrawal.
   */
  readonly isWithdrawing?: boolean;
  /**
   * Runtime override for MegaMek-style entity height() above elevation.
   * Movement projection/commit reads this before import-time movement
   * capability height so conversion or mount-state events can affect bridge
   * clearance without rebuilding the whole session cache.
   */
  readonly unitHeight?: number;
  /**
   * Runtime conversion state for represented LAM / QuadVee style units.
   * Movement capability profiles translate this into the active unit height.
   */
  readonly conversionMode?: MovementConversionMode | number;
  /**
   * Pending represented CONVERT_MODE steps already chosen this movement phase.
   * Movement projection and commit validation consume this before later path MP.
   */
  readonly pendingConversionStepCount?: number;
  /** Pending MP reserved by represented CONVERT_MODE steps this movement phase. */
  readonly pendingConversionMpCost?: number;
  /**
   * Pending represented VTOL/WiGE UP/DOWN altitude-control steps already chosen
   * this movement phase. Projection and commit validation reserve this before
   * later path MP.
   */
  readonly pendingAltitudeControlStepCount?: number;
  /** Pending MP reserved by represented VTOL/WiGE altitude-control steps. */
  readonly pendingAltitudeControlMpCost?: number;
  /**
   * Runtime LAM AirMek WiGE elevation selected through UP/DOWN altitude
   * controls. Kept separate from aerospace altitude: MegaMek treats grounded
   * AirMek WiGE elevation as terrain-board elevation while aerospace altitude
   * stays 0 until full airborne flight rules take over.
   */
  readonly lamAirMekAltitude?: number;
  /**
   * Runtime mounted-infantry state. `false` forces conventional infantry
   * height to 0; `true` uses the runtime or imported mount height when known.
   */
  readonly infantryMounted?: boolean;
  /** Runtime mount height for conventional infantry mount/dismount updates. */
  readonly infantryMountHeight?: number;
  /**
   * Per-type combat-behavior envelope.
   *
   * Per Council #1 (`openspec/council-decisions/2026-05-02-cluster-F-combat-
   * behavior-wiring.md`) and openspec change `wire-combat-behavior-dispatch`,
   * aerospace / protomech / infantry / BA units carry their per-type combat
   * struct here so renderers and fog redaction read a single channel. Mech
   * and vehicle units may carry `kind: 'vehicle'` once vehicle combat state
   * has been initialized for the session.
   *
   * Producers: `createInitialUnitState` (initial seed); per-type reducers
   * (combat events update the inner `state` and replace the envelope).
   *
   * Consumers: `unitStateToToken` (projection); fog-of-war redaction.
   */
  readonly combatState?:
    | { readonly kind: 'aero'; readonly state: IAerospaceCombatState }
    | { readonly kind: 'vehicle'; readonly state: IVehicleCombatState }
    | { readonly kind: 'proto'; readonly state: IProtoMechCombatState }
    | { readonly kind: 'platoon'; readonly state: IInfantryCombatState }
    | { readonly kind: 'squad'; readonly state: IBattleArmorCombatState };
}

export interface IGameTerrainOverride {
  readonly hex: IHexCoordinate;
  readonly terrain: string;
  readonly elevation: number;
  readonly reason?: 'battlefield_wreckage';
  readonly sourceEventId?: string;
  readonly sourceUnitId?: string;
  readonly optionalRule?: string;
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
  /** Optional tactical C3 network snapshot used by attack projection/commit. */
  readonly c3State?: IC3NetworkState;
  /** Event-sourced terrain mutations keyed by canonical `"q,r"` hex. */
  readonly terrainOverrides?: Record<string, IGameTerrainOverride>;
  /** Events this turn for display */
  readonly turnEvents: readonly IGameEvent[];
  /** Game result (if completed) */
  readonly result?: {
    readonly winner: GameSide | 'draw';
    readonly reason: string;
  };
  /**
   * Per `add-scenario-objective-engine` (design.md D1): scenario
   * objective markers keyed by canonical `"q,r"` hex coordinate.
   * Carried on the derived state so victory evaluation, control
   * detection, and rendering all read one channel — `IHex` is never
   * modified. A session with no objectives leaves this `undefined` or
   * `{}` and behaves identically to a destruction-only scenario.
   */
  readonly objectives?: Record<string, IObjectiveMarker>;
  /**
   * Per `add-combat-morale-and-withdrawal` (D1): in-battle per-side
   * morale. Every side starts at `STEADY`; the `MoraleShifted` reducer
   * mutates this in response to combat events. Reconstructed
   * deterministically by replaying the event log. Independent of
   * campaign-layer morale (`Contract Morale Tracking`) — D3.
   */
  readonly battleMorale?: Record<GameSide, MoraleLevel>;
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
