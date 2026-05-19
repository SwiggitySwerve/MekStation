/**
 * Per-lance turn planner for AI coordination tactics.
 *
 * Per `add-ai-coordination-tactics` design D4: `planTurn` runs once per side
 * per turn. It builds the lance-wide threat map (D1), the focus-fire
 * assignment (D2), and the lance centroid for movement cohesion (D3), and
 * returns them as a single immutable `ILanceTurnPlan`.
 *
 * Each unit's existing per-unit move/attack decision then runs *within* this
 * plan — `BotPlayer` reads the plan rather than recomputing per unit. The
 * plan is a pure deterministic function of the unit set and consumes no
 * `SeededRandom` (design D6), so a `SimulationRunner` seed sequence is
 * unaffected by whether the planner ran.
 *
 * @spec openspec/changes/add-ai-coordination-tactics/specs/simulation-system/spec.md
 *   Requirement: Per-Lance Turn Plan
 */

import type { IGameSession, IHexCoordinate } from '@/types/gameplay';
import type { GameSide } from '@/types/gameplay';

import type { IFireAssignment } from './AIFireCoordinator';
import type {
  IObjectiveLancePlan,
  ObjectiveCostFn,
} from './AIObjectivePlanner';
import type { IThreatEntry } from './AIThreatMap';
import type { IAIUnitState } from './types';

import { coordinateFire } from './AIFireCoordinator';
import { planObjectives } from './AIObjectivePlanner';
import { buildThreatMap } from './AIThreatMap';

/**
 * The immutable per-turn lance plan — the shared threat picture, the
 * focus-fire assignment, and the lance centroid. Produced once per side per
 * turn by `planTurn` and threaded into every unit's move/attack decision.
 */
export interface ILanceTurnPlan {
  /** Lance-wide ranked threat list (`AIThreatMap.buildThreatMap`). */
  readonly threatMap: readonly IThreatEntry[];
  /** Focus-fire assignment (`AIFireCoordinator.coordinateFire`). */
  readonly fireAssignment: IFireAssignment;
  /** Rounded centroid of the living friendly lance, for movement cohesion. */
  readonly lanceCentroid: IHexCoordinate;
  /**
   * Per `add-ai-objective-awareness` (A3b) design D2: the optional objective
   * layer. Present only when `planTurn` is called with the objective inputs
   * AND the bot's tier enables objective awareness AND the scenario is not
   * `Destroy`. When absent, the lance plays pure A3a coordinated combat —
   * every A3a plan built before A3b is unchanged (the field is optional).
   */
  readonly objectivePlan?: IObjectiveLancePlan;
}

/**
 * Per `add-ai-objective-awareness` (A3b) design D2: the optional objective
 * context a caller threads into `planTurn` so the lance plan gains its
 * objective layer.
 *
 *   - `session` is the live game session — `classifyObjectives` reads its
 *     `currentState.objectives` map and the scenario objective type.
 *   - `botSide` is the side the bot is playing; it decides whether each
 *     marker is a `take` / `hold` / `deny` objective.
 *   - `costFn` measures how far a friendly unit is from an objective hex —
 *     production callers pass a terrain-cost pathfinder probe so the closest
 *     unit by real movement cost gets the capture role.
 *
 * When this context is omitted, `planTurn` returns a plain A3a plan with no
 * `objectivePlan` — every existing A3a caller is unchanged.
 */
export interface IObjectivePlanInput {
  readonly session: IGameSession;
  readonly botSide: GameSide;
  readonly costFn: ObjectiveCostFn;
}

/**
 * Per `add-ai-coordination-tactics` design D4: the optional lance context a
 * caller threads into `BotPlayer.playMovementPhase` / `playAttackPhase` so a
 * unit's per-unit decision runs *within* the shared lance plan.
 *
 *   - `plan` is the immutable `ILanceTurnPlan` from `planTurn`, computed once
 *     per side per turn.
 *   - `lancemates` are the friendly lance units (the planner's `friendly`
 *     set, the moving unit itself optionally included — the consumers filter
 *     it out by id). Used by the movement cohesion term's lone-advance
 *     penalty.
 *
 * When this context is omitted, `BotPlayer` runs the pre-change per-unit
 * decisions identically (design D4 / spec scenario "Omitting the lance
 * context preserves per-unit behavior").
 */
export interface IAILanceContext {
  readonly plan: ILanceTurnPlan;
  readonly lancemates: readonly IAIUnitState[];
}

/**
 * Compute the centroid (mean position) of the living friendly lance, rounded
 * to the nearest hex via cube-coordinate rounding so the result is a valid
 * lattice point.
 *
 * Cube rounding is the canonical way to snap a fractional axial coordinate to
 * a hex: convert axial -> cube, round each cube component, then repair the
 * component with the largest rounding error so the `x + y + z === 0`
 * invariant holds. An empty lance yields the origin — a harmless default the
 * cohesion term treats as "no centroid pull".
 *
 * Pure function — deterministic for a given unit set, order-independent
 * (summation is commutative).
 */
export function computeLanceCentroid(
  friendly: readonly IAIUnitState[],
): IHexCoordinate {
  const living = friendly.filter((u) => !u.destroyed);
  if (living.length === 0) {
    return { q: 0, r: 0 };
  }

  let sumQ = 0;
  let sumR = 0;
  for (const unit of living) {
    sumQ += unit.position.q;
    sumR += unit.position.r;
  }
  const meanQ = sumQ / living.length;
  const meanR = sumR / living.length;

  // Axial -> cube, round, repair the largest-error component.
  const x = meanQ;
  const z = meanR;
  const y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);

  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  // Cube -> axial: q = x, r = z.
  return { q: rx, r: rz };
}

/**
 * Build the per-lance turn plan.
 *
 * Runs once per side at the start of the turn:
 *   - `threatMap` — `buildThreatMap(friendly, enemies)`.
 *   - `fireAssignment` — `coordinateFire(friendly, enemies, threatMap)`.
 *   - `lanceCentroid` — `computeLanceCentroid(friendly)`.
 *
 * Per `add-ai-objective-awareness` (A3b) design D2: when `objectiveInput` is
 * supplied, the plan also carries an `objectivePlan` — `planObjectives`
 * classifies the session's objective map for the bot's side and assigns each
 * friendly unit an objective role. The objective layer is attached ONLY when
 * the scenario is not `Destroy` (an empty objective map yields a `'destroy'`
 * scenario type and no roles, so the bot falls through to pure A3a). The
 * caller only passes `objectiveInput` for an objective-aware tier, so the
 * tier flag gates whether the planner ever sees the objective map at all.
 *
 * The returned plan is frozen so a per-unit decision cannot mutate the shared
 * picture. Pure deterministic function — identical unit sets always yield an
 * identical plan, and no `SeededRandom` is consumed.
 */
export function planTurn(
  friendly: readonly IAIUnitState[],
  enemies: readonly IAIUnitState[],
  objectiveInput?: IObjectivePlanInput,
): ILanceTurnPlan {
  const threatMap = buildThreatMap(friendly, enemies);
  const fireAssignment = coordinateFire(friendly, enemies, threatMap);
  const lanceCentroid = computeLanceCentroid(friendly);

  // A3b objective layer — built only when the objective context is threaded
  // through (an objective-aware tier). A `Destroy` scenario produces a
  // `'destroy'` plan with no roles; in that case we omit `objectivePlan`
  // entirely so the lance plays pure A3a coordinated combat.
  let objectivePlan: IObjectiveLancePlan | undefined;
  if (objectiveInput) {
    const built = planObjectives(
      objectiveInput.session,
      objectiveInput.botSide,
      friendly,
      objectiveInput.costFn,
    );
    if (built.scenarioType !== 'destroy') {
      objectivePlan = built;
    }
  }

  return Object.freeze({
    threatMap,
    fireAssignment,
    lanceCentroid,
    ...(objectivePlan ? { objectivePlan } : {}),
  });
}
