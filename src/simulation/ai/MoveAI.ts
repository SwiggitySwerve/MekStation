import type {
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, FiringArc, MovementType } from '@/types/gameplay';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import {
  getValidDestinations,
  calculateMovementHeat,
} from '@/utils/gameplay/movement';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IBotBehavior, IMove } from './types';

import { scoreRetreatMove } from './RetreatAI';

/**
 * Per `wire-bot-ai-helpers-and-capstone`: facing → unit axial vector.
 * Used for the "ending facing toward edge" check when scoring retreat
 * moves. Flat-top hex orientation matching the engine's `Facing` enum.
 */
const FACING_VECTORS: Record<Facing, IHexCoordinate> = {
  [Facing.North]: { q: 0, r: -1 },
  [Facing.Northeast]: { q: 1, r: -1 },
  [Facing.Southeast]: { q: 1, r: 0 },
  [Facing.South]: { q: 0, r: 1 },
  [Facing.Southwest]: { q: -1, r: 1 },
  [Facing.Northwest]: { q: -1, r: 0 },
};

/**
 * Per `wire-bot-ai-helpers-and-capstone`: convert one of the 4 retreat
 * edges to its axial unit vector. Used both for distance-to-edge and
 * facing-alignment checks.
 */
function edgeVector(edge: 'north' | 'south' | 'east' | 'west'): IHexCoordinate {
  switch (edge) {
    case 'north':
      return { q: 0, r: -1 };
    case 'south':
      return { q: 0, r: 1 };
    case 'east':
      return { q: 1, r: 0 };
    case 'west':
      return { q: -1, r: 0 };
  }
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: distance from a hex to a
 * map edge using axial Chebyshev convention. North = max -r, South =
 * max +r, East = max +q, West = max -q. Uses the same `mapRadius`
 * convention as `RetreatAI.resolveEdge`.
 *
 * NOTE: `RetreatAI.resolveEdge` treats positive r as "south" — we
 * preserve that convention here so the edge picked at trigger time
 * remains the closer one as the unit moves.
 */
function distanceToEdge(
  position: IHexCoordinate,
  edge: 'north' | 'south' | 'east' | 'west',
  mapRadius: number,
): number {
  switch (edge) {
    case 'north':
      // `resolveEdge` defines dNorth = mapRadius - position.r.
      return mapRadius - position.r;
    case 'south':
      return position.r - -mapRadius;
    case 'east':
      return mapRadius - position.q;
    case 'west':
      return position.q - -mapRadius;
  }
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: returns true when the unit's
 * `endingFacing` vector points toward `edge` (within ±60° — i.e., the
 * facing's axial vector and the edge's axial vector both have the
 * same sign on the dominant axis). Pure helper.
 */
function endingFacingTowardEdge(
  endingFacing: Facing,
  edge: 'north' | 'south' | 'east' | 'west',
): boolean {
  const facingVec = FACING_VECTORS[endingFacing];
  const edgeVec = edgeVector(edge);
  // Dot product on axial coords gives a rough alignment score; >= 1 is
  // "facing is generally toward the edge". The 6 facings produce dot
  // products of {-1, 0, 1}, so >= 1 captures the 2-3 facings closest
  // to the edge direction.
  return facingVec.q * edgeVec.q + facingVec.r * edgeVec.r >= 1;
}

/**
 * Per `improve-bot-basic-combat-competence` task 6.1–6.4: context
 * passed to `scoreMove` for combat-time movement scoring. Pulling this
 * into its own interface keeps the scorer pure and testable without
 * constructing a full `BotPlayer` harness.
 *
 *   - `attacker` is the unit being moved (used for facing/arc math).
 *   - `allUnits` is the full bot-visible unit list; we filter to
 *     non-destroyed enemies inside the scorer.
 *   - `grid` is needed for `calculateLOS` terrain blocking.
 *   - `highestThreatTarget` is optional — when supplied we give +500
 *     if the target ends up in the attacker's forward arc after the
 *     move. When omitted we skip the forward-arc bonus entirely
 *     (legacy callers that haven't migrated).
 */
export interface IScoreMoveContext {
  readonly attacker: IAIUnitState;
  readonly allUnits: readonly IAIUnitState[];
  readonly grid: IHexGrid;
  readonly highestThreatTarget?: IAIUnitState;
}

/**
 * Per `improve-bot-basic-combat-competence` task 6: score a candidate
 * non-retreat move. Higher = better.
 *
 * Scoring terms (additive):
 *   - `+1000` if at least one non-destroyed enemy has line of sight
 *     to the destination hex (task 6.2). We score the destination,
 *     not the path — the bot cares about where it ENDS, not
 *     intermediate squares.
 *   - `+500` if `highestThreatTarget` is in the resulting FRONT arc
 *     (task 6.3), where "front" uses the move's `facing` as the
 *     attacker's new facing. Torso twist is NOT applied here — the
 *     movement phase commits the unit's body facing, which is what
 *     the weapon-arc resolver keys off.
 *   - `-100` per hex of distance from the nearest non-destroyed
 *     enemy (task 6.4) — discourages backing off. When no enemies
 *     exist, this term is 0.
 *   - `-1` per point of `move.heatGenerated` (task 6.4) — modest
 *     penalty so running/jumping for no combat reason loses to
 *     walking / standing.
 *
 * Pure function — never mutates inputs. Identical ctx + move => same
 * score, matching the determinism contract for the AI module.
 */
export function scoreMove(move: IMove, ctx: IScoreMoveContext): number {
  const { attacker, allUnits, grid, highestThreatTarget } = ctx;
  let score = 0;

  // Task 6.2: LoS bonus. Uses `calculateLOS`, which already accounts
  // for terrain blocking (intervening woods, buildings, elevation).
  // We look for ANY enemy with LoS — having multiple doesn't
  // compound the score; we only need the bot to be visible to
  // something so it can be shot at (which means it can also shoot).
  const livingEnemies = allUnits.filter(
    (u) => !u.destroyed && u.unitId !== attacker.unitId,
  );
  const anyEnemyHasLOS = livingEnemies.some((enemy) => {
    const los = calculateLOS(enemy.position, move.destination, grid);
    return los.hasLOS;
  });
  if (anyEnemyHasLOS) score += 1000;

  // Task 6.3: forward-arc bonus. Uses `determineArc` with the
  // ATTACKER as the observer — "is the target in front of the new
  // attacker facing?" — the same primitive `AttackAI.selectWeapons`
  // uses for weapon filtering. We apply no torso twist here: the
  // movement phase commits the body's forward facing, and downstream
  // twist is a separate phase-time adjustment.
  if (highestThreatTarget && !highestThreatTarget.destroyed) {
    const arcResult = determineArc(
      {
        unitId: attacker.unitId,
        coord: move.destination,
        facing: move.facing,
        prone: false,
      },
      highestThreatTarget.position,
    );
    if (arcResult.arc === FiringArc.Front) score += 500;
  }

  // Task 6.4a: nearest-enemy distance penalty. Bot should close
  // distance rather than back off. `-100` per hex to the nearest
  // living enemy. Zero enemies => no penalty (nothing to close on).
  if (livingEnemies.length > 0) {
    let nearestDistance = Infinity;
    for (const enemy of livingEnemies) {
      const d = hexDistance(move.destination, enemy.position);
      if (d < nearestDistance) nearestDistance = d;
    }
    score -= 100 * nearestDistance;
  }

  // Task 6.4b: movement-heat penalty. Small so it only breaks ties
  // among otherwise-equivalent moves (a running move that gains a
  // forward-arc bonus easily outweighs the run's heat cost).
  score -= move.heatGenerated;

  return score;
}

export class MoveAI {
  constructor(private readonly behavior: IBotBehavior) {}

  getValidMoves(
    grid: IHexGrid,
    position: IUnitPosition,
    movementType: MovementType,
    capability: IMovementCapability,
  ): readonly IMove[] {
    const destinations = getValidDestinations(
      grid,
      position,
      movementType,
      capability,
    );
    const moves: IMove[] = [];

    for (const destination of destinations) {
      const distance = hexDistance(position.coord, destination);
      const heatGenerated = calculateMovementHeat(movementType, distance);

      for (let facing = 0; facing < 6; facing++) {
        moves.push({
          destination,
          facing: facing as Facing,
          movementType,
          mpCost: distance,
          heatGenerated,
        });
      }
    }

    return moves;
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone` + `improve-bot-basic-combat-competence`:
   *
   *   1. If `unit.isRetreating` and `unit.retreatTargetEdge` are set, use
   *      the retreat scoring path (unchanged from the retreat change).
   *   2. Else if a combat context (`ctx`) is supplied, score moves with
   *      `scoreMove` and pick the highest (tasks 6/7). Ties broken by
   *      `SeededRandom.nextInt` so determinism is preserved across runs
   *      sharing a seed.
   *   3. Else (legacy callers) fall back to uniform random pick. Kept
   *      so existing tests and the simulation runner can migrate in
   *      steps rather than all at once.
   *
   * Random consumption is CONSTANT per call regardless of which branch
   * runs — retreat always calls `nextInt(bestMoves.length)` (even on
   * length 1), combat always calls `nextInt(bestMoves.length)`, and
   * the legacy path calls `nextInt(moves.length)`. This keeps
   * downstream `SimulationRunner` seed sequences stable across the
   * AI upgrades. (Fixes the same class of determinism regression as
   * `AttackAI.selectTarget`.)
   */
  selectMove(
    moves: readonly IMove[],
    random: SeededRandom,
    unit?: IAIUnitState,
    ctx?: IScoreMoveContext,
  ): IMove | null {
    if (moves.length === 0) {
      return null;
    }

    // Retreat scoring path — only when fully wired (unit + edge).
    if (unit?.isRetreating && unit.retreatTargetEdge) {
      const edge = unit.retreatTargetEdge;
      // mapRadius isn't on IAIUnitState — we infer it from the grid by
      // checking the largest |q|+|r| in the grid via the moves'
      // destinations (cheap upper bound). Falls back to the unit's own
      // hex distance to origin when the move set is small.
      const mapRadius = inferMapRadiusFromMoves(moves, unit.position);
      const previousDistance = distanceToEdge(unit.position, edge, mapRadius);

      let bestScore = -Infinity;
      let bestMoves: IMove[] = [];
      for (const move of moves) {
        const newDistance = distanceToEdge(move.destination, edge, mapRadius);
        const score = scoreRetreatMove({
          previousDistanceToEdge: previousDistance,
          newDistanceToEdge: newDistance,
          endingFacingTowardEdge: endingFacingTowardEdge(move.facing, edge),
          isJumpMove: move.movementType === MovementType.Jump,
        });
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }

      const idx = random.nextInt(bestMoves.length);
      return bestMoves[idx];
    }

    // Task 7.1: combat scoring path. Only runs when the caller
    // supplies a context (enemy list + grid). Highest score wins,
    // ties broken by random.
    if (ctx) {
      let bestScore = -Infinity;
      let bestMoves: IMove[] = [];
      for (const move of moves) {
        const score = scoreMove(move, ctx);
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }
      const idx = random.nextInt(bestMoves.length);
      return bestMoves[idx];
    }

    const index = random.nextInt(moves.length);
    return moves[index];
  }
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: cheap mapRadius estimate
 * from a candidate move set. Returns the largest |q| or |r| seen in
 * any destination or the unit's current position. Sufficient for
 * scoring within the move-set since `scoreRetreatMove` cares about
 * RELATIVE progress, not absolute coordinates.
 */
function inferMapRadiusFromMoves(
  moves: readonly IMove[],
  origin: IHexCoordinate,
): number {
  let radius = Math.max(Math.abs(origin.q), Math.abs(origin.r));
  for (const move of moves) {
    radius = Math.max(
      radius,
      Math.abs(move.destination.q),
      Math.abs(move.destination.r),
    );
  }
  return radius;
}

/**
 * Per-change test hook for `improve-bot-basic-combat-competence`:
 * re-export internal helpers so unit tests can pin the retreat math
 * without standing up a full `MoveAI` instance. Not part of the public
 * surface.
 */
export const __testing__ = {
  FACING_VECTORS,
  distanceToEdge,
  edgeVector,
  endingFacingTowardEdge,
  inferMapRadiusFromMoves,
};
