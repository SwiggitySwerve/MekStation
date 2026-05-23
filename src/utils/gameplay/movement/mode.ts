import type { IMovementCapability, MovementTravelMode } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import type { UnitMovementType } from './types';

export function movementModeForPath(
  movementType: MovementType,
  capability?: IMovementCapability | null,
): UnitMovementType {
  if (movementType === MovementType.Jump) return 'jump';
  if (capability?.movementMode) return capability.movementMode;
  return movementType === MovementType.Run ? 'run' : 'walk';
}

export function movementModeForRange(
  movementType: MovementType,
  capability?: IMovementCapability | null,
): MovementTravelMode {
  return movementModeForPath(movementType, capability);
}
