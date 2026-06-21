import type {
  Facing,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  MovementAnimationMode,
} from '@/types/gameplay';

import { AXIAL_DIRECTION_DELTAS, MovementType } from '@/types/gameplay';
import { hexEquals, hexLine } from '@/utils/gameplay/hexMath';

import {
  getSprintMPForCapability,
  type IMovementCostContext,
} from './calculations';
import { findPath } from './pathfinding';

export {
  assertMovementStepConservation,
  decomposeMovementSteps,
} from './eventPathDecomposition';
export type {
  IDecomposeMovementInput,
  IMovementDecomposition,
} from './eventPathDecomposition';

export function movementAnimationModeForType(
  movementType: MovementType,
): MovementAnimationMode | null {
  switch (movementType) {
    case MovementType.Walk:
    case MovementType.Run:
    case MovementType.Jump:
      return movementType;
    case MovementType.Evade:
    case MovementType.Sprint:
      return MovementType.Run;
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
  readonly movementContext?: IMovementCostContext;
}): readonly IHexCoordinate[] {
  const { grid, from, to, movementType, maxCost, movementContext } = params;

  if (hexEquals(from, to)) {
    return [copyHex(from)];
  }

  if (
    movementType === MovementType.Jump ||
    movementType === MovementType.Stationary
  ) {
    return [copyHex(from), copyHex(to)];
  }

  const path = findPath({
    grid,
    start: from,
    end: to,
    maxCost: maxCost ?? Infinity,
    movementType: toUnitMovementType(movementType),
    context: movementContext,
  });
  return normalizeMovementEventPath(from, to, path ?? undefined);
}

function toUnitMovementType(
  movementType: MovementType,
): 'walk' | 'run' | 'jump' {
  switch (movementType) {
    case MovementType.Run:
    case MovementType.Evade:
    case MovementType.Sprint:
      return 'run';
    case MovementType.Jump:
      return 'jump';
    case MovementType.Walk:
    case MovementType.Stationary:
    default:
      return 'walk';
  }
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
    case MovementType.Evade:
      return capability.runMP;
    case MovementType.Sprint:
      return getSprintMPForCapability(capability);
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

function copyHex(coord: IHexCoordinate): IHexCoordinate {
  return { q: coord.q, r: coord.r };
}

function facingForHexTransition(
  from: IHexCoordinate,
  to: IHexCoordinate,
): Facing | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  for (let i = 0; i < AXIAL_DIRECTION_DELTAS.length; i++) {
    const delta = AXIAL_DIRECTION_DELTAS[i];
    if (delta.q === dq && delta.r === dr) {
      return i as Facing;
    }
  }
  return null;
}

export function facingForPathEnd(
  path: readonly IHexCoordinate[],
  fallback: Facing,
): Facing {
  if (path.length < 2) return fallback;
  return (
    facingForHexTransition(path[path.length - 2], path[path.length - 1]) ??
    fallback
  );
}

function shortestRotation(from: Facing, to: Facing): number {
  const diff = ((to - from) % 6) + 6;
  const cw = diff % 6;
  if (cw === 0) return 0;
  if (cw <= 3) return cw;
  return cw - 6;
}

export function calculateGroundPathTurningMpCost(params: {
  readonly path: readonly IHexCoordinate[];
  readonly fromFacing: Facing;
  readonly toFacing: Facing;
}): number {
  const { path, fromFacing, toFacing } = params;
  if (path.length === 0) return 0;

  let currentFacing: Facing = fromFacing;
  let currentCoord: IHexCoordinate = path[0];
  let turningMpCost = 0;

  for (let i = 1; i < path.length; i++) {
    const next = path[i];
    if (hexEquals(currentCoord, next)) continue;

    const requiredFacing = facingForHexTransition(currentCoord, next);
    if (requiredFacing !== null) {
      turningMpCost += Math.abs(
        shortestRotation(currentFacing, requiredFacing),
      );
      currentFacing = requiredFacing;
    }

    currentCoord = next;
  }

  turningMpCost += Math.abs(shortestRotation(currentFacing, toFacing));
  return turningMpCost;
}
