import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { roll2d6 } from '@/utils/gameplay/diceTypes';
import {
  canUseEdge,
  type EdgeTriggerType,
  type IEdgeState,
  useEdge as consumeEdgePoint,
} from '@/utils/gameplay/spaModifiers';

import type { IMovementEnhancementCheck } from './movementEnhancementPlan';

import {
  MASC_FAILURE_LEG_CRITICAL_LOCATIONS,
  type MascFailureLeg,
  superchargerEngineHitsFromRoll,
} from './movementEnhancementFailure';

const EDGE_TRIGGER = 'edge_when_masc_fails' satisfies EdgeTriggerType;

/** The unit's Edge, when it can reroll a failed booster check. */
export interface IEdgeBudget {
  readonly abilities: readonly string[];
  readonly pointsRemaining: number;
  readonly turn: number;
  readonly unitId: string;
}

/** One 2d6 attempt. The two dice are recorded so a log never needs to re-draw. */
export interface IEnhancementAttempt {
  readonly dice: readonly [number, number];
  /** The dice total. */
  readonly roll: number;
  /** The total with the check's roll modifier; the check fails when it is below the target. */
  readonly modifiedRoll: number;
  readonly passed: boolean;
  /** A failed attempt that an Edge reroll replaced. */
  readonly edgeSuperseded?: true;
  /** The replacement roll made by spending Edge. */
  readonly edgeReroll?: true;
}

/** What a failed check does. Slot selection is the caller's job (see below). */
export interface IMovementEnhancementFailureEffects {
  /** MASC: one critical slot in each of these legs, whatever any roll said. */
  readonly legCrits: readonly MascFailureLeg[];
  /** Supercharger: engine critical slots, from the hits roll. */
  readonly engineHits: number;
  /** Supercharger only: the 2d6 hits roll. MASC never draws one. */
  readonly failureHitsRoll?: number;
  /** The Supercharger is destroyed even when the hits roll gave no engine hit. */
  readonly destroyEnhancement: boolean;
}

export interface IMovementEnhancementResolution {
  readonly check: IMovementEnhancementCheck;
  /** One attempt, or two when Edge was spent; the last one decides. */
  readonly attempts: readonly IEnhancementAttempt[];
  readonly passed: boolean;
  /** Edge points left after this check; `undefined` when no budget was given. */
  readonly edgePointsRemaining: number | undefined;
  readonly failure?: IMovementEnhancementFailureEffects;
}

/**
 * Resolve one check. MegaMek 48fcb2f64: 2d6, a failure when the (modified)
 * roll is below the target (`Entity.java` L16526-L16560); Edge
 * (`edge_when_masc_fails`) spends a point and rerolls once
 * (`TWGameManager.java` L6568-L6678); a final failure takes effect
 * (`Entity.java` L16570-L16631).
 *
 * Draw order, fixed here and so by the log: dice a, b; on a failure with Edge,
 * dice a', b'; on a final Supercharger failure the hits dice. MASC draws no
 * hits roll: the pin rolls it and ignores it, so MekStation omits a draw with
 * no outcome. The per-leg and engine slot rolls come after this, from the
 * shared critical-hit helpers the caller already uses; this function returns
 * which legs and how many engine hits, not which slots.
 *
 * The roller is required and has no default. `roll2d6` falls back to
 * `Math.random` when handed `undefined`, so the check is explicit.
 */
export function resolveMovementEnhancementCheck(options: {
  readonly check: IMovementEnhancementCheck;
  readonly roller: D6Roller;
  readonly edge?: IEdgeBudget;
}): IMovementEnhancementResolution {
  const { check, edge, roller } = options;
  if (typeof roller !== 'function') {
    throw new TypeError('A MASC/Supercharger check needs an injected roller');
  }

  const first = attempt(check, roller);
  let attempts: readonly IEnhancementAttempt[] = [first];
  let edgePointsRemaining = edge?.pointsRemaining;

  if (!first.passed && edge && canSpendEdge(edge)) {
    edgePointsRemaining = spendEdge(edge, check);
    attempts = [
      { ...first, edgeSuperseded: true },
      { ...attempt(check, roller), edgeReroll: true },
    ];
  }

  const decisive = attempts[attempts.length - 1];
  if (decisive.passed) {
    return { check, attempts, passed: true, edgePointsRemaining };
  }
  return {
    check,
    attempts,
    passed: false,
    edgePointsRemaining,
    failure: failureEffects(check, roller),
  };
}

/**
 * Resolve the planned checks in order. A failure ends the sequence: the
 * Supercharger check is skipped after a MASC failure (`MovePathHandler.java`
 * L2467-L2468, `||`). Edge points are shared across the checks.
 */
export function resolveMovementEnhancementChecks(options: {
  readonly checks: readonly IMovementEnhancementCheck[];
  readonly roller: D6Roller;
  readonly edge?: IEdgeBudget;
}): {
  readonly resolutions: readonly IMovementEnhancementResolution[];
  readonly passed: boolean;
  readonly edgePointsRemaining: number | undefined;
} {
  const resolutions: IMovementEnhancementResolution[] = [];
  let edgePointsRemaining = options.edge?.pointsRemaining;

  for (const check of options.checks) {
    const resolution = resolveMovementEnhancementCheck({
      check,
      roller: options.roller,
      edge: options.edge && {
        ...options.edge,
        pointsRemaining: edgePointsRemaining ?? options.edge.pointsRemaining,
      },
    });
    resolutions.push(resolution);
    edgePointsRemaining = resolution.edgePointsRemaining;
    if (!resolution.passed) {
      return { resolutions, passed: false, edgePointsRemaining };
    }
  }
  return { resolutions, passed: true, edgePointsRemaining };
}

function attempt(
  check: IMovementEnhancementCheck,
  roller: D6Roller,
): IEnhancementAttempt {
  const rolled = roll2d6(roller);
  const modifiedRoll = rolled.total + check.rollModifier;
  return {
    dice: [rolled.dice[0], rolled.dice[1]],
    roll: rolled.total,
    modifiedRoll,
    passed: modifiedRoll >= check.targetNumber,
  };
}

function failureEffects(
  check: IMovementEnhancementCheck,
  roller: D6Roller,
): IMovementEnhancementFailureEffects {
  if (check.enhancement === 'MASC') {
    return {
      legCrits: MASC_FAILURE_LEG_CRITICAL_LOCATIONS,
      engineHits: 0,
      destroyEnhancement: false,
    };
  }
  const failureHitsRoll = roll2d6(roller).total;
  return {
    legCrits: [],
    engineHits: superchargerEngineHitsFromRoll(failureHitsRoll),
    failureHitsRoll,
    destroyEnhancement: true,
  };
}

function edgeState(points: number): IEdgeState {
  return { maxPoints: points, remainingPoints: points, usageHistory: [] };
}

function canSpendEdge(edge: IEdgeBudget): boolean {
  return (
    edge.abilities.includes(EDGE_TRIGGER) &&
    canUseEdge(edgeState(edge.pointsRemaining), EDGE_TRIGGER)
  );
}

function spendEdge(
  edge: IEdgeBudget,
  check: IMovementEnhancementCheck,
): number {
  return consumeEdgePoint(
    edgeState(edge.pointsRemaining),
    EDGE_TRIGGER,
    edge.turn,
    edge.unitId,
    `${check.enhancement} failure reroll`,
  ).remainingPoints;
}
