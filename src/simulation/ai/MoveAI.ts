import type {
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';
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
   * Per `wire-bot-ai-helpers-and-capstone`: when `unit.isRetreating` is
   * true and the unit has a `retreatTargetEdge`, score every candidate
   * move with `scoreRetreatMove` and pick the highest. Ties broken by
   * deterministic random (preserves the legacy non-retreat code path
   * which uses random pick directly).
   *
   * When `unit` is undefined or not retreating, falls back to uniform
   * random pick — matches the original signature for callers that
   * haven't been migrated yet.
   */
  selectMove(
    moves: readonly IMove[],
    random: SeededRandom,
    unit?: IAIUnitState,
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

      if (bestMoves.length === 1) return bestMoves[0];
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
