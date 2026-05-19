/**
 * AI jump-jet tactics — purposeful jump scoring.
 *
 * Per `add-ai-advanced-systems` design D1: the legacy bot picks the Jump
 * movement type on a flat 20% random roll and `MoveAI` scores a jump
 * destination exactly like a walk destination — the bot never jumps *for a
 * reason*. `evaluateJump` scores a unit's best jump destination for three
 * tactical motives:
 *
 *   - **terrain-clearing** — a jump destination reached over terrain that
 *     would cost heavy MP to walk through earns a bonus. Jump movement
 *     ignores intervening terrain cost, so the gap between the walk path
 *     cost and the jump hop count measures how much terrain the jump
 *     skips over.
 *   - **elevation gain** — a jump destination at higher elevation than the
 *     origin earns a bonus (elevation aids LOS and to-hit).
 *   - **charge/melee escape** — when an enemy is adjacent and threatens a
 *     physical attack, a jump that breaks adjacency earns a bonus.
 *
 * The tactical bonus is offset by jump heat: `evaluateJump` projects the
 * jump's heat through A2's `AIHeatPlanner.projectHeat` and flags
 * `heatUnsafe` when the jump pushes a shutdown inside the lookahead window.
 *
 * This module is a pure deterministic function of unit / grid / enemy
 * state — it never consumes `SeededRandom`, so SimulationRunner seed
 * sequences stay stable (design D6). It consumes the A1 pathfinder and the
 * A2 heat planner; it builds neither.
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Jump-Jet Tactics
 */

import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { getHex } from '@/utils/gameplay/hexGrid';
import { hexDistance } from '@/utils/gameplay/hexMath';

import type { IAIUnitState } from './types';

import { projectHeat } from './AIHeatPlanner';
import { findAllPaths, findPath } from './AITerrainPathfinder';

/**
 * The result of evaluating a unit's jump options for one turn.
 */
export interface IJumpEvaluation {
  /** Net tactical score of the best jump destination (>= 0). */
  readonly bestJumpScore: number;
  /** True when jumping risks a shutdown inside the heat lookahead window. */
  readonly heatUnsafe: boolean;
}

/**
 * Optional knobs for `evaluateJump`. All have tactical defaults; callers
 * (and tests) override them to pin specific behavior.
 */
export interface IJumpEvaluationOptions {
  /**
   * The unit's per-turn heat dissipation. The heat projection subtracts this
   * each turn. Defaults to the canonical 10-sink baseline.
   */
  readonly heatDissipation?: number;
  /**
   * Turns the heat projection looks ahead. `0` disables the projection — the
   * jump is never flagged heat-unsafe. Defaults to `4` (the `Elite` tier's
   * heat lookahead).
   */
  readonly heatLookaheadTurns?: number;
}

/** Canonical 10-single-heat-sink baseline dissipation (mirrors `BotPlayer`). */
const DEFAULT_HEAT_DISSIPATION = 10;

/** Default heat lookahead window — the `Elite` tier's `heatLookaheadTurns`. */
const DEFAULT_HEAT_LOOKAHEAD = 4;

/**
 * Per-hex score awarded for each MP of terrain a jump skips over. The
 * terrain-clearing score is `TERRAIN_CLEAR_PER_MP * (walkPathCost -
 * jumpHopCount)` — a jump whose walk equivalent claws through heavy woods or
 * detours far around an obstacle scores high; a jump over open ground (where
 * the walk path costs the same as the hop count) scores zero.
 */
const TERRAIN_CLEAR_PER_MP = 120;

/**
 * Score awarded per level of elevation gained at the jump destination
 * relative to the origin. Elevation aids LOS and to-hit, so a jump that
 * gains a ridge earns a flat bonus per level.
 */
const ELEVATION_GAIN_PER_LEVEL = 150;

/**
 * Flat bonus for a jump that breaks adjacency with an enemy threatening a
 * physical attack (a charge or melee). Sized at forward-arc scale so escaping
 * a charge competes with a strong shot.
 */
const CHARGE_ESCAPE_BONUS = 500;

/**
 * Heat-unsafe penalty subtracted from the best jump score when the jump
 * pushes a shutdown inside the lookahead window. Large enough that, on heat
 * grounds alone, a heat-unsafe jump cannot clear the selection threshold.
 */
const HEAT_UNSAFE_PENALTY = 100000;

/** Jump movement-heat model — `max(hexesJumped, 3)`, mirrors the engine. */
function jumpHeat(hexesJumped: number): number {
  return Math.max(hexesJumped, 3);
}

/** Elevation of a hex, defaulting to `0` for an off-grid coordinate. */
function elevationAt(grid: IHexGrid, coord: IHexCoordinate): number {
  const hex = getHex(grid, coord);
  return hex ? hex.elevation : 0;
}

/**
 * Score one jump destination's tactical value — terrain-clearing plus
 * elevation gain plus charge escape. Pure; consumes no RNG.
 */
function scoreJumpDestination(
  unit: IAIUnitState,
  grid: IHexGrid,
  capability: IMovementCapability,
  enemies: readonly IAIUnitState[],
  destination: IHexCoordinate,
): number {
  let score = 0;

  // Terrain-clearing. The jump-hop count is the straight hex distance (jump
  // ignores terrain). The walk-equivalent cost is the cheapest walk path the
  // A1 pathfinder finds to the same hex; when that hex is unreachable on foot
  // the path falls back to `reachable: false` with the straight distance, so
  // the gap is zero — the safe floor. The positive gap is the MP of terrain
  // the jump skips.
  const jumpHops = hexDistance(unit.position, destination);
  const walkPath = findPath({
    grid,
    origin: unit.position,
    destination,
    movementType: MovementType.Walk,
    capability,
  });
  const terrainSkipped = walkPath.totalMpCost - jumpHops;
  if (terrainSkipped > 0) {
    score += TERRAIN_CLEAR_PER_MP * terrainSkipped;
  }

  // Elevation gain. A destination higher than the origin earns a flat bonus
  // per level climbed; a level drop earns nothing (no penalty — losing
  // elevation is simply not rewarded).
  const elevationGain =
    elevationAt(grid, destination) - elevationAt(grid, unit.position);
  if (elevationGain > 0) {
    score += ELEVATION_GAIN_PER_LEVEL * elevationGain;
  }

  // Charge/melee escape. When at least one living enemy is currently
  // adjacent to the unit (and so could declare a charge or melee), a jump
  // destination that is NOT adjacent to that enemy breaks the threat.
  const adjacentEnemies = enemies.filter(
    (enemy) =>
      !enemy.destroyed &&
      enemy.unitId !== unit.unitId &&
      hexDistance(unit.position, enemy.position) <= 1,
  );
  if (adjacentEnemies.length > 0) {
    const escapesAll = adjacentEnemies.every(
      (enemy) => hexDistance(destination, enemy.position) > 1,
    );
    if (escapesAll) {
      score += CHARGE_ESCAPE_BONUS;
    }
  }

  return score;
}

/**
 * Evaluate a unit's jump options for the current turn.
 *
 * Runs the A1 pathfinder once over the unit's jump reach, scores every
 * reachable jump destination for terrain-clearing / elevation / charge
 * escape, and projects the heat of the best-scoring jump through A2's
 * `projectHeat`. Returns the best destination's net score and whether that
 * jump risks a shutdown inside the heat lookahead window.
 *
 * `bestJumpScore` is `0` when the unit has no jump capability or no reachable
 * jump destination. `heatUnsafe` is `false` whenever heat projection is
 * disabled (`heatLookaheadTurns <= 0`) or the unit cannot jump.
 *
 * Pure and deterministic — a function of its arguments only.
 */
export function evaluateJump(
  unit: IAIUnitState,
  grid: IHexGrid,
  capability: IMovementCapability,
  enemies: readonly IAIUnitState[],
  options: IJumpEvaluationOptions = {},
): IJumpEvaluation {
  // No jump jets — nothing to evaluate.
  if (capability.jumpMP <= 0) {
    return { bestJumpScore: 0, heatUnsafe: false };
  }

  // One Dijkstra sweep over the unit's jump reach. Every entry is a
  // reachable jump destination; the origin carries a zero-cost empty path.
  const jumpPaths = findAllPaths(
    grid,
    unit.position,
    MovementType.Jump,
    capability,
  );

  let bestScore = 0;
  let bestHops = 0;
  // The farthest jump the unit could take this turn — its highest possible
  // jump-heat. Heat safety is judged against the *worst-case* jump so a hot
  // unit is flagged even when its highest-scoring jump is a short hop.
  let maxHops = 0;
  for (const path of Array.from(jumpPaths.values())) {
    // Skip the origin (no jump) — a unit standing still has not jumped.
    if (path.totalMpCost === 0) continue;
    const hops = hexDistance(unit.position, path.destination);
    if (hops > maxHops) maxHops = hops;
    const score = scoreJumpDestination(
      unit,
      grid,
      capability,
      enemies,
      path.destination,
    );
    if (score > bestScore) {
      bestScore = score;
      bestHops = hops;
    }
  }

  // Heat safety. Project the heat curve assuming a jump's heat recurs each
  // turn (the conservative assumption — a unit that jumps once often jumps
  // again). The projected jump is the highest-scoring one when it is
  // positive, otherwise the farthest reachable hop — the worst-case heat the
  // unit could incur if it jumps at all. When `heatLookaheadTurns <= 0` the
  // projection is skipped and the jump is never flagged unsafe.
  const lookahead = options.heatLookaheadTurns ?? DEFAULT_HEAT_LOOKAHEAD;
  const dissipation = options.heatDissipation ?? DEFAULT_HEAT_DISSIPATION;
  const projectedHops = bestHops > 0 ? bestHops : maxHops;
  let heatUnsafe = false;
  if (lookahead > 0 && projectedHops > 0) {
    const projection = projectHeat(
      unit.heat,
      dissipation,
      jumpHeat(projectedHops),
      lookahead,
    );
    heatUnsafe = projection.shutdownRiskTurn >= 0;
  }

  // A heat-unsafe jump is heavily penalized so it cannot clear the selection
  // threshold on heat grounds alone (design D1 / spec scenario "Heat-unsafe
  // jump is rejected"). The penalty drives `bestJumpScore` deep negative.
  const netScore = heatUnsafe ? bestScore - HEAT_UNSAFE_PENALTY : bestScore;

  return { bestJumpScore: netScore, heatUnsafe };
}

/**
 * Per-change test hook: re-export the scoring constants so unit tests can
 * pin the jump math against the documented magnitudes. Not part of the
 * public surface.
 */
export const __testing__ = {
  TERRAIN_CLEAR_PER_MP,
  ELEVATION_GAIN_PER_LEVEL,
  CHARGE_ESCAPE_BONUS,
  HEAT_UNSAFE_PENALTY,
  jumpHeat,
};
