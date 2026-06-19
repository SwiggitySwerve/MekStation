import type { IHexCoordinate } from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IMove } from './types';

import { scoreRetreatMove } from './RetreatAI';

type LockedRetreatEdge = NonNullable<IAIUnitState['retreatTargetEdge']>;

export const FACING_VECTORS: Record<Facing, IHexCoordinate> = {
  [Facing.North]: { q: 0, r: -1 },
  [Facing.Northeast]: { q: 1, r: -1 },
  [Facing.Southeast]: { q: 1, r: 0 },
  [Facing.South]: { q: 0, r: 1 },
  [Facing.Southwest]: { q: -1, r: 1 },
  [Facing.Northwest]: { q: -1, r: 0 },
};

export function edgeVector(edge: LockedRetreatEdge): IHexCoordinate {
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

export function distanceToEdge(
  position: IHexCoordinate,
  edge: LockedRetreatEdge,
  mapRadius: number,
): number {
  switch (edge) {
    case 'north':
      return mapRadius - position.r;
    case 'south':
      return position.r - -mapRadius;
    case 'east':
      return mapRadius - position.q;
    case 'west':
      return position.q - -mapRadius;
  }
}

export function endingFacingTowardEdge(
  endingFacing: Facing,
  edge: LockedRetreatEdge,
): boolean {
  const facingVec = FACING_VECTORS[endingFacing];
  const edgeVec = edgeVector(edge);
  return facingVec.q * edgeVec.q + facingVec.r * edgeVec.r >= 1;
}

export function selectRetreatMove(
  moves: readonly IMove[],
  random: SeededRandom,
  unit: IAIUnitState & { readonly retreatTargetEdge: LockedRetreatEdge },
): IMove {
  const edge = unit.retreatTargetEdge;
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

export function inferMapRadiusFromMoves(
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
