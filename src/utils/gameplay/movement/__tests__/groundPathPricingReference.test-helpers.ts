import type { Facing, IHexCoordinate, IHexGrid } from '@/types/gameplay';

import type { UnitMovementType } from '../types';

import { getHexMovementCost, type IMovementCostContext } from '../calculations';
import { calculateGroundPathTurningMpCost } from '../eventPath';

/**
 * Frozen pre-optimization oracle from validation.ts at 28625ed54.
 * Deliberately independent of the prepared-price contract: changing the
 * runtime summation, first-step context, or Infinity handling must fail here.
 * This reference is test-only; production pricing belongs to validation.ts.
 */
export function referenceGroundPathMpCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
  movementType: UnitMovementType,
  fromFacing: Facing,
  toFacing: Facing,
  context?: IMovementCostContext,
): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const step = getHexMovementCost(
      grid,
      path[i],
      movementType,
      path[i - 1],
      context,
    );
    if (!Number.isFinite(step)) return Infinity;
    total += step;
  }
  return (
    total + calculateGroundPathTurningMpCost({ path, fromFacing, toFacing })
  );
}
