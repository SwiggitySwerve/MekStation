import type { Facing, IHexCoordinate, IHexGrid } from '@/types/gameplay';

import { AXIAL_DIRECTION_DELTAS, MovementType } from '@/types/gameplay';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import type { UnitMovementType } from './types';

import { getHexMovementCost, type IMovementCostContext } from './calculations';

export type LateralShiftDirection = 'left' | 'right';

function relativeDirection(
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
): number | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const direction = AXIAL_DIRECTION_DELTAS.findIndex(
    (delta) => delta.q === dq && delta.r === dr,
  );
  if (direction < 0) return null;
  return (6 + direction - facing) % 6;
}

export function maneuveringAceLateralShiftDirection(params: {
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
}): LateralShiftDirection | null {
  const relative = relativeDirection(params.from, params.to, params.facing);
  if (relative === 1) return 'right';
  if (relative === 5) return 'left';
  return null;
}

export function canUseManeuveringAceBipedLateralShift(params: {
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly fromFacing: Facing;
  readonly toFacing: Facing;
  readonly movementType: MovementType;
  readonly movementContext?: IMovementCostContext;
}): boolean {
  if (
    params.movementType === MovementType.Jump ||
    params.movementType === MovementType.Stationary
  ) {
    return false;
  }
  if (params.fromFacing !== params.toFacing) return false;
  if (
    !hasSPA(params.movementContext?.pilotAbilities ?? [], 'maneuvering_ace')
  ) {
    return false;
  }
  return (
    maneuveringAceLateralShiftDirection({
      from: params.from,
      to: params.to,
      facing: params.fromFacing,
    }) !== null
  );
}

export function calculateManeuveringAceBipedLateralShiftCost(params: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly movementType: UnitMovementType;
  readonly movementContext?: IMovementCostContext;
}): number {
  const entryCost = getHexMovementCost(
    params.grid,
    params.to,
    params.movementType,
    params.from,
    params.movementContext,
  );
  if (!Number.isFinite(entryCost)) return Infinity;
  return entryCost + 1;
}

export function calculateManeuveringAceQuadLateralStepCost(params: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly movementType: UnitMovementType;
  readonly movementContext?: IMovementCostContext;
}): number {
  const entryCost = getHexMovementCost(
    params.grid,
    params.to,
    params.movementType,
    params.from,
    params.movementContext,
  );
  if (!Number.isFinite(entryCost)) return Infinity;
  return entryCost;
}
