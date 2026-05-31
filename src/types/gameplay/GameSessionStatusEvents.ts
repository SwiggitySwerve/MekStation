/**
 * Game session status and aggregate event payloads
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type {
  ILegAttackPayload,
  ILegAttackResolvedPayload,
  IMimeticBonusPayload,
  ISquadEliminatedPayload,
  IStealthBonusPayload,
  ISwarmAttachedPayload,
  ISwarmDamagePayload,
  ISwarmDismountedPayload,
  ITrooperKilledPayload,
} from './BattleArmorCombatInterfaces';
import type {
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
  IAttackResolvedPayload,
  IAmmoExplosionPayload,
  IHeatPayload,
  IAttacksRevealedPayload,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPilotHitPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IRedactedAttackResolvedPayload,
  IRedactedUnitDestroyedPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitStoodPayload,
  IUnitStuckPayload,
  IDamageAppliedPayload,
  ICriticalHitResolvedPayload,
} from './GameSessionAttackEvents';
import type {
  GameSide,
  IGameEventBase,
  MoraleLevel,
} from './GameSessionCoreTypes';
import type {
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameStartedPayload,
  IInitiativeOrderSetPayload,
  IInitiativeRolledPayload,
  IPhaseChangedPayload,
  ITurnEndedPayload,
  ITurnStartedPayload,
} from './GameSessionLifecycleEvents';
import type {
  IFacingChangedPayload,
  IAttackLockedPayload,
  IMovementDeclaredPayload,
  IMovementLockedPayload,
} from './GameSessionMovementEvents';
import type {
  IObjectiveCapturedPayload,
  IObjectiveLostPayload,
  IObjectiveProgressPayload,
} from './GameSessionObjectiveEvents';
// Wave 8 PR-K4: indirect-fire dispatch events. Payloads extracted to
// IndirectFireInterfaces.ts (PR-types-split G9).
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireNarcOverridePayload,
  IIndirectFireSpotterLostPayload,
  IIndirectFireSpotterSelectedPayload,
} from './IndirectFireInterfaces';

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

export interface IAMSInterceptionPayload {
  readonly defenderId: string;
  readonly targetId: string;
  readonly attackerId: string;
  readonly incomingWeaponId: string;
  readonly amsWeaponId: string;
  readonly resolution: 'cluster-table' | 'single-missile';
  readonly incomingProjectiles: number;
  readonly projectilesIntercepted: number;
  readonly projectilesRemaining: number;
  readonly ammoConsumed: number;
  readonly roll: readonly number[];
  readonly clusterRoll?: number;
  readonly clusterModifier?: number;
  readonly modifiedClusterRoll?: number;
  readonly ammoBinId?: string;
  readonly ammoRemaining?: number;
}

export interface IDesignatorMarkerAppliedPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly marker: 'inarc' | 'narc' | 'tag';
  readonly podType?: 'homing' | 'ecm' | 'haywire' | 'nemesis';
  readonly persistent: boolean;
  readonly turn: number;
  readonly location?: string;
  readonly teamId?: string;
}

/**
 * A unit declared source-backed target spotting for indirect fire. Mirrors
 * MegaMek SpotAction's entity id + target id pair while keeping the state
 * change replayable in MekStation's event log.
 */
export interface ISpottingDeclaredPayload {
  readonly unitId: string;
  readonly targetId: string;
  readonly turn: number;
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
  readonly ammoBinId?: string;
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
 * Pilot ejection removes a unit from active combat without damaging the
 * chassis. Reducers keep armor/structure intact and leave `destroyed=false`.
 */
export interface IUnitEjectedPayload {
  readonly unitId: string;
  readonly turn: number;
  readonly reason: 'player_declared' | 'forced' | 'pilot_survival';
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
 * Per `add-combat-morale-and-withdrawal` (D8): emitted when a side's
 * in-battle `battleMorale` changes. The shift is a deterministic, pure
 * function of the combat-event log, so replaying the log reconstructs
 * morale exactly. `cause` is a short human-readable label for replay /
 * UI consumers (e.g. `'enemy unit destroyed'`).
 */
export interface IMoraleShiftedPayload {
  readonly side: GameSide;
  readonly from: MoraleLevel;
  readonly to: MoraleLevel;
  readonly cause: string;
  readonly turn: number;
}

/**
 * Per `add-combat-morale-and-withdrawal` (D8): emitted when a unit is
 * flagged to withdraw. `declaredBy: 'player'` is a human-declared
 * withdrawal; `declaredBy: 'forced'` is the Forced Withdrawal rule
 * auto-withdrawing the unit. `edge` is the map edge the unit will
 * head toward and exit via the existing `UnitRetreated` machinery.
 */
export interface IWithdrawalDeclaredPayload {
  readonly unitId: string;
  readonly edge: 'north' | 'south' | 'east' | 'west';
  readonly declaredBy: 'player' | 'forced';
  readonly turn: number;
}

/**
 * Per `add-combat-morale-and-withdrawal` (D8): emitted by the
 * end-of-phase Forced Withdrawal check for each unit it compels to
 * withdraw. `reason` distinguishes a broken-side-morale trigger from a
 * crippled-unit trigger. Always paired with a `WithdrawalDeclared`
 * event (`declaredBy: 'forced'`) for the same unit.
 */
export interface IForcedWithdrawalTriggeredPayload {
  readonly unitId: string;
  readonly reason: 'morale-broken' | 'crippled';
  readonly turn: number;
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
  | IInitiativeOrderSetPayload
  | IMovementDeclaredPayload
  | IMovementLockedPayload
  | IFacingChangedPayload
  | IAttackDeclaredPayload
  | IAttackLockedPayload
  | IAttacksRevealedPayload
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
  | IUnitStuckPayload
  | IUnitStoodPayload
  | IPhysicalAttackDeclaredPayload
  | IPhysicalAttackResolvedPayload
  | IShutdownCheckPayload
  | IHeatEffectAppliedPayload
  | IStartupAttemptPayload
  | IAmmoConsumedPayload
  | IAMSInterceptionPayload
  | IDesignatorMarkerAppliedPayload
  | ISpottingDeclaredPayload
  | IAttackInvalidPayload
  | ILocationDestroyedPayload
  | ITransferDamagePayload
  | IComponentDestroyedPayload
  | ICriticalHitPayload
  | IRetreatTriggeredPayload
  | IUnitRetreatedPayload
  | IUnitEjectedPayload
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
  | ILegAttackResolvedPayload
  | IMimeticBonusPayload
  | IStealthBonusPayload
  | IObjectiveCapturedPayload
  | IObjectiveLostPayload
  | IObjectiveProgressPayload
  | IMoraleShiftedPayload
  | IWithdrawalDeclaredPayload
  | IForcedWithdrawalTriggeredPayload
  // Wave 8 PR-K4: indirect-fire dispatch events.
  | IIndirectFireSpotterSelectedPayload
  | IIndirectFireSpotterLostPayload
  | IIndirectFireForwardObserverPayload
  | IIndirectFireNarcOverridePayload;

/**
 * Complete game event with payload.
 */
export interface IGameEvent extends IGameEventBase {
  /** Event-specific payload */
  readonly payload: GameEventPayload;
}
