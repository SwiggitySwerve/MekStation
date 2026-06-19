import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameState,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';

import { createInitialGameState } from '..';

export const BASIC_CAPABILITY: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
};

export function stateWithUnit(unit: IUnitGameState): IGameState {
  return {
    ...createInitialGameState('game-1'),
    units: { [unit.id]: unit },
  };
}

export function runtimeMovementUnit(
  overrides: Pick<IUnitGameState, 'id'> & Partial<IUnitGameState>,
): IUnitGameState {
  return {
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
