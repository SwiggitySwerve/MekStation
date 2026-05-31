import type {
  IComponentDestroyedPayload,
  IGameSession,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
} from '@/types/gameplay';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import { GameEventType, GamePhase, MovementType } from '@/types/gameplay';
import { chooseBestPhysicalAttack } from '@/utils/gameplay/physicalAttacks';

import type { SeededRandom } from '../core/SeededRandom';
import type { IElectronicWarfareContext } from './AIElectronicWarfareAdvisor';
import type { IAILanceContext } from './AILancePlanner';
import type {
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from './AIPlayerEvents';
import type { IVisionContext } from './AIVisionAdvisor';
import type { IAIPlayer } from './IAIPlayer';
import type { IBotBehavior, IAIUnitState, IMove, IWeapon } from './types';

import { planEffectiveThreshold } from './AIHeatPlanner';
import { evaluateJump } from './AIJumpTactics';
import {
  type IAITierAdvancedParameters,
  type IAITierCoordinationParameters,
  type IAITierResourceParameters,
  resolveAdvancedParameters,
  resolveCoordinationParameters,
  resolveResourceParameters,
  resolveTierParameters,
} from './AITierRegistry';
import { collectWeaponModes } from './AIWeaponModeSelector';
import { AttackAI, applyHeatBudget, scoreTarget } from './AttackAI';
import { MoveAI, type IScoreMoveContext } from './MoveAI';
import {
  effectiveSafeHeatThreshold,
  resolveEdge,
  retreatMovementType,
  shouldRetreat,
} from './RetreatAI';
import { DEFAULT_BEHAVIOR } from './types';

export type {
  BotGameEvent,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from './AIPlayerEvents';

// Per `add-ai-coordination-tactics` (A3a): the lance context type lives in
// `AILancePlanner` (it pairs with `ILanceTurnPlan`); re-export it here so
// callers of `playMovementPhase` / `playAttackPhase` can import it alongside
// `BotPlayer`.
export type { IAILanceContext } from './AILancePlanner';

/** Vital component types whose destruction triggers a retreat per spec § 2. */
const VITAL_COMPONENT_TYPES = new Set(['cockpit', 'engine', 'gyro']);

/** Default attacker tonnage when caller doesn't supply per-unit data. */
const DEFAULT_ATTACKER_TONNAGE = 65;
/** Default piloting skill for physical-attack to-hit when not supplied. */
const DEFAULT_PILOTING_SKILL = 5;
/** Melee range in hexes — punches/kicks/charges all need adjacency. */
const MELEE_RANGE_HEXES = 1;

/**
 * Per `add-ai-resource-planning` (A2): the canonical 10-heat-sink baseline
 * dissipation used by the multi-turn heat planner when an `IAIUnitState`
 * does not carry an explicit `heatDissipation`. Matches the standard 'Mech
 * loadout (10 single heat sinks dissipating 1 each per turn).
 */
const DEFAULT_HEAT_DISSIPATION = 10;

function createVoluntaryGoProneEvent(unit: IAIUnitState): IMovementEvent {
  return {
    type: GameEventType.MovementDeclared,
    payload: {
      unitId: unit.unitId,
      from: unit.position,
      to: unit.position,
      facing: unit.facing,
      movementType: MovementType.Stationary,
      mpUsed: 1,
      heatGenerated: 0,
      steps: [
        {
          kind: 'goProne',
          index: 0,
          at: { q: unit.position.q, r: unit.position.r },
          mpCost: 1,
        },
      ],
    },
  };
}

export class BotPlayer implements IAIPlayer {
  private readonly moveAI: MoveAI;
  private readonly attackAI: AttackAI;
  private readonly random: SeededRandom;
  private readonly behavior: IBotBehavior;
  /**
   * Per `add-ai-resource-planning` (A2): the resource-planning block resolved
   * from the bot's difficulty tier. `Green`/`Regular` (and an absent tier)
   * carry the fully-inert block so pre-A2 behavior is byte-identical;
   * `Veteran`/`Elite` carry the active block.
   */
  private readonly resource: IAITierResourceParameters;
  /**
   * Per `add-ai-coordination-tactics` (A3a): the coordination block resolved
   * from the bot's difficulty tier. `Green`/`Regular`/`Veteran` (and an
   * absent tier) carry the fully-inert block (`lanceCoordination: false`) so
   * the lance plan is never consulted and pre-A3a behavior is byte-identical;
   * `Elite` carries the active block.
   */
  private readonly coordination: IAITierCoordinationParameters;
  /**
   * Per `add-ai-advanced-systems` (A4): the advanced-systems block resolved
   * from the bot's difficulty tier. `Green`/`Regular`/`Veteran` (and an
   * absent tier) carry the fully-inert block (`advancedSystems: false`) so
   * `selectMovementType` keeps the flat-probability jump roll and pre-A4
   * behavior is byte-identical; `Elite` carries the active block.
   */
  private readonly advanced: IAITierAdvancedParameters;

  constructor(random: SeededRandom, behavior: IBotBehavior = DEFAULT_BEHAVIOR) {
    this.random = random;
    this.behavior = behavior;
    this.moveAI = new MoveAI(behavior);
    this.attackAI = new AttackAI();
    const tierParams = resolveTierParameters(behavior.tier);
    this.resource = resolveResourceParameters(tierParams);
    this.coordination = resolveCoordinationParameters(tierParams);
    this.advanced = resolveAdvancedParameters(tierParams);
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone`: detect retreat triggers for
   * `unit` based on cumulative session state. Returns a
   * `RetreatTriggered` event when both:
   *
   *   1. `shouldRetreat(behavior, ratio, hasVitalCrit)` fires, AND
   *   2. The unit is not already latched as retreating (one-way).
   *
   * `destructionRatio` = destroyed locations / total locations. Vital
   * crit is computed by scanning `session.events` for any
   * `ComponentDestroyed` payload with `componentType` ∈
   * {cockpit, engine, gyro} for this unit.
   *
   * Caller is responsible for appending the returned event to the
   * session before calling movement/attack phases — that way the
   * next call sees `isRetreating: true` on the AI unit state.
   */
  evaluateRetreat(
    unit: IAIUnitState,
    session: IGameSession,
  ): IRetreatEvent | null {
    if (unit.destroyed) return null;
    if (unit.isRetreating) return null;

    const sessionUnit = session.currentState.units[unit.unitId];
    if (!sessionUnit) return null;

    const { ratio, hasVitalCrit } = computeRetreatSignals(
      unit.unitId,
      session,
      sessionUnit.structure,
      sessionUnit.startingInternalStructure ?? {},
    );

    if (!shouldRetreat(this.behavior, ratio, hasVitalCrit)) {
      return null;
    }

    const edge = resolveEdge(
      this.behavior,
      unit.position,
      session.config.mapRadius,
    );
    if (!edge) return null;

    const reason = hasVitalCrit ? 'vital_crit' : 'structural_threshold';
    return {
      type: GameEventType.RetreatTriggered,
      payload: { unitId: unit.unitId, edge, reason },
    };
  }

  /**
   * Per `improve-bot-basic-combat-competence` task 7.2: pass the
   * full unit list into `playMovementPhase` so movement scoring can
   * see the enemy set (for LoS + closing-distance penalties + the
   * forward-arc bonus on the highest-threat target).
   *
   * `allUnits` is optional for backward compatibility — callers that
   * haven't migrated yet still get the pre-change behavior (uniform
   * random pick, or retreat scoring when retreating).
   *
   * Per `add-ai-coordination-tactics` (A3a) design D4: an optional
   * `lanceContext` threads the per-lance turn plan into the unit's movement
   * decision. When supplied AND the bot's tier enables lance coordination,
   * `scoreMove`'s cohesion term pulls the unit toward the lance centroid and
   * penalizes a lone advance into enemy LOS. When omitted — or when the tier
   * leaves `lanceCoordination` false — the decision is identical to the
   * pre-A3a per-unit behavior.
   *
   * Per `add-ai-advanced-systems` (A4) design D2 / D3: an optional
   * `advancedContext` threads the live electronic-warfare snapshot and the
   * moving unit's team id into the decision. When supplied AND the bot's
   * tier enables advanced systems, `scoreMove`'s ECM term avoids hostile ECM
   * bubbles and rewards covering carriers, and the vision term values
   * scouting / breaking enemy spotting (the vision context is derived from
   * `grid` + `allUnits`). When omitted — or when the tier leaves
   * `advancedSystems` false — the decision is identical to the pre-A4
   * behavior. The advisors only *read* the EW / fog state; they never modify
   * it and never touch combat resolution.
   */
  playMovementPhase(
    unit: IAIUnitState,
    grid: IHexGrid,
    capability: IMovementCapability,
    allUnits?: readonly IAIUnitState[],
    lanceContext?: IAILanceContext,
    advancedContext?: IAIAdvancedContext,
  ): IMovementEvent | null {
    if (unit.destroyed) {
      return null;
    }

    // Per `add-ai-objective-awareness` (A3b) design D3: a capture- or
    // hold-role unit already standing ON its objective hex stays planted —
    // every non-stationary move would abandon the marker and forfeit the
    // objective term. Returning `null` (no `MovementDeclared`) keeps the unit
    // on the objective so it holds control / accrues hold progress. A
    // `screen`-role unit, a `Destroy` scenario, or a non-objective-aware tier
    // never hits this branch and moves exactly as the A3a bot does.
    if (this.shouldHoldObjectiveHex(unit, lanceContext)) {
      return null;
    }

    const position: IUnitPosition = {
      unitId: unit.unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: false,
    };

    // Per `add-ai-advanced-systems` (A4) design D1: the jump-tactics gate
    // needs the enemy set and the grid to call `AIJumpTactics.evaluateJump`.
    // For non-advanced tiers `selectMovementType` ignores them and keeps the
    // flat 20% jump roll. The enemy list (when known) drives the charge-
    // escape motive; an absent list resolves to an empty enemy set.
    const livingEnemiesForMovement = (allUnits ?? []).filter(
      (u) => !u.destroyed && u.unitId !== unit.unitId,
    );
    const movementType = this.selectMovementType(
      unit,
      capability,
      grid,
      livingEnemiesForMovement,
    );
    const moves = this.moveAI.getValidMoves(
      grid,
      position,
      movementType,
      capability,
      { pilotAbilities: unit.abilities },
    );

    const nonStationaryMoves = moves.filter(
      (m: IMove) =>
        m.destination.q !== unit.position.q ||
        m.destination.r !== unit.position.r,
    );

    if (nonStationaryMoves.length === 0) {
      if (
        this.behavior.voluntaryGoProneWhenStationary === true &&
        unit.prone !== true
      ) {
        return createVoluntaryGoProneEvent(unit);
      }
      return null;
    }

    // Task 7.2: build the movement scoring context when we have the
    // enemy list. `highestThreatTarget` is the enemy with the
    // highest `scoreTarget` from the ATTACKER's current position —
    // the +500 forward-arc bonus tries to end the move looking at
    // that threat. If no enemies are left we skip ctx entirely and
    // fall through to the retreat / legacy path in `selectMove`.
    let ctx: IScoreMoveContext | undefined;
    if (allUnits && !unit.isRetreating) {
      const livingEnemies = allUnits.filter(
        (u) => !u.destroyed && u.unitId !== unit.unitId,
      );
      if (livingEnemies.length > 0) {
        let bestScore = -Infinity;
        let best: IAIUnitState | undefined;
        for (const enemy of livingEnemies) {
          const s = scoreTarget(unit, enemy);
          if (s > bestScore) {
            bestScore = s;
            best = enemy;
          }
        }
        ctx = {
          attacker: unit,
          allUnits,
          grid,
          highestThreatTarget: best,
          // Per `add-ai-terrain-aware-movement` design D6: thread the real
          // movement capability so `MoveAI.selectMove` can run the
          // terrain-cost pathfinder with the unit's true MP budget rather
          // than a best-effort estimate from the move set.
          capability,
          // Per `add-ai-coordination-tactics` design D3: thread the lance
          // centroid and the unit's lancemates (excluding the unit itself)
          // so `scoreMove`'s cohesion term can run. `MoveAI.enrichScoreContext`
          // attaches the tier coordination block; the term stays inert when
          // the tier disables `lanceCoordination`. Omitted entirely when no
          // lance context is supplied — the per-unit path is unchanged.
          ...(lanceContext
            ? {
                lanceCentroid: lanceContext.plan.lanceCentroid,
                lancemates: lanceContext.lancemates.filter(
                  (m) => m.unitId !== unit.unitId,
                ),
              }
            : {}),
          // Per `add-ai-objective-awareness` (A3b) design D3: thread the
          // unit's objective role and target hex from the lance plan's
          // objective layer. `MoveAI.enrichScoreContext` attaches the tier
          // objective block; `scoreMove`'s objective term stays inert for a
          // `screen`-role unit or when the tier disables objective
          // awareness. Omitted entirely when the plan carries no objective
          // layer (a `Destroy` scenario or a non-objective-aware tier).
          ...this.objectiveMoveFields(unit.unitId, lanceContext),
          // Per `add-ai-advanced-systems` (A4) design D1–D4: thread the
          // jump-evaluation score, the electronic-warfare context, and the
          // vision context. `MoveAI.enrichScoreContext` attaches the tier
          // advanced block; `scoreMove`'s three advanced terms stay inert
          // when the tier disables `advancedSystems`. Omitted entirely for a
          // non-advanced tier so the per-unit path is byte-identical.
          ...this.advancedMoveFields(
            unit,
            grid,
            capability,
            livingEnemies,
            lanceContext,
            advancedContext,
          ),
        };
      }
    }

    const selectedMove = this.moveAI.selectMove(
      nonStationaryMoves,
      this.random,
      unit,
      ctx,
    );
    if (!selectedMove) {
      return null;
    }

    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: selectedMove.destination,
        facing: selectedMove.facing,
        movementType: selectedMove.movementType,
        mpUsed: selectedMove.mpCost,
        heatGenerated: selectedMove.heatGenerated,
      },
    };
  }

  /**
   * Per `add-ai-coordination-tactics` (A3a) design D2: an optional
   * `lanceContext` threads the focus-fire assignment into the unit's attack
   * decision. When supplied AND the bot's tier enables lance coordination,
   * the unit's target selection is biased toward its assigned target so the
   * lance concentrates fire. The assignment is a bias, not a mandate — when
   * the assigned target is out of the unit's weapons' arc or range, the unit
   * falls back to its own threat-scored pick and no error is raised.
   */
  playAttackPhase(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
    lanceContext?: IAILanceContext,
  ): IAttackEvent | null {
    if (attacker.destroyed) {
      return null;
    }

    const validTargets = this.attackAI.getValidTargets(attacker, allUnits);
    if (validTargets.length === 0) {
      return null;
    }

    // Per `add-ai-objective-awareness` (A3b) design D4: objective-aware
    // target discipline. When the unit holds a `capture` or `hold` objective
    // role, narrow the valid-target set to enemies it can engage WITHOUT
    // leaving its objective hex — enemies within weapon range of the marker.
    // The unit fires from the objective rather than chasing an enemy off it.
    // When no enemy is in-discipline the bias falls through to the full set
    // (a bounded bias, not a hard mandate — design D4 risk note). A
    // `screen`-role unit, a `Destroy` scenario, or a non-objective-aware
    // tier leaves `disciplinedTargets` equal to `validTargets`.
    const disciplinedTargets = this.applyObjectiveTargetDiscipline(
      attacker,
      validTargets,
      lanceContext,
    );

    // Per `improve-bot-basic-combat-competence` task 2.5: pass attacker
    // so the threat-scored selector picks the most threatening target
    // instead of a uniform-random pick. Per `add-ai-resource-planning`
    // (A2): the tier's resource block is threaded so the crit-seeking term
    // applies — inert for `Green`/`Regular`, active for `Veteran`/`Elite`.
    //
    // Per `add-ai-coordination-tactics` (A3a) design D2: when a lance plan
    // is supplied and the tier enables coordination, the unit's assigned
    // focus-fire target overrides the self-scored pick — but only when the
    // assigned target is reachable (in a valid target set and with at least
    // one weapon in arc/range). Otherwise the unit falls back cleanly.
    //
    // The coordinated pick and the self-scored pick both run over the
    // objective-disciplined set so an objective-role unit still concentrates
    // fire with the lance, but only on an in-discipline target.
    const target =
      this.selectCoordinatedTarget(
        attacker,
        disciplinedTargets,
        lanceContext,
      ) ??
      this.attackAI.selectTarget(
        disciplinedTargets,
        this.random,
        attacker,
        this.resource,
      );
    if (!target) {
      return null;
    }

    // Per `add-bot-retreat-behavior` § 6.2: retreating units do NOT torso
    // twist. Suppressing the twist forces `selectWeapons` to filter
    // weapons by the unit's actual forward facing — backward shots are
    // excluded automatically because the arc resolver keys off
    // `attacker.facing + torsoTwist`. Rear-mounted weapons still fire
    // (their `mountingArc === Rear` matches a target in the unit's rear
    // arc), which is the spec-mandated "rear weapons cover the escape
    // vector" behavior. Non-retreating units pass through unchanged.
    const arcAttacker: IAIUnitState = attacker.isRetreating
      ? { ...attacker, torsoTwist: undefined }
      : attacker;

    // Per `improve-bot-basic-combat-competence` task 5: the heat budget.
    // `effectiveSafeHeatThreshold` lowers the ceiling by 2 when the bot is
    // retreating so it stops firing sooner and runs faster.
    const movementHeat = computeMovementHeat(
      attacker.movementType,
      attacker.hexesMoved,
    );
    const baseThreshold = effectiveSafeHeatThreshold(attacker, this.behavior);

    // Per `add-ai-resource-planning` (A2) design D2: plan the fire list with
    // ammo-runway conservation and weapon-mode selection. For the inert
    // `Green`/`Regular` block this is the legacy `selectWeapons` order with
    // every weapon in its default mode — byte-identical to pre-A2.
    const heatHeadroom = Math.max(
      0,
      baseThreshold - attacker.heat - movementHeat,
    );
    const planned = this.attackAI.planFireList(arcAttacker, target, {
      resource: this.resource,
      heatHeadroom,
    });
    if (planned.length === 0) {
      return null;
    }

    // Per `add-ai-resource-planning` (A2) design D1: multi-turn heat
    // projection. `planEffectiveThreshold` projects the heat curve assuming
    // the planned fire list repeats each turn and lowers the budget if a
    // shutdown is predicted. `heatLookaheadTurns: 0` (Green/Regular) returns
    // `baseThreshold` unchanged — the legacy single-turn ceiling.
    const perTurnHeatGenerated =
      movementHeat +
      planned.reduce((sum, entry) => sum + entry.mode.effectiveHeat, 0);
    const effectiveThreshold = planEffectiveThreshold(
      baseThreshold,
      attacker.heat,
      attacker.heatDissipation ?? DEFAULT_HEAT_DISSIPATION,
      perTurnHeatGenerated,
      movementHeat,
      this.resource.heatLookaheadTurns,
    );

    // Per `improve-bot-basic-combat-competence` task 5: the single-turn
    // trim still runs each turn (design D1) — now against the possibly
    // lowered `effectiveThreshold`. `applyHeatBudget` operates on the
    // efficiency-sorted weapon list; the planned modes' heat is folded in
    // via a synthetic weapon list so the trim sees mode-adjusted heat.
    const modeWeapons: readonly IWeapon[] = planned.map((entry) => ({
      ...entry.weapon,
      damage: entry.mode.effectiveDamage,
      heat: entry.mode.effectiveHeat,
    }));
    let trimmed = applyHeatBudget(
      modeWeapons,
      attacker.heat,
      movementHeat,
      effectiveThreshold,
    );
    // Per `add-ai-resource-planning` (A2) scenario "Veteran bot throttles
    // before shutdown": the heat planner culls lower-efficiency weapons, it
    // does not silence the unit — if the planner's lowered budget empties
    // the list but the legacy `baseThreshold` would have kept a weapon, the
    // bot still fires its single best one. Scoped to the planner-over-trim
    // case (`effectiveThreshold < baseThreshold`) so the legacy "trim to
    // nothing returns null" contract is byte-identical when no planner runs.
    if (trimmed.length === 0 && effectiveThreshold < baseThreshold) {
      const legacyTrim = applyHeatBudget(
        modeWeapons,
        attacker.heat,
        movementHeat,
        baseThreshold,
      );
      if (legacyTrim.length > 0) {
        trimmed = [modeWeapons[0]];
      }
    }
    if (trimmed.length === 0) {
      return null;
    }

    // Record the selected firing mode for every multi-mode weapon that
    // survived the trim. Single-mode fire lists carry no `weaponModes` map
    // (pre-A2 shape) — see `collectWeaponModes`.
    const weaponModes = collectWeaponModes(
      planned,
      trimmed.map((w) => w.id),
    );

    return {
      type: GameEventType.AttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: target.unitId,
        weapons: trimmed.map((w) => w.id),
        ...(weaponModes ? { weaponModes } : {}),
      },
    };
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone`: pick the best physical attack
   * for `attacker` against an in-melee-range target. Returns null when:
   *
   *   - attacker is destroyed
   *   - no targets exist
   *   - no living target is within melee range (≤ 1 hex)
   *   - `chooseBestPhysicalAttack` rejects every candidate (e.g.,
   *     destroyed actuators, prone state, etc.)
   *
   * `attackerTonnage`/`pilotingSkill` default to the SimulationRunner
   * stand-ins when the caller doesn't have per-unit catalog data.
   * Caller takes the returned declaration and routes it through
   * `declarePhysicalAttack` to emit the canonical session event.
   */
  playPhysicalAttackPhase(
    attacker: IAIUnitState,
    targets: readonly IAIUnitState[],
    options: {
      attackerTonnage?: number;
      pilotingSkill?: number;
    } = {},
  ): IPhysicalAttackEvent | null {
    if (attacker.destroyed) return null;
    // Per `add-bot-retreat-behavior` § 6.3: retreating units skip
    // physical attacks entirely. The unit is fleeing — even if a
    // melee target is adjacent, declaring a punch/kick would commit
    // the unit to face the target rather than the retreat edge,
    // contradicting the retreat vector. Skip cleanly so the phase
    // resolver continues without emitting `PhysicalAttackDeclared`.
    if (attacker.isRetreating) return null;
    if (targets.length === 0) return null;

    const meleeTargets = targets.filter((target) => {
      if (target.destroyed) return false;
      if (target.unitId === attacker.unitId) return false;
      const dq = target.position.q - attacker.position.q;
      const dr = target.position.r - attacker.position.r;
      const ds = -dq - dr;
      const distance = (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
      return distance <= MELEE_RANGE_HEXES;
    });

    if (meleeTargets.length === 0) return null;

    // Pick the most threatening adjacent target via the same scorer
    // used for ranged combat.
    const target = this.attackAI.selectTarget(
      meleeTargets,
      this.random,
      attacker,
    );
    if (!target) return null;

    const tonnage = options.attackerTonnage ?? DEFAULT_ATTACKER_TONNAGE;
    const piloting = options.pilotingSkill ?? DEFAULT_PILOTING_SKILL;

    const bestAttack = chooseBestPhysicalAttack(
      tonnage,
      piloting,
      {
        engineHits: 0,
        gyroHits: 0,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
      {
        attackerProne: false,
        heat: attacker.heat,
        weaponsFiredFromLeftArm: [],
        weaponsFiredFromRightArm: [],
      },
    );

    if (!bestAttack) return null;

    return {
      type: GameEventType.PhysicalAttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: target.unitId,
        attackType: bestAttack,
      },
    };
  }

  /**
   * Per `add-ai-coordination-tactics` (A3a) design D2: resolve the unit's
   * focus-fire assignment from the lance plan, returning the assigned target
   * ONLY when the assignment can actually be honored — the tier enables
   * coordination, an assignment exists for this unit, the assigned target is
   * in the unit's valid-target set, and the unit has at least one weapon in
   * arc and range of it.
   *
   * Returns `null` in every other case so `playAttackPhase` falls back to
   * the unit's own threat-scored pick — the spec's "unreachable assignment
   * falls back cleanly" contract. Consumes no `SeededRandom`: the
   * coordinated pick is fully deterministic, and when this returns `null`
   * the fallback `selectTarget` draws exactly as the per-unit path does.
   */
  private selectCoordinatedTarget(
    attacker: IAIUnitState,
    validTargets: readonly IAIUnitState[],
    lanceContext?: IAILanceContext,
  ): IAIUnitState | null {
    if (!lanceContext) return null;
    if (!this.coordination.lanceCoordination) return null;

    const assignedId = lanceContext.plan.fireAssignment.assignments.get(
      attacker.unitId,
    );
    if (!assignedId) return null;

    const assigned = validTargets.find((t) => t.unitId === assignedId);
    if (!assigned) return null;

    // The assignment is a bias, not a mandate (design D2): honor it only
    // when the unit can actually shoot the assigned target. `selectWeapons`
    // applies the arc + range + minRange filters — an empty result means
    // the target is out of arc/range, so we fall back to the self-scored
    // pick rather than declaring an attack with no weapons.
    const firingList = this.attackAI.selectWeapons(attacker, assigned);
    if (firingList.length === 0) return null;

    return assigned;
  }

  /**
   * Per `add-ai-objective-awareness` (A3b) design D3: resolve the objective
   * movement fields for a unit from the lance plan's objective layer.
   *
   * Returns `{ objectiveRole, objectiveHex }` when the lance plan carries an
   * objective layer that assigns this unit a `capture` or `hold` role — the
   * fields `MoveAI.scoreMove`'s objective term consumes. Returns `{}` (no
   * fields) when there is no objective plan (a `Destroy` scenario or a
   * non-objective-aware tier), or when the unit is a `screen`-role unit with
   * no objective hex — so `scoreMove`'s objective term stays inert and the
   * unit plays pure A3a movement.
   */
  private objectiveMoveFields(
    unitId: string,
    lanceContext?: IAILanceContext,
  ): Partial<Pick<IScoreMoveContext, 'objectiveRole' | 'objectiveHex'>> {
    const objectivePlan = lanceContext?.plan.objectivePlan;
    if (!objectivePlan) return {};

    const role = objectivePlan.roles.get(unitId);
    if (!role || role === 'screen') return {};

    const hex = objectivePlan.targetHexes.get(unitId);
    if (!hex) return {};

    return { objectiveRole: role, objectiveHex: hex };
  }

  /**
   * Per `add-ai-objective-awareness` (A3b) design D3: `true` when `unit`
   * holds a `capture` or `hold` objective role AND is already standing on
   * its objective hex. Such a unit must stay planted — any move forfeits the
   * marker. `playMovementPhase` returns `null` (no movement) in that case so
   * the unit keeps control of the objective.
   *
   * Returns `false` for a `screen`-role unit, a unit off its objective hex
   * (it still needs to move toward it), a `Destroy` scenario, or a
   * non-objective-aware tier (no `objectivePlan`) — every such unit moves
   * exactly as the A3a bot does.
   */
  private shouldHoldObjectiveHex(
    unit: IAIUnitState,
    lanceContext?: IAILanceContext,
  ): boolean {
    const objectivePlan = lanceContext?.plan.objectivePlan;
    if (!objectivePlan) return false;

    const role = objectivePlan.roles.get(unit.unitId);
    if (role !== 'capture' && role !== 'hold') return false;

    const hex = objectivePlan.targetHexes.get(unit.unitId);
    if (!hex) return false;

    return unit.position.q === hex.q && unit.position.r === hex.r;
  }

  /**
   * Per `add-ai-objective-awareness` (A3b) design D4: objective-aware target
   * discipline. When `attacker` holds a `capture` or `hold` objective role,
   * restrict its valid-target set to enemies it can engage from its
   * objective hex — enemies within the unit's longest live-weapon range of
   * the marker. The unit fires from the objective rather than pursuing an
   * enemy off it.
   *
   * The discipline is a bounded bias, not a hard mandate (design D4 risk
   * note): when NO enemy is engageable from the objective hex the full
   * `validTargets` set is returned unchanged, so the unit still fires its
   * best available shot rather than going silent. A `screen`-role unit, a
   * `Destroy` scenario, or a non-objective-aware tier (no `objectivePlan`)
   * also returns `validTargets` unchanged — target selection is identical to
   * the A3a coordinated-combat behavior.
   *
   * Pure with respect to RNG — consumes no `SeededRandom`.
   */
  private applyObjectiveTargetDiscipline(
    attacker: IAIUnitState,
    validTargets: readonly IAIUnitState[],
    lanceContext?: IAILanceContext,
  ): readonly IAIUnitState[] {
    const objectivePlan = lanceContext?.plan.objectivePlan;
    if (!objectivePlan) return validTargets;

    const role = objectivePlan.roles.get(attacker.unitId);
    if (!role || role === 'screen') return validTargets;

    const hex = objectivePlan.targetHexes.get(attacker.unitId);
    if (!hex) return validTargets;

    // Longest live-weapon range — the reach the unit has standing on the
    // objective hex. A unit with no live weapons cannot discipline-filter.
    let maxRange = 0;
    for (const weapon of attacker.weapons) {
      if (weapon.destroyed) continue;
      const range = weapon.extremeRange ?? weapon.longRange;
      if (range > maxRange) maxRange = range;
    }
    if (maxRange <= 0) return validTargets;

    const inDiscipline = validTargets.filter(
      (target) => cubeHexDistance(hex, target.position) <= maxRange,
    );
    // Bounded bias: only narrow when at least one enemy is engageable from
    // the objective; otherwise keep the full set so the unit still fires.
    return inDiscipline.length > 0 ? inDiscipline : validTargets;
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone`: when the unit is retreating
   * we override the random walk/run/jump pick to call
   * `retreatMovementType`, which prefers Run, falls back to Walk, and
   * NEVER selects Jump. Otherwise the legacy behavior is preserved
   * (20% jump when available, then 60/40 run/walk).
   *
   * Per `add-ai-advanced-systems` (A4) design D1 / D6: when the bot's tier
   * enables advanced systems, the flat 20% jump roll is replaced by a
   * deterministic jump-tactics gate — `AIJumpTactics.evaluateJump` scores
   * the unit's best jump destination, and Jump is chosen only when that
   * score clears `JUMP_TACTICS_THRESHOLD`. This is a *deterministic*
   * decision: it consumes no `SeededRandom`. The legacy random roll is kept
   * for every non-advanced tier (`Green` / `Regular` / `Veteran`), so the
   * SimulationRunner golden traces — pinned to those tiers — see byte-
   * identical RNG consumption (design D6).
   *
   * `grid` and `enemies` are consulted only on the advanced-tier jump-gate
   * path; the non-advanced path ignores them entirely.
   */
  private selectMovementType(
    unit: IAIUnitState,
    capability: IMovementCapability,
    grid: IHexGrid,
    enemies: readonly IAIUnitState[],
  ): MovementType {
    if (capability.walkMP === 0 && capability.jumpMP === 0) {
      return MovementType.Stationary;
    }

    if (unit.isRetreating) {
      const choice = retreatMovementType({
        walkAvailable: capability.walkMP > 0,
        runAvailable: capability.runMP > 0,
      });
      switch (choice) {
        case 'run':
          return MovementType.Run;
        case 'walk':
          return MovementType.Walk;
        case 'stationary':
        default:
          return MovementType.Stationary;
      }
    }

    // Per A4 design D1: advanced-tier jump-tactics gate. Deterministic — no
    // `SeededRandom` draw. Jump is chosen only when a jump destination's
    // tactical score (terrain-clearing / elevation / charge-escape, net of
    // heat safety) clears the threshold. A heat-unsafe jump drives the score
    // deep negative, so it never clears the gate on heat grounds alone
    // (spec scenario "Heat-unsafe jump is rejected").
    if (this.advanced.advancedSystems && capability.jumpMP > 0) {
      const evaluation = evaluateJump(unit, grid, capability, enemies, {
        heatDissipation: unit.heatDissipation,
        heatLookaheadTurns: this.resource.heatLookaheadTurns,
      });
      if (evaluation.bestJumpScore >= JUMP_TACTICS_THRESHOLD) {
        return MovementType.Jump;
      }
      // The jump did not clear the gate — fall through to the walk/run pick.
      // The advanced tier still draws ONE `next()` for the run/walk split so
      // the 60/40 instinct is preserved; only the jump *decision* is
      // deterministic, not the run-vs-walk one.
      const runWalkRoll = this.random.next();
      return runWalkRoll < 0.6 ? MovementType.Run : MovementType.Walk;
    }

    const roll = this.random.next();
    if (capability.jumpMP > 0 && roll < 0.2) {
      return MovementType.Jump;
    }
    if (roll < 0.6) {
      return MovementType.Run;
    }
    return MovementType.Walk;
  }

  /**
   * Per `add-ai-advanced-systems` (A4) design D1–D4: assemble the advanced
   * move-scoring fields for a unit — the jump-evaluation score, the
   * electronic-warfare context, and the vision context.
   *
   * Returns `{}` (no fields) when the bot's tier disables advanced systems,
   * so `scoreMove`'s three advanced terms stay inert and the unit plays pure
   * A1/A2/A3a/A3b movement — byte-identical to the pre-A4 bot.
   *
   * When advanced systems are enabled:
   *   - `jumpEvaluationScore` is computed once via `AIJumpTactics.evaluateJump`
   *     and applied (in `scoreMove`) to jump moves only.
   *   - `electronicWarfare` is threaded only when the caller supplied an
   *     `advancedContext` carrying the live EW snapshot — the advisor reads
   *     it, never writes it.
   *   - `vision` is derived from the grid and the enemy set — the advisor
   *     models spotting with the same LOS + sensor-range primitives the
   *     fog-of-war module uses.
   *
   * Pure with respect to RNG — consumes no `SeededRandom`.
   */
  private advancedMoveFields(
    unit: IAIUnitState,
    grid: IHexGrid,
    capability: IMovementCapability,
    livingEnemies: readonly IAIUnitState[],
    lanceContext?: IAILanceContext,
    advancedContext?: IAIAdvancedContext,
  ): Partial<
    Pick<
      IScoreMoveContext,
      'jumpEvaluationScore' | 'electronicWarfare' | 'vision'
    >
  > {
    if (!this.advanced.advancedSystems) {
      return {};
    }

    const lancemates = lanceContext
      ? lanceContext.lancemates.filter((m) => m.unitId !== unit.unitId)
      : [];

    // Jump-tactics score — the net tactical value of the unit's best jump
    // destination, precomputed once. `scoreMove` weights it on jump moves.
    const jumpEvaluation = evaluateJump(unit, grid, capability, livingEnemies, {
      heatDissipation: unit.heatDissipation,
      heatLookaheadTurns: this.resource.heatLookaheadTurns,
    });

    // Vision context — derived from the grid and the enemy set. The advisor
    // values scouting unspotted enemies and breaking enemy spotting lines.
    const vision: IVisionContext = {
      grid,
      enemies: livingEnemies,
      lancemates,
    };

    // Electronic-warfare context — threaded only when the caller supplied a
    // live EW snapshot. Without it the ECM term has no state to read and is
    // simply omitted (it stays inert).
    const electronicWarfare: IElectronicWarfareContext | undefined =
      advancedContext
        ? {
            movingUnitTeamId: advancedContext.movingUnitTeamId,
            ewState: advancedContext.ewState,
            lancemates,
          }
        : undefined;

    return {
      jumpEvaluationScore: jumpEvaluation.bestJumpScore,
      vision,
      ...(electronicWarfare ? { electronicWarfare } : {}),
    };
  }
}

/**
 * Per `add-ai-advanced-systems` (A4) design D2: the advanced-systems context
 * a caller threads into `playMovementPhase` so the ECM advisor has live
 * electronic-warfare state to read.
 *
 * The vision advisor needs no extra context — it is derived from the grid
 * and enemy set already passed to `playMovementPhase`. The EW advisor, by
 * contrast, needs the live `IElectronicWarfareState` snapshot and the moving
 * unit's team id, neither of which is on `IAIUnitState` — hence this carrier.
 *
 * Omitting `advancedContext` (or running a non-advanced tier) leaves the ECM
 * term inert; the bot plays pure A1/A2/A3a/A3b movement.
 */
export interface IAIAdvancedContext {
  /** The team id of the moving unit — keys friendly vs. hostile EW sources. */
  readonly movingUnitTeamId: string;
  /** The live electronic-warfare snapshot. Read-only — never mutated. */
  readonly ewState: IElectronicWarfareState;
}

/**
 * Per `add-ai-advanced-systems` (A4) design D1 / open question: the jump-
 * tactics threshold. On an advanced tier the bot chooses Jump only when its
 * best jump destination's net tactical score clears this value. Sized at
 * elevation-gain scale (`ELEVATION_GAIN_PER_LEVEL = 150`) so a single level
 * of elevation gain, a charge escape, or ~2 MP of skipped terrain is enough
 * to commit to a jump — but an aimless jump over open ground (score `0`)
 * never clears it. Revisit after swarm-harness tuning.
 */
const JUMP_TACTICS_THRESHOLD = 150;

/**
 * Per `add-bot-retreat-behavior` § 2 (Trigger A) + `wire-bot-ai-helpers-and-capstone`:
 * structural-loss + vital-crit signals derived from session state.
 *
 * Structural ratio is the SPEC-MANDATED points-of-internal-structure ratio
 * `sum(starting - current) / sum(starting)` — NOT the legacy
 * count-of-destroyed-locations ratio. The previous implementation used
 * the location-count flavor, which fired only after entire locations
 * were torn off (much later than the spec intended). This implementation
 * matches MegaMek's `Mek.isCrippled` semantics: once accumulated
 * internal-structure damage crosses the threshold, the unit retreats.
 *
 * When `startingStructure` is empty (legacy callers / pre-bootstrap
 * units), ratio falls back to 0 — only the crit trigger can fire.
 *
 * Exported (file-scope helper) so unit tests can pin the math without
 * standing up a full BotPlayer instance.
 */
function computeRetreatSignals(
  unitId: string,
  session: IGameSession,
  currentStructure: Readonly<Record<string, number>>,
  startingStructure: Readonly<Record<string, number>>,
): { ratio: number; hasVitalCrit: boolean } {
  // Sum starting + current internal structure points across all known
  // starting-structure locations. Locations missing from startingStructure
  // are skipped (they were never seeded — pre-damage units in non-CompendiumAdapter
  // wiring paths). Locations present in startingStructure but missing
  // from currentStructure default to 0 (location obliterated).
  let sumStarting = 0;
  let sumCurrent = 0;
  for (const [location, starting] of Object.entries(startingStructure)) {
    if (typeof starting !== 'number') continue;
    sumStarting += starting;
    const current = currentStructure[location];
    sumCurrent += typeof current === 'number' ? current : 0;
  }
  const ratio = sumStarting > 0 ? (sumStarting - sumCurrent) / sumStarting : 0;

  let hasVitalCrit = false;
  for (const event of session.events) {
    if (event.type !== GameEventType.ComponentDestroyed) continue;
    const payload = event.payload as IComponentDestroyedPayload;
    if (payload.unitId !== unitId) continue;
    if (VITAL_COMPONENT_TYPES.has(payload.componentType)) {
      hasVitalCrit = true;
      break;
    }
  }

  return { ratio, hasVitalCrit };
}

/**
 * Per `add-ai-objective-awareness` (A3b): cube-coordinate hex distance
 * between two axial coordinates. Mirrors the inline distance math in
 * `playPhysicalAttackPhase` — kept local so `BotPlayer` stays free of a
 * `hexMath` import dependency. Pure function.
 */
function cubeHexDistance(a: IHexCoordinate, b: IHexCoordinate): number {
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: heat budget projection needs
 * the movement heat the unit has already committed to this turn. We
 * mirror `calculateMovementHeat` from `utils/gameplay/movement` rather
 * than importing it to keep the BotPlayer module free of grid /
 * hex utility deps. Behavior must stay in sync with that helper.
 */
function computeMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Evade:
      return 4;
    case MovementType.Jump:
      return Math.max(hexesMoved, 3);
    default:
      return 0;
  }
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: re-export the phase enum and
 * vital-component constants so test suites can assert on them without
 * reaching into the private internals.
 */
export const __testing__ = {
  computeRetreatSignals,
  computeMovementHeat,
  VITAL_COMPONENT_TYPES,
  GamePhase,
};
