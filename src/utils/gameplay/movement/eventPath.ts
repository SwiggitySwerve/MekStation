import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  MovementAnimationMode,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { hexEquals, hexLine } from '@/utils/gameplay/hexMath';

import { findPath } from './pathfinding';

export function movementAnimationModeForType(
  movementType: MovementType,
): MovementAnimationMode | null {
  switch (movementType) {
    case MovementType.Walk:
    case MovementType.Run:
    case MovementType.Jump:
      return movementType;
    default:
      return null;
  }
}

export function normalizeMovementEventPath(
  from: IHexCoordinate,
  to: IHexCoordinate,
  path?: readonly IHexCoordinate[],
): readonly IHexCoordinate[] {
  if (path && path.length > 0) {
    return path.map(copyHex);
  }

  return hexLine(from, to).map(copyHex);
}

export function buildMovementEventPath(params: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly movementType: MovementType;
  readonly maxCost?: number;
}): readonly IHexCoordinate[] {
  const { grid, from, to, movementType, maxCost } = params;

  if (hexEquals(from, to)) {
    return [copyHex(from)];
  }

  if (
    movementType === MovementType.Jump ||
    movementType === MovementType.Stationary
  ) {
    return [copyHex(from), copyHex(to)];
  }

  const path = findPath(grid, from, to, maxCost ?? Infinity);
  return normalizeMovementEventPath(from, to, path ?? undefined);
}

export function maxMovementCostForCapability(
  capability: IMovementCapability | null | undefined,
  movementType: MovementType,
): number {
  if (!capability) {
    return Infinity;
  }

  switch (movementType) {
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
      return capability.runMP;
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

function copyHex(coord: IHexCoordinate): IHexCoordinate {
  return { q: coord.q, r: coord.r };
}
