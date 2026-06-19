import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';

interface TestUnitOverrides {
  id: string;
  side?: GameSide;
  destroyed?: boolean;
  pilotConscious?: boolean;
  lockState?: LockState;
}

export function createStateWithUnits(
  units: TestUnitOverrides[],
  stateOverrides: Partial<IGameState> = {},
): IGameState {
  const unitsMap: Record<string, IUnitGameState> = {};

  for (const unit of units) {
    unitsMap[unit.id] = {
      id: unit.id,
      side: unit.side ?? GameSide.Player,
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
      pilotConscious: unit.pilotConscious ?? true,
      destroyed: unit.destroyed ?? false,
      lockState: unit.lockState ?? LockState.Pending,
    };
  }

  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: unitsMap,
    turnEvents: [],
    ...stateOverrides,
  };
}
