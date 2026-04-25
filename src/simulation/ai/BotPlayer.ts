import type {
  IComponentDestroyedPayload,
  IGameSession,
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
} from '@/types/gameplay';

import { GameEventType, GamePhase, MovementType } from '@/types/gameplay';
import {
  chooseBestPhysicalAttack,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import type { SeededRandom } from '../core/SeededRandom';
import type { IBotBehavior, IAIUnitState, IMove, IWeapon } from './types';

import { AttackAI, applyHeatBudget, scoreTarget } from './AttackAI';
import { MoveAI, type IScoreMoveContext } from './MoveAI';
import {
  effectiveSafeHeatThreshold,
  resolveEdge,
  retreatMovementType,
  shouldRetreat,
} from './RetreatAI';
import { DEFAULT_BEHAVIOR } from './types';

export interface IMovementEvent {
  type: GameEventType.MovementDeclared;
  payload: {
    unitId: string;
    from: { q: number; r: number };
    to: { q: number; r: number };
    facing: number;
    movementType: MovementType;
    mpUsed: number;
    heatGenerated: number;
  };
}

export interface IAttackEvent {
  type: GameEventType.AttackDeclared;
  payload: {
    attackerId: string;
    targetId: string;
    weapons: readonly string[];
  };
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: bot's emitted retreat trigger.
 * Returned from `evaluateRetreat`; callers (InteractiveSession,
 * GameEngine.phases) append it to the session before calling the
 * movement / attack phases so subsequent move scoring sees `isRetreating`.
 */
export interface IRetreatEvent {
  type: GameEventType.RetreatTriggered;
  payload: {
    unitId: string;
    edge: 'north' | 'south' | 'east' | 'west';
    reason: 'structural_threshold' | 'vital_crit';
  };
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: physical attack declaration
 * the bot emits during the PhysicalAttack phase. Caller routes this
 * through `declarePhysicalAttack` to produce the canonical session
 * event (which includes the to-hit number computed inside the resolver).
 */
export interface IPhysicalAttackEvent {
  type: GameEventType.PhysicalAttackDeclared;
  payload: {
    attackerId: string;
    targetId: string;
    attackType: PhysicalAttackType;
  };
}

export type BotGameEvent =
  | IMovementEvent
  | IAttackEvent
  | IRetreatEvent
  | IPhysicalAttackEvent;

/** Vital component types whose destruction triggers a retreat per spec § 2. */
const VITAL_COMPONENT_TYPES = new Set(['cockpit', 'engine', 'gyro']);

/** Default attacker tonnage when caller doesn't supply per-unit data. */
const DEFAULT_ATTACKER_TONNAGE = 65;
/** Default piloting skill for physical-attack to-hit when not supplied. */
const DEFAULT_PILOTING_SKILL = 5;
/** Melee range in hexes — punches/kicks/charges all need adjacency. */
const MELEE_RANGE_HEXES = 1;

export class BotPlayer {
  private readonly moveAI: MoveAI;
  private readonly attackAI: AttackAI;
  private readonly random: SeededRandom;
  private readonly behavior: IBotBehavior;

  constructor(random: SeededRandom, behavior: IBotBehavior = DEFAULT_BEHAVIOR) {
    this.random = random;
    this.behavior = behavior;
    this.moveAI = new MoveAI(behavior);
    this.attackAI = new AttackAI();
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
    // instead of a uniform-random pick.
    const target = this.attackAI.selectTarget(
      validTargets,
      this.random,
      attacker,
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
    const candidateWeapons = this.attackAI.selectWeapons(arcAttacker, target);
    if (candidateWeapons.length === 0) {
      return null;
    }

    // Per `improve-bot-basic-combat-competence` task 5: trim the fire
    // list against the heat budget. `effectiveSafeHeatThreshold` lowers
    // the ceiling by 2 when the bot is retreating so it stops firing
    // sooner and runs faster.
    const movementHeat = computeMovementHeat(
      attacker.movementType,
      attacker.hexesMoved,
    );
    const threshold = effectiveSafeHeatThreshold(attacker, this.behavior);
    const weapons: readonly IWeapon[] = applyHeatBudget(
      candidateWeapons,
      attacker.heat,
      movementHeat,
      threshold,
    );
    if (weapons.length === 0) {
      return null;
    }

    return {
      type: GameEventType.AttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: target.unitId,
        weapons: weapons.map((w) => w.id),
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
