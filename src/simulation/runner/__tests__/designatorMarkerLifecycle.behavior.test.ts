import { describe, expect, it } from '@jest/globals';

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

import { resetTurnState } from '../SimulationRunnerState';

function createUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'opponent-1',
    side: GameSide.Opponent,
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
    damageThisPhase: 7,
    weaponsFiredThisTurn: ['tag-0'],
    pendingPSRs: [],
    ...overrides,
  };
}

function createState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'designator-marker-lifecycle',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.End,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

describe('runner designator marker lifecycle', () => {
  it('clears transient TAG designations at the turn reset while preserving NARC beacons', () => {
    const state = createState(
      createUnit({
        tagDesignated: true,
        sprintedThisTurn: true,
        narcedBy: [GameSide.Player],
      }),
    );

    const result = resetTurnState(state);

    expect(result.units['opponent-1'].tagDesignated).toBe(false);
    expect(result.units['opponent-1'].sprintedThisTurn).toBe(false);
    expect(result.units['opponent-1'].narcedBy).toEqual([GameSide.Player]);
    expect(result.units['opponent-1'].damageThisPhase).toBe(0);
    expect(result.units['opponent-1'].weaponsFiredThisTurn).toEqual([]);
  });
});
