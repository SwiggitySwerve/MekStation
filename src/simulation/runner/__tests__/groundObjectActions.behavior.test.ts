import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IRepresentedGroundObjectState,
  type IUnitGameState,
} from '@/types/gameplay';

import {
  applyRunnerGroundObjectDrop,
  applyRunnerGroundObjectPickup,
  applyRunnerGroundObjectThrow,
} from '../phases/groundObjectActions';

function createUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    tonnage: 80,
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
    abilities: ['hvy_lifter'],
    pendingPSRs: [],
    ...overrides,
  };
}

function createGroundObject(
  overrides: Partial<IRepresentedGroundObjectState> = {},
): IRepresentedGroundObjectState {
  return {
    id: 'girder-1',
    name: 'Steel girder',
    tonnage: 12,
    position: { q: 0, r: 0 },
    ...overrides,
  };
}

function createState(
  options: {
    readonly unit?: IUnitGameState;
    readonly object?: IRepresentedGroundObjectState;
  } = {},
): IGameState {
  const unit = options.unit ?? createUnit();
  const object = options.object ?? createGroundObject();

  return {
    gameId: 'ground-object-runner-behavior',
    status: GameStatus.Active,
    turn: 3,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: { [unit.id]: unit },
    groundObjects: { [object.id]: object },
    turnEvents: [],
  };
}

describe('runner ground object actions', () => {
  it('applies represented pickup and drop events through runner reducer plumbing', () => {
    const events: IGameEvent[] = [];
    const state = createState();

    const pickedUp = applyRunnerGroundObjectPickup({
      state,
      events,
      gameId: state.gameId,
      unitId: 'player-1',
      objectId: 'girder-1',
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: GameEventType.GroundObjectPickedUp,
      sequence: 0,
      turn: 3,
      phase: GamePhase.Movement,
      actorId: 'player-1',
      payload: {
        unitId: 'player-1',
        objectId: 'girder-1',
        from: { q: 0, r: 0 },
        carryLocation: 'both',
        capacityTonnage: 12,
        capacityMarginTonnage: 0,
      },
    });
    expect(pickedUp.units['player-1']).toMatchObject({
      leftArmCarryingCargo: true,
      rightArmCarryingCargo: true,
      carriedGroundObjectIds: ['girder-1'],
      isLoadingOrUnloadingCargo: true,
    });
    expect(pickedUp.groundObjects?.['girder-1']).toMatchObject({
      carriedByUnitId: 'player-1',
      carryLocation: 'both',
    });
    expect(pickedUp.groundObjects?.['girder-1'].position).toBeUndefined();

    const dropped = applyRunnerGroundObjectDrop({
      state: pickedUp,
      events,
      gameId: pickedUp.gameId,
      unitId: 'player-1',
      objectId: 'girder-1',
      to: { q: 1, r: 0 },
    });

    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      type: GameEventType.GroundObjectDropped,
      sequence: 1,
      turn: 3,
      phase: GamePhase.Movement,
      actorId: 'player-1',
      payload: {
        unitId: 'player-1',
        objectId: 'girder-1',
        to: { q: 1, r: 0 },
        reason: 'drop',
      },
    });
    expect(dropped.units['player-1']).toMatchObject({
      leftArmCarryingCargo: false,
      rightArmCarryingCargo: false,
      carriedGroundObjectIds: [],
      isLoadingOrUnloadingCargo: true,
    });
    expect(dropped.groundObjects?.['girder-1']).toMatchObject({
      position: { q: 1, r: 0 },
    });
    expect(dropped.groundObjects?.['girder-1'].carriedByUnitId).toBeUndefined();
    expect(dropped.groundObjects?.['girder-1'].carryLocation).toBeUndefined();
  });

  it('returns the original state and emits no event for an overweight pickup', () => {
    const events: IGameEvent[] = [];
    const state = createState({
      object: createGroundObject({ tonnage: 13 }),
    });

    const result = applyRunnerGroundObjectPickup({
      state,
      events,
      gameId: state.gameId,
      unitId: 'player-1',
      objectId: 'girder-1',
    });

    expect(result).toBe(state);
    expect(events).toHaveLength(0);
    expect(state.groundObjects?.['girder-1']).toMatchObject({
      tonnage: 13,
      position: { q: 0, r: 0 },
    });
    expect(state.units['player-1'].carriedGroundObjectIds).toBeUndefined();
  });

  it('returns the original state and emits no event for an invalid drop', () => {
    const events: IGameEvent[] = [];
    const state = createState();

    const result = applyRunnerGroundObjectDrop({
      state,
      events,
      gameId: state.gameId,
      unitId: 'player-1',
      objectId: 'girder-1',
    });

    expect(result).toBe(state);
    expect(events).toHaveLength(0);
    expect(state.groundObjects?.['girder-1']).toMatchObject({
      position: { q: 0, r: 0 },
    });
  });

  it('emits a represented throw release event without resolving throw damage', () => {
    const events: IGameEvent[] = [];
    const state = createState();
    const pickedUp = applyRunnerGroundObjectPickup({
      state,
      events,
      gameId: state.gameId,
      unitId: 'player-1',
      objectId: 'girder-1',
    });

    const thrown = applyRunnerGroundObjectThrow({
      state: pickedUp,
      events,
      gameId: pickedUp.gameId,
      unitId: 'player-1',
      objectId: 'girder-1',
      to: { q: 2, r: -1 },
    });

    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      type: GameEventType.GroundObjectDropped,
      sequence: 1,
      turn: 3,
      phase: GamePhase.Movement,
      actorId: 'player-1',
      payload: {
        unitId: 'player-1',
        objectId: 'girder-1',
        to: { q: 2, r: -1 },
        reason: 'throw',
      },
    });
    expect(thrown.units['player-1']).toMatchObject({
      leftArmCarryingCargo: false,
      rightArmCarryingCargo: false,
      carriedGroundObjectIds: [],
      isLoadingOrUnloadingCargo: true,
    });
    expect(thrown.groundObjects?.['girder-1']).toMatchObject({
      position: { q: 2, r: -1 },
    });
    expect(thrown.groundObjects?.['girder-1'].carriedByUnitId).toBeUndefined();
    expect(thrown.groundObjects?.['girder-1'].carryLocation).toBeUndefined();
  });
});
