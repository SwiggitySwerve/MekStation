/**
 * Derived game session state types
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';
import type { IAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import type {
  IC3EquipmentMountState,
  IC3NetworkState,
} from '@/utils/gameplay/c3Network';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';
import type { IInfantryCombatState } from '@/utils/gameplay/infantry/state';
import type { IProtoMechCombatState } from '@/utils/gameplay/protomech/state';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type { IBattleArmorCombatState } from './BattleArmorCombatInterfaces';
import type { IUnitDestroyedPayload } from './GameSessionAttackEvents';
import type { IGameEvent } from './GameSessionStatusEvents';
import type { IGameConfig, IGameUnit } from './GameSessionUnitTypes';

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
  RangeBracket,
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

export type INarcPodType = 'homing' | 'ecm' | 'haywire' | 'nemesis';

export interface IINarcPodState {
  /** Team that attached this iNARC pod. */
  readonly teamId: string;
  /** Source-backed iNARC pod type. Homing is the guidance pod. */
  readonly podType: INarcPodType;
  /** Hit location the pod attached to, when known. */
  readonly location?: string;
}

/**
 * A pending Piloting Skill Roll that must be resolved.
 */
export interface IPendingPSR {
  /** Entity/unit that must make the roll */
  readonly entityId: string;
  /** Human-readable reason for the PSR */
  readonly reason: string;
  /**
   * Fixed target number for system checks that do not use the pilot's
   * piloting skill or damage/wound modifiers, such as MASC/Supercharger
   * failure rolls.
   */
  readonly fixedTargetNumber?: number;
  /** Additional modifier to the piloting skill roll */
  readonly additionalModifier: number;
  /** Optional terrain level/depth associated with terrain-triggered PSRs */
  readonly terrainLevel?: number;
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
  /**
   * Construction-side unit type carried into combat for source-backed rules
   * that distinguish BattleMechs from vehicles, aerospace, infantry, battle
   * armor, and ProtoMechs. Undefined preserves legacy synthetic mech states.
   */
  readonly unitType?: string;
  /**
   * Unit mass in tons. Undefined preserves legacy synthetic fixtures, while
   * explicit values allow terrain/load rules to avoid guessing.
   */
  readonly tonnage?: number;
  /**
   * Construction-side movement/motion mode copied into combat state for
   * source-backed rules that distinguish VTOL/WIGE-like airborne targets
   * from generic vehicles. Undefined preserves legacy BattleMech fixtures.
   */
  readonly motionType?: string;
  /**
   * BattleMech chassis posture used by source-backed physical legality gates.
   * Undefined preserves legacy synthetic biped BattleMech fixtures.
   */
  readonly isQuad?: boolean;
  /**
   * Whether the BattleMech has flipped its arms to the rear this turn.
   * Explicit true blocks source-backed push legality; undefined preserves
   * legacy fixtures without torso/arm posture state.
   */
  readonly armsFlipped?: boolean;
  /**
   * Whether this unit is currently transported as a passenger. Explicit true
   * blocks source-backed physical targetability; undefined preserves legacy
   * fixtures without transport state.
   */
  readonly isPassenger?: boolean;
  /**
   * Whether this unit is currently conducting a swarm attack against another
   * unit. Explicit true blocks source-backed physical targetability;
   * undefined preserves legacy fixtures without swarm lifecycle state.
   */
  readonly isSwarming?: boolean;
  /**
   * Whether this unit is currently making a death-from-above attack. Explicit
   * true blocks source-backed physical targetability; undefined preserves
   * legacy fixtures without DFA lifecycle state.
   */
  readonly isMakingDFA?: boolean;
  /**
   * Whether this unit is currently making any displacement physical attack
   * (charge/DFA/push). Explicit true blocks charge/DFA targetability.
   */
  readonly isMakingDisplacementAttack?: boolean;
  /**
   * Whether this unit is currently making a push attack. Push legality uses
   * this to distinguish legal counter-pushes from other displacement attacks.
   */
  readonly isPushing?: boolean;
  /**
   * Source-backed TacOps grapple state. A successful grapple records the
   * opposing unit id on both participants; the unit that initiated the
   * grapple sets `isGrappleAttacker`.
   */
  readonly grappledUnitId?: string;
  readonly isGrappleAttacker?: boolean;
  readonly grappledThisRound?: boolean;
  readonly grappleSide?: 'left' | 'right' | 'both';
  readonly isChainWhipGrappled?: boolean;
  /**
   * Target id of this unit's active displacement attack. Push legality uses
   * this to prove counter-push ownership when `isPushing` is true.
   */
  readonly displacementAttackTargetId?: string;
  /**
   * Attacker id whose displacement physical attack currently targets this
   * unit. Charge/DFA reject when the owning attacker differs.
   */
  readonly targetedByDisplacementAttackerId?: string;
  /**
   * Whether this unit is currently airborne. Explicit true blocks
   * source-backed physical targetability; undefined preserves legacy fixtures
   * without airborne state.
   */
  readonly isAirborne?: boolean;
  /**
   * Optional building occupancy identifier for shared physical legality.
   * Explicit ids allow physical attacks only when attacker and target occupy
   * the same building.
   */
  readonly occupiedBuildingId?: string;
  /**
   * Whether this unit is currently evading. Explicit true blocks
   * source-backed physical attack declarations by this attacker; undefined
   * preserves legacy fixtures without evasion state.
   */
  readonly isEvading?: boolean;
  /**
   * Whether this unit declared target spotting for indirect fire this turn.
   * The state persists into the same turn's physical phase so source-backed
   * "attacker is spotting" penalties can be applied before turn reset.
   */
  readonly isSpotting?: boolean;
  /** Target id selected by this turn's spotting declaration. */
  readonly spotTargetId?: string;
  /**
   * Optional source-backed target evasion to-hit bonus. Undefined preserves
   * the normal +1 evasion bonus for explicit evading targets; explicit 0 lets
   * Skilled Evasion state suppress the bonus without clearing evasion.
   */
  readonly evasionBonus?: number;
  /**
   * Whether this unit sprinted during the current turn. Explicit true feeds
   * the source-backed target-sprinted ranged to-hit modifier and
   * sprinting-attacker ranged attack invalidation.
   */
  readonly sprintedThisTurn?: boolean;
  /**
   * Whether this unit is loading or unloading cargo this turn. Explicit true
   * blocks source-backed physical attack declarations by this attacker;
   * undefined preserves legacy fixtures without cargo interaction state.
   */
  readonly isLoadingOrUnloadingCargo?: boolean;
  /**
   * Optional board identity for multi-board combat. When both attacker and
   * target provide explicit ids, source-backed physical declarations require
   * them to match.
   */
  readonly boardId?: string;
  /** Which side this unit belongs to */
  readonly side: GameSide;
  /** Current position */
  readonly position: IHexCoordinate;
  /** Current facing */
  readonly facing: Facing;
  /**
   * Optional MegaMek-style secondary facing for BattleMech torso twist.
   * When absent, combat consumers treat the upper body as aligned with
   * chassis `facing`.
   */
  readonly secondaryFacing?: Facing;
  /**
   * Legacy relative torso-twist helper consumed by the AI firing-arc filter.
   * New authoritative state should prefer `secondaryFacing`; this remains so
   * older explicit fixtures can keep describing a one-hexside twist directly.
   */
  readonly torsoTwist?: 'left' | 'right';
  /** Current heat */
  readonly heat: number;
  /** Movement this turn */
  readonly movementThisTurn: MovementType;
  /** Hexes moved this turn */
  readonly hexesMovedThisTurn: number;
  /**
   * Source-backed charge legality state derived from MovementDeclared.steps.
   * True when this turn's movement path included BACKWARDS or backward-lateral
   * steps, which MegaMek rejects for charge movement paths.
   */
  readonly movedBackwardThisTurn?: boolean;
  /**
   * Source-backed DFA legality state derived from MovementDeclared.steps.
   * True when this turn's jump movement used MegaMek's
   * JUMP_MEK_MECHANICAL_BOOSTER path, which cannot be used for DFA.
   */
  readonly usedMechanicalJumpBoosterThisTurn?: boolean;
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
  /** Total heat sinks on unit (default: 10 if omitted by legacy fixtures). */
  readonly heatSinks?: number;
  /** Heat-sink rating used for dissipation and destroyed-sink debits. */
  readonly heatSinkType?: 'single' | 'double';
  /** Triple-strength myomer installed; active physical damage doubles at heat 9+. */
  readonly hasTSM?: boolean;
  /** MASC installed; activation is explicit per combat state/intent. */
  readonly hasMASC?: boolean;
  /** Supercharger installed; activation is explicit per combat state/intent. */
  readonly hasSupercharger?: boolean;
  /**
   * Mounted C3 equipment projected from catalog/full-unit data. This records
   * source-backed roles for later network assembly without implying the unit
   * is already connected to an `IGameState.c3Network`.
   */
  readonly c3Equipment?: readonly IC3EquipmentMountState[];
  /** MASC active for this movement declaration. */
  readonly activeMASC?: boolean;
  /** Supercharger active for this movement declaration. */
  readonly activeSupercharger?: boolean;
  /** Consecutive previous turns of MASC use, for source-backed failure TNs. */
  readonly mascTurnsUsed?: number;
  /** Consecutive previous turns of Supercharger use, for source-backed failure TNs. */
  readonly superchargerTurnsUsed?: number;
  /**
   * MegaMek-style MASC failure-level decay marker. After a turn where the
   * level increased, the next idle turn drops an extra level before clearing
   * this marker.
   */
  readonly mascFailureLevelIncreasedLastTurn?: boolean;
  /**
   * MegaMek-style Supercharger failure-level decay marker. Mirrors the MASC
   * counter lifecycle for the separate Supercharger failure target.
   */
  readonly superchargerFailureLevelIncreasedLastTurn?: boolean;
  /**
   * Explicit BattleMech Partial Wing jump bonus after source-backed equipment
   * hydration. Undefined means no supported Partial Wing combat state.
   */
  readonly partialWingJumpBonus?: number;
  /**
   * Talon equipment projected into combat state. UnitHydration derives this
   * from leg critical slots for catalog units; undefined preserves synthetic
   * fixtures that do not carry mounted talon equipment. For quad/non-biped
   * BattleMechs, MegaMek stores the front leg talon checks on arm locations.
   */
  readonly leftLegHasTalons?: boolean;
  readonly rightLegHasTalons?: boolean;
  readonly leftArmHasTalons?: boolean;
  readonly rightArmHasTalons?: boolean;
  /**
   * Claw equipment projected into combat state. UnitHydration derives this
   * from arm critical slots for catalog units; undefined preserves synthetic
   * fixtures that do not carry mounted claw equipment.
   */
  readonly leftArmHasClaw?: boolean;
  readonly rightArmHasClaw?: boolean;
  /** BattleMech stealth armor installed; active effects still require own ECM support. */
  readonly hasStealthArmor?: boolean;
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
  /**
   * Source-backed RPG Toughness numeric crew value for consciousness checks.
   * Undefined preserves default behavior when the RPG Toughness option was not
   * enabled or hydrated.
   */
  readonly pilotToughness?: number;
  /** Is pilot conscious? */
  readonly pilotConscious: boolean;
  /** Is unit destroyed? */
  readonly destroyed: boolean;
  /** Canonical destruction cause once destroyed. */
  readonly destructionCause?: IUnitDestroyedPayload['cause'];
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
  /** Unit is bogged down or otherwise stuck and cannot voluntarily move. */
  readonly isStuck?: boolean;
  /** Unit is in a hull-down defensive position. */
  readonly hullDown?: boolean;
  /** Unit is bracing and cannot change secondary facing. */
  readonly isBracing?: boolean;
  /** Unit is shut down (reactor offline) */
  readonly shutdown?: boolean;
  /** Ammo bin state tracking */
  readonly ammoState?: Record<string, IAmmoSlotState>;
  /**
   * Optional per-location armor type projected from construction data or test
   * fixtures. Missing keys are treated as standard armor for combat effects
   * that care about special armor behavior.
   */
  readonly armorTypeByLocation?: Readonly<Record<string, string>>;
  /**
   * Per-location ammo explosion containment projected from mounted CASE
   * equipment. `case` and `case_ii` are explicit protection levels; missing
   * keys mean the location has no CASE protection.
   */
  readonly caseProtection?: Readonly<Record<string, 'case' | 'case_ii'>>;
  /** Pending piloting skill rolls to resolve */
  readonly pendingPSRs?: readonly IPendingPSR[];
  readonly weaponsFiredThisTurn?: readonly string[];
  /**
   * Mounted weapon location by runtime weapon id. Used by physical legality
   * gates to distinguish arm-fired weapons from torso/head/leg weapons.
   */
  readonly weaponLocationById?: Readonly<Record<string, string>>;
  readonly edgePointsRemaining?: number;
  /**
   * Pilot SPA ids available to attack/to-hit resolvers. Kept as catalog ids
   * (for example `weapon-specialist`) so modifier helpers can canonicalize
   * legacy underscore spellings themselves.
   */
  readonly abilities?: readonly string[];
  /** Flat SPA designation fields consumed by the to-hit modifier pipeline. */
  readonly designatedWeaponType?: string;
  readonly designatedWeaponCategory?: string;
  readonly designatedTargetId?: string;
  readonly designatedRangeBracket?: RangeBracket;
  /** Unit and weapon quirk ids available to attack/to-hit resolvers. */
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  /** Explicit source-backed HQ initiative bonus for force-level initiative. */
  readonly initiativeHQBonus?: number;
  /** Explicit source-backed command initiative bonus for force-level initiative. */
  readonly initiativeCommandBonus?: number;
  readonly isDodging?: boolean;
  /** Weapons that are jammed (UAC/RAC jam mechanic) */
  readonly jammedWeapons?: readonly string[];
  /** Target has Narc beacon attached */
  readonly narcedBy?: readonly string[];
  /** Target has iNARC pods attached; variant effects are resolved separately. */
  readonly iNarcPods?: readonly IINarcPodState[];
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
   * Pilot has ejected from this unit. The chassis remains available for
   * post-battle accounting, but the unit no longer participates in combat
   * action queues, target lists, objectives, or side-survival checks.
   */
  readonly hasEjected?: boolean;
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
  /**
   * Optional battle-wide electronic-warfare state. AI movement already accepts
   * this shape for ECM-aware positioning; combat phases read it only when
   * scenario/session builders provide it, preserving legacy no-EW behavior.
   */
  readonly electronicWarfare?: IElectronicWarfareState;
  /**
   * Optional battle-wide C3 network state. Combat phases consume explicit
   * C3/C3i networks when scenario/session builders provide them. Runner
   * initial state can seed conservative unambiguous networks from hydrated
   * mounted C3 equipment; ambiguous multi-network formation remains explicit.
   */
  readonly c3Network?: IC3NetworkState;
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
