import type { IMovementCapability, IUnitGameState } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import { getStandingCost } from './validation';

export function isMekStyleHullDownExitCapability(
  capability: IMovementCapability,
): boolean {
  if (capability.movementHeatProfile === 'none') return false;
  if (capability.movementHeatProfile === 'airmek') return false;

  switch (capability.movementMode) {
    case undefined:
    case 'walk':
    case 'umu':
    case 'biped_swim':
    case 'quad_swim':
      return true;
    default:
      return false;
  }
}

export function getHullDownExitCost(
  unit: IUnitGameState,
  capability: IMovementCapability,
  movementType: MovementType,
): number {
  if (
    unit.prone ||
    !unit.hullDown ||
    movementType === MovementType.Jump ||
    movementType === MovementType.Stationary ||
    !isMekStyleHullDownExitCapability(capability)
  ) {
    return 0;
  }

  return getStandingCost(capability);
}
