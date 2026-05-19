import type {
  IComponentDestroyedPayload,
  IGameSession,
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
} from '@/types/gameplay';

import { GameEventType, GamePhase, MovementType } from '@/types/gameplay';
import { chooseBestPhysicalAttack } from '@/utils/gameplay/physicalAttacks';

import type { SeededRandom } from '../core/SeededRandom';
import type {
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from './AIPlayerEvents';
import type { IAIPlayer } from './IAIPlayer';
import type { IBotBehavior, IAIUnitState, IMove, IWeapon } from './types';

import { planEffectiveThreshold } from './AIHeatPlanner';
import {
  type IAITierResourceParameters,
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

  constructor(random: SeededRandom, behavior: IBotBehavior = DEFAULT_BEHAVIOR) {
    this.random = random;
    this.behavior = behavior;
    this.moveAI = new MoveAI(behavior);
    this.attackAI = new AttackAI();
    this.resource = resolveResourceParameters(
      resolveTierParameters(behavior.tier),
    );
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
   * random pick, or retreat scoring when retreating). Once every
   * caller is updated, this can be made required.
   */
  playMovementPhase(
    unit: IAIUnitState,
    grid: IHexGrid,
    capability: IMovementCapability,
    allUnits?: readonly IAIUnitState[],
  ): IMovementEvent | null {
    if (unit.destroyed) {
      return null;
    }

    const position: IUnitPosition = {
      unitId: unit.unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: false,
    };

    const movementType = this.selectMovementType(unit, capability);
    const moves = this.moveAI.getValidMoves(
      grid,
      position,
      movementType,
      capability,
    );

    const nonStationaryMoves = moves.filter(
      (m: IMove) =>
        m.destination.q !== unit.position.q ||
        m.destination.r !== unit.position.r,
    );

    if (nonStationaryMoves.length === 0) {
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

  playAttackPhase(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
  ): IAttackEvent | null {
    if (attacker.destroyed) {
      return null;
    }

    const validTargets = this.attackAI.getValidTargets(attacker, allUnits);
    if (validTargets.length === 0) {
      return null;
    }

    // Per `improve-bot-basic-combat-competence` task 2.5: pass attacker
    // so the threat-scored selector picks the most threatening target
    // instead of a uniform-random pick. Per `add-ai-resource-planning`
    // (A2): the tier's resource block is threaded so the crit-seeking term
    // applies — inert for `Green`/`Regular`, active for `Veteran`/`Elite`.
    const target = this.attackAI.selectTarget(
      validTargets,
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
   * Per `wire-bot-ai-helpers-and-capstone`: when the unit is retreating
   * we override the random walk/run/jump pick to call
   * `retreatMovementType`, which prefers Run, falls back to Walk, and
   * NEVER selects Jump. Otherwise the legacy behavior is preserved
   * (20% jump when available, then 60/40 run/walk).
   */
  private selectMovementType(
    unit: IAIUnitState,
    capability: IMovementCapability,
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

    const roll = this.random.next();
    if (capability.jumpMP > 0 && roll < 0.2) {
      return MovementType.Jump;
    }
    if (roll < 0.6) {
      return MovementType.Run;
    }
    return MovementType.Walk;
  }
}

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
