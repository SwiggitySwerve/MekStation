import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON,
  resolveRuntimeMovementCapability,
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
  runtimeUnitHeightForMovement,
} from '@/utils/gameplay/movement/runtimeCapability';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

export function unitState(
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id: 'unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

export {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON,
  Facing,
  GameSide,
  GroundMotionType,
  LockState,
  MovementType,
  ProtoChassis,
  createAerospaceCombatState,
  createProtoMechCombatState,
  createVehicleCombatState,
  resolveRuntimeMovementCapability,
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
  runtimeUnitHeightForMovement,
};

export type { IMovementCapability, IUnitGameState };
