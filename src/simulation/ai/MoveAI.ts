import type { IBotBehavior, IMove } from './types';
import type { SeededRandom } from '../core/SeededRandom';
import type {
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
  IHexCoordinate,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay';
import { getValidDestinations, calculateMovementHeat } from '@/utils/gameplay/movement';
import { hexDistance } from '@/utils/gameplay/hexMath';

export class MoveAI {
  constructor(private readonly behavior: IBotBehavior) {}

  getValidMoves(
    grid: IHexGrid,
    position: IUnitPosition,
    movementType: MovementType,
    capability: IMovementCapability
  ): readonly IMove[] {
    const destinations = getValidDestinations(grid, position, movementType, capability);
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

  selectMove(moves: readonly IMove[], random: SeededRandom): IMove | null {
    if (moves.length === 0) {
      return null;
    }

    const index = random.nextInt(moves.length);
    return moves[index];
  }
}
