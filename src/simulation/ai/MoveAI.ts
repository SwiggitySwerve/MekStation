import type {
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
  MovementType,
} from '@/types/gameplay';
import type { IMovementCostContext } from '@/utils/gameplay/movement';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IBotBehavior, IMove } from './types';

import {
  enrichScoreContext,
  enumerateMovementCandidateDestinations,
  getValidMoveCandidates,
} from './MoveAI.movement';
import {
  FACING_VECTORS,
  distanceToEdge,
  edgeVector,
  endingFacingTowardEdge,
  inferMapRadiusFromMoves,
  selectRetreatMove,
} from './MoveAI.retreat';
import { scoreMove, type IScoreMoveContext } from './MoveAI.scoring';

export { scoreMove } from './MoveAI.scoring';
export type { IScoreMoveContext } from './MoveAI.scoring';

export class MoveAI {
  constructor(private readonly behavior: IBotBehavior) {}

  getValidMoves(
    grid: IHexGrid,
    position: IUnitPosition,
    movementType: MovementType,
    capability: IMovementCapability,
    movementContext?: IMovementCostContext,
  ): readonly IMove[] {
    return getValidMoveCandidates(
      grid,
      position,
      movementType,
      capability,
      movementContext,
    );
  }

  selectMove(
    moves: readonly IMove[],
    random: SeededRandom,
    unit?: IAIUnitState,
    ctx?: IScoreMoveContext,
  ): IMove | null {
    if (moves.length === 0) {
      return null;
    }

    if (unit?.isRetreating && unit.retreatTargetEdge) {
      return selectRetreatMove(moves, random, {
        ...unit,
        retreatTargetEdge: unit.retreatTargetEdge,
      });
    }

    if (ctx) {
      const scoringCtx = enrichScoreContext(this.behavior, ctx, moves);

      let bestScore = -Infinity;
      let bestMoves: IMove[] = [];
      for (const move of moves) {
        const score = scoreMove(move, scoringCtx);
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

export const __testing__ = {
  FACING_VECTORS,
  distanceToEdge,
  edgeVector,
  endingFacingTowardEdge,
  enumerateMovementCandidateDestinations,
  inferMapRadiusFromMoves,
};
