/**
 * Game State Tests
 *
 * Tests for event-sourced game state derivation.
 */

import {
  createInitialUnitState,
  createInitialGameState,
  applyEvent,
  deriveState,
  deriveStateAtSequence,
  deriveStateAtTurn,
  getActiveUnits,
  getUnitsAwaitingAction,
  allUnitsLocked,
  isGameOver,
  checkVictoryConditions,
} from '../gameState';
import {
  GameEventType,
  GamePhase,
  GameStatus,
  GameSide,
  LockState,
  Facing,
  MovementType,
  IGameEvent,
  IGameUnit,
  IUnitGameState,
  IGameConfig,
  IGameState,
  IGameCreatedPayload,
  IGameStartedPayload,
  IGameEndedPayload,
  IPhaseChangedPayload,
  IInitiativeRolledPayload,
  IMovementDeclaredPayload,
  IDamageAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Test Mech',
    side: GameSide.Player,
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function createTestConfig(overrides: Partial<IGameConfig> = {}): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    ...overrides,
  };
}

function createTestEvent(overrides: Partial<IGameEvent> = {}): IGameEvent {
  return {
    id: 'event-1',
    gameId: 'game-1',
    sequence: 1,
    timestamp: '2024-01-01T00:00:00Z',
    type: GameEventType.GameCreated,
    turn: 0,
    phase: GamePhase.Initiative,
    payload: {},
    ...overrides,
  } as IGameEvent;
}

// =============================================================================
// createInitialUnitState Tests
// =============================================================================

describe('createInitialUnitState', () => {
  it('should create unit state with correct initial values', () => {
    const unit = createTestUnit();
    const position = { q: 0, r: 0 };
    
    const state = createInitialUnitState(unit, position);
    
    expect(state.id).toBe(unit.id);
    expect(state.side).toBe(unit.side);
    expect(state.position).toEqual(position);
    expect(state.facing).toBe(Facing.North);
    expect(state.heat).toBe(0);
    expect(state.movementThisTurn).toBe(MovementType.Stationary);
    expect(state.hexesMovedThisTurn).toBe(0);
    expect(state.pilotWounds).toBe(0);
    expect(state.pilotConscious).toBe(true);
    expect(state.destroyed).toBe(false);
    expect(state.lockState).toBe(LockState.Pending);
  });

  it('should use provided facing', () => {
    const unit = createTestUnit();
    const position = { q: 0, r: 0 };
    
    const state = createInitialUnitState(unit, position, Facing.South);
    
    expect(state.facing).toBe(Facing.South);
  });

  it('should initialize empty collections', () => {
    const unit = createTestUnit();
    const position = { q: 0, r: 0 };
    
    const state = createInitialUnitState(unit, position);
    
    expect(state.armor).toEqual({});
    expect(state.structure).toEqual({});
    expect(state.destroyedLocations).toEqual([]);
    expect(state.destroyedEquipment).toEqual([]);
    expect(state.ammo).toEqual({});
  });
});

// =============================================================================
// createInitialGameState Tests
// =============================================================================

describe('createInitialGameState', () => {
  it('should create game state with setup status', () => {
    const state = createInitialGameState('game-1');
    
    expect(state.gameId).toBe('game-1');
    expect(state.status).toBe(GameStatus.Setup);
    expect(state.turn).toBe(0);
    expect(state.phase).toBe(GamePhase.Initiative);
    expect(state.activationIndex).toBe(0);
    expect(state.units).toEqual({});
    expect(state.turnEvents).toEqual([]);
  });
});

// =============================================================================
// applyEvent Tests - GameCreated
// =============================================================================

describe('applyEvent - GameCreated', () => {
  it('should create units from GameCreated event', () => {
    const initialState = createInitialGameState('game-1');
    const units: IGameUnit[] = [
      createTestUnit({ id: 'unit-1', side: GameSide.Player }),
      createTestUnit({ id: 'unit-2', side: GameSide.Opponent }),
    ];
    
    const event = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units,
      } as IGameCreatedPayload,
    });
    
    const newState = applyEvent(initialState, event);
    
    expect(newState.status).toBe(GameStatus.Setup);
    expect(Object.keys(newState.units)).toHaveLength(2);
    expect(newState.units['unit-1']).toBeDefined();
    expect(newState.units['unit-2']).toBeDefined();
  });

  it('should assign starting positions based on side', () => {
    const initialState = createInitialGameState('game-1');
    const units: IGameUnit[] = [
      createTestUnit({ id: 'player-1', side: GameSide.Player }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    
    const event = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units,
      } as IGameCreatedPayload,
    });
    
    const newState = applyEvent(initialState, event);
    
    // Player faces north, opponent faces south
    expect(newState.units['player-1'].facing).toBe(Facing.North);
    expect(newState.units['opponent-1'].facing).toBe(Facing.South);
  });
});

// =============================================================================
// applyEvent Tests - GameStarted
// =============================================================================

describe('applyEvent - GameStarted', () => {
  it('should set game to active status', () => {
    const initialState = createInitialGameState('game-1');
    
    const event = createTestEvent({
      type: GameEventType.GameStarted,
      payload: {
        firstSide: GameSide.Player,
      } as IGameStartedPayload,
    });
    
    const newState = applyEvent(initialState, event);
    
    expect(newState.status).toBe(GameStatus.Active);
    expect(newState.turn).toBe(1);
    expect(newState.phase).toBe(GamePhase.Initiative);
    expect(newState.firstMover).toBe(GameSide.Player);
  });
});

// =============================================================================
// applyEvent Tests - GameEnded
// =============================================================================

describe('applyEvent - GameEnded', () => {
  it('should set game to completed with result', () => {
    const initialState = createInitialGameState('game-1');
    
    const event = createTestEvent({
      type: GameEventType.GameEnded,
      payload: {
        winner: GameSide.Player,
        reason: 'destruction',
      } as IGameEndedPayload,
    });
    
    const newState = applyEvent(initialState, event);
    
    expect(newState.status).toBe(GameStatus.Completed);
    expect(newState.result?.winner).toBe(GameSide.Player);
    expect(newState.result?.reason).toBe('destruction');
  });

  it('should handle draw result', () => {
    const initialState = createInitialGameState('game-1');
    
    const event = createTestEvent({
      type: GameEventType.GameEnded,
      payload: {
        winner: 'draw',
        reason: 'turn_limit',
      } as IGameEndedPayload,
    });
    
    const newState = applyEvent(initialState, event);
    
    expect(newState.result?.winner).toBe('draw');
  });
});

// =============================================================================
// applyEvent Tests - PhaseChanged
// =============================================================================

describe('applyEvent - PhaseChanged', () => {
  it('should update phase and reset lock states', () => {
    let state = createInitialGameState('game-1');
    
    // Create a unit
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    // Change phase
    const phaseEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PhaseChanged,
      payload: {
        fromPhase: GamePhase.Initiative,
        toPhase: GamePhase.Movement,
      } as IPhaseChangedPayload,
    });
    
    const newState = applyEvent(state, phaseEvent);
    
    expect(newState.phase).toBe(GamePhase.Movement);
    expect(newState.activationIndex).toBe(0);
    expect(newState.units['unit-1'].lockState).toBe(LockState.Pending);
  });

  it('should reset movement tracking when entering movement phase', () => {
    let state = createInitialGameState('game-1');
    
    // Create a unit and set some movement values
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    // Manually set movement values for testing
    state = {
      ...state,
      units: {
        ...state.units,
        'unit-1': {
          ...state.units['unit-1'],
          movementThisTurn: MovementType.Walk,
          hexesMovedThisTurn: 4,
        },
      },
    };
    
    // Change to movement phase
    const phaseEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PhaseChanged,
      payload: {
        fromPhase: GamePhase.End,
        toPhase: GamePhase.Movement,
      } as IPhaseChangedPayload,
    });
    
    const newState = applyEvent(state, phaseEvent);
    
    expect(newState.units['unit-1'].movementThisTurn).toBe(MovementType.Stationary);
    expect(newState.units['unit-1'].hexesMovedThisTurn).toBe(0);
  });
});

// =============================================================================
// applyEvent Tests - TurnStarted
// =============================================================================

describe('applyEvent - TurnStarted', () => {
  it('should update turn number and reset events', () => {
    const initialState = createInitialGameState('game-1');
    
    const event = createTestEvent({
      type: GameEventType.TurnStarted,
      turn: 2,
      payload: {},
    });
    
    const newState = applyEvent(initialState, event);
    
    expect(newState.turn).toBe(2);
    expect(newState.phase).toBe(GamePhase.Initiative);
    expect(newState.activationIndex).toBe(0);
    expect(newState.turnEvents).toContain(event);
  });
});

// =============================================================================
// applyEvent Tests - InitiativeRolled
// =============================================================================

describe('applyEvent - InitiativeRolled', () => {
  it('should set initiative winner and first mover', () => {
    const initialState = createInitialGameState('game-1');
    
    const event = createTestEvent({
      type: GameEventType.InitiativeRolled,
      payload: {
        playerRoll: 8,
        opponentRoll: 5,
        winner: GameSide.Player,
        movesFirst: GameSide.Opponent,
      } as IInitiativeRolledPayload,
    });
    
    const newState = applyEvent(initialState, event);
    
    expect(newState.initiativeWinner).toBe(GameSide.Player);
    expect(newState.firstMover).toBe(GameSide.Opponent);
  });
});

// =============================================================================
// applyEvent Tests - MovementDeclared
// =============================================================================

describe('applyEvent - MovementDeclared', () => {
  it('should update unit position and movement state', () => {
    let state = createInitialGameState('game-1');
    
    // Create a unit
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    // Declare movement
    const movementEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: 'unit-1',
        from: { q: -2, r: 5 },
        to: { q: 0, r: 3 },
        facing: Facing.Northeast,
        movementType: MovementType.Run,
        mpUsed: 8,
        heatGenerated: 2,
      } as IMovementDeclaredPayload,
    });
    
    const newState = applyEvent(state, movementEvent);
    const unit = newState.units['unit-1'];
    
    expect(unit.position).toEqual({ q: 0, r: 3 });
    expect(unit.facing).toBe(Facing.Northeast);
    expect(unit.movementThisTurn).toBe(MovementType.Run);
    expect(unit.hexesMovedThisTurn).toBe(8);
    expect(unit.heat).toBe(2);
    expect(unit.lockState).toBe(LockState.Planning);
  });

  it('should accumulate heat', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    // Set initial heat
    state = {
      ...state,
      units: {
        ...state.units,
        'unit-1': { ...state.units['unit-1'], heat: 5 },
      },
    };
    
    const movementEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: 'unit-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 1 },
        facing: Facing.North,
        movementType: MovementType.Jump,
        mpUsed: 4,
        heatGenerated: 4,
      } as IMovementDeclaredPayload,
    });
    
    const newState = applyEvent(state, movementEvent);
    
    expect(newState.units['unit-1'].heat).toBe(9); // 5 + 4
  });
});

// =============================================================================
// applyEvent Tests - MovementLocked
// =============================================================================

describe('applyEvent - MovementLocked', () => {
  it('should lock unit movement and increment activation index', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const lockEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementLocked,
      actorId: 'unit-1',
      payload: {},
    });
    
    const newState = applyEvent(state, lockEvent);
    
    expect(newState.units['unit-1'].lockState).toBe(LockState.Locked);
    expect(newState.activationIndex).toBe(1);
  });
});

// =============================================================================
// applyEvent Tests - DamageApplied
// =============================================================================

describe('applyEvent - DamageApplied', () => {
  it('should update armor and structure', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const damageEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DamageApplied,
      payload: {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 15,
        structureRemaining: 16,
        locationDestroyed: false,
      } as IDamageAppliedPayload,
    });
    
    const newState = applyEvent(state, damageEvent);
    const unit = newState.units['unit-1'];
    
    expect(unit.armor['center_torso']).toBe(15);
    expect(unit.structure['center_torso']).toBe(16);
  });

  it('should track destroyed locations', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const damageEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DamageApplied,
      payload: {
        unitId: 'unit-1',
        location: 'left_arm',
        damage: 20,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } as IDamageAppliedPayload,
    });
    
    const newState = applyEvent(state, damageEvent);
    
    expect(newState.units['unit-1'].destroyedLocations).toContain('left_arm');
  });

  it('should track critical hits', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const damageEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DamageApplied,
      payload: {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 5,
        armorRemaining: 0,
        structureRemaining: 10,
        locationDestroyed: false,
        criticals: ['engine', 'gyro'],
      } as IDamageAppliedPayload,
    });
    
    const newState = applyEvent(state, damageEvent);
    
    expect(newState.units['unit-1'].destroyedEquipment).toContain('engine');
    expect(newState.units['unit-1'].destroyedEquipment).toContain('gyro');
  });
});

// =============================================================================
// applyEvent Tests - HeatGenerated/HeatDissipated
// =============================================================================

describe('applyEvent - Heat events', () => {
  it('should update heat on HeatGenerated', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const heatEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.HeatGenerated,
      payload: {
        unitId: 'unit-1',
        amount: 5,
        source: 'weapons',
        newTotal: 8,
      } as IHeatPayload,
    });
    
    const newState = applyEvent(state, heatEvent);
    
    expect(newState.units['unit-1'].heat).toBe(8);
  });

  it('should update heat on HeatDissipated', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    // Set initial heat
    state = {
      ...state,
      units: {
        ...state.units,
        'unit-1': { ...state.units['unit-1'], heat: 15 },
      },
    };
    
    const heatEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.HeatDissipated,
      payload: {
        unitId: 'unit-1',
        amount: -10,
        source: 'dissipation',
        newTotal: 5,
      } as IHeatPayload,
    });
    
    const newState = applyEvent(state, heatEvent);
    
    expect(newState.units['unit-1'].heat).toBe(5);
  });
});

// =============================================================================
// applyEvent Tests - PilotHit
// =============================================================================

describe('applyEvent - PilotHit', () => {
  it('should update pilot wounds', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const pilotHitEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PilotHit,
      payload: {
        unitId: 'unit-1',
        wounds: 1,
        totalWounds: 2,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      } as IPilotHitPayload,
    });
    
    const newState = applyEvent(state, pilotHitEvent);
    
    expect(newState.units['unit-1'].pilotWounds).toBe(2);
    expect(newState.units['unit-1'].pilotConscious).toBe(true);
  });

  it('should handle consciousness check failure', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const pilotHitEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PilotHit,
      payload: {
        unitId: 'unit-1',
        wounds: 2,
        totalWounds: 4,
        source: 'ammo_explosion',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: false,
      } as IPilotHitPayload,
    });
    
    const newState = applyEvent(state, pilotHitEvent);
    
    expect(newState.units['unit-1'].pilotConscious).toBe(false);
  });
});

// =============================================================================
// applyEvent Tests - UnitDestroyed
// =============================================================================

describe('applyEvent - UnitDestroyed', () => {
  it('should mark unit as destroyed', () => {
    let state = createInitialGameState('game-1');
    
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    
    const destroyedEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.UnitDestroyed,
      payload: {
        unitId: 'unit-1',
        cause: 'damage',
      } as IUnitDestroyedPayload,
    });
    
    const newState = applyEvent(state, destroyedEvent);
    
    expect(newState.units['unit-1'].destroyed).toBe(true);
  });
});

// =============================================================================
// deriveState Tests
// =============================================================================

describe('deriveState', () => {
  it('should apply all events in sequence', () => {
    const events: IGameEvent[] = [
      createTestEvent({
        id: 'e1',
        sequence: 1,
        type: GameEventType.GameCreated,
        payload: {
          config: createTestConfig(),
          units: [createTestUnit()],
        } as IGameCreatedPayload,
      }),
      createTestEvent({
        id: 'e2',
        sequence: 2,
        type: GameEventType.GameStarted,
        payload: { firstSide: GameSide.Player } as IGameStartedPayload,
      }),
    ];
    
    const state = deriveState('game-1', events);
    
    expect(state.status).toBe(GameStatus.Active);
    expect(state.turn).toBe(1);
    expect(Object.keys(state.units)).toHaveLength(1);
  });

  it('should return initial state for empty events', () => {
    const state = deriveState('game-1', []);
    
    expect(state.gameId).toBe('game-1');
    expect(state.status).toBe(GameStatus.Setup);
    expect(state.units).toEqual({});
  });
});

// =============================================================================
// deriveStateAtSequence Tests
// =============================================================================

describe('deriveStateAtSequence', () => {
  it('should only apply events up to sequence number', () => {
    const events: IGameEvent[] = [
      createTestEvent({
        id: 'e1',
        sequence: 1,
        type: GameEventType.GameCreated,
        payload: {
          config: createTestConfig(),
          units: [createTestUnit()],
        } as IGameCreatedPayload,
      }),
      createTestEvent({
        id: 'e2',
        sequence: 2,
        type: GameEventType.GameStarted,
        payload: { firstSide: GameSide.Player } as IGameStartedPayload,
      }),
      createTestEvent({
        id: 'e3',
        sequence: 3,
        type: GameEventType.GameEnded,
        payload: { winner: GameSide.Player, reason: 'destruction' } as IGameEndedPayload,
      }),
    ];
    
    const state = deriveStateAtSequence('game-1', events, 2);
    
    // Should not have the GameEnded event applied
    expect(state.status).toBe(GameStatus.Active);
    expect(state.result).toBeUndefined();
  });
});

// =============================================================================
// deriveStateAtTurn Tests
// =============================================================================

describe('deriveStateAtTurn', () => {
  it('should only apply events up to specified turn', () => {
    const events: IGameEvent[] = [
      createTestEvent({
        id: 'e1',
        sequence: 1,
        turn: 0,
        type: GameEventType.GameCreated,
        payload: {
          config: createTestConfig(),
          units: [createTestUnit()],
        } as IGameCreatedPayload,
      }),
      createTestEvent({
        id: 'e2',
        sequence: 2,
        turn: 1,
        type: GameEventType.GameStarted,
        payload: { firstSide: GameSide.Player } as IGameStartedPayload,
      }),
      createTestEvent({
        id: 'e3',
        sequence: 3,
        turn: 2,
        type: GameEventType.TurnStarted,
        payload: {},
      }),
    ];
    
    const state = deriveStateAtTurn('game-1', events, 1);
    
    expect(state.turn).toBe(1);
  });
});

// =============================================================================
// State Query Functions
// =============================================================================

describe('getActiveUnits', () => {
  it('should return non-destroyed conscious units for a side', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: false, pilotConscious: true },
      { id: 'p2', side: GameSide.Player, destroyed: true, pilotConscious: true },
      { id: 'p3', side: GameSide.Player, destroyed: false, pilotConscious: false },
      { id: 'o1', side: GameSide.Opponent, destroyed: false, pilotConscious: true },
    ]);
    
    const playerUnits = getActiveUnits(state, GameSide.Player);
    
    expect(playerUnits).toHaveLength(1);
    expect(playerUnits[0].id).toBe('p1');
  });
});

describe('getUnitsAwaitingAction', () => {
  it('should return units with pending lock state', () => {
    const state = createStateWithUnits([
      { id: 'u1', lockState: LockState.Pending, destroyed: false, pilotConscious: true },
      { id: 'u2', lockState: LockState.Locked, destroyed: false, pilotConscious: true },
      { id: 'u3', lockState: LockState.Pending, destroyed: true, pilotConscious: true },
    ]);
    
    const awaiting = getUnitsAwaitingAction(state);
    
    expect(awaiting).toHaveLength(1);
    expect(awaiting[0].id).toBe('u1');
  });
});

describe('allUnitsLocked', () => {
  it('should return true when all active units are locked', () => {
    const state = createStateWithUnits([
      { id: 'u1', lockState: LockState.Locked, destroyed: false, pilotConscious: true },
      { id: 'u2', lockState: LockState.Resolved, destroyed: false, pilotConscious: true },
      { id: 'u3', lockState: LockState.Pending, destroyed: true, pilotConscious: true },
    ]);
    
    expect(allUnitsLocked(state)).toBe(true);
  });

  it('should return false when any active unit is not locked', () => {
    const state = createStateWithUnits([
      { id: 'u1', lockState: LockState.Locked, destroyed: false, pilotConscious: true },
      { id: 'u2', lockState: LockState.Pending, destroyed: false, pilotConscious: true },
    ]);
    
    expect(allUnitsLocked(state)).toBe(false);
  });
});

describe('isGameOver', () => {
  it('should return true for completed games', () => {
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Completed,
    };
    
    expect(isGameOver(state)).toBe(true);
  });

  it('should return true for abandoned games', () => {
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Abandoned,
    };
    
    expect(isGameOver(state)).toBe(true);
  });

  it('should return false for active games', () => {
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Active,
    };
    
    expect(isGameOver(state)).toBe(false);
  });
});

// =============================================================================
// Victory Conditions
// =============================================================================

describe('checkVictoryConditions', () => {
  const config = createTestConfig();

  it('should return null when game continues', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: false },
      { id: 'o1', side: GameSide.Opponent, destroyed: false },
    ]);
    
    const result = checkVictoryConditions(state, config);
    
    expect(result).toBeNull();
  });

  it('should return opponent victory when player is eliminated', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: true },
      { id: 'o1', side: GameSide.Opponent, destroyed: false },
    ]);
    
    const result = checkVictoryConditions(state, config);
    
    expect(result).toBe(GameSide.Opponent);
  });

  it('should return player victory when opponent is eliminated', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: false },
      { id: 'o1', side: GameSide.Opponent, destroyed: true },
    ]);
    
    const result = checkVictoryConditions(state, config);
    
    expect(result).toBe(GameSide.Player);
  });

  it('should return draw when both sides are eliminated', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: true },
      { id: 'o1', side: GameSide.Opponent, destroyed: true },
    ]);
    
    const result = checkVictoryConditions(state, config);
    
    expect(result).toBe('draw');
  });

  it('should determine winner by surviving units at turn limit', () => {
    const configWithLimit = createTestConfig({ turnLimit: 10 });
    const state = createStateWithUnits(
      [
        { id: 'p1', side: GameSide.Player, destroyed: false },
        { id: 'p2', side: GameSide.Player, destroyed: false },
        { id: 'o1', side: GameSide.Opponent, destroyed: false },
      ],
      { turn: 11 }
    );
    
    const result = checkVictoryConditions(state, configWithLimit);
    
    expect(result).toBe(GameSide.Player); // 2 vs 1
  });

  it('should return draw at turn limit with equal forces', () => {
    const configWithLimit = createTestConfig({ turnLimit: 10 });
    const state = createStateWithUnits(
      [
        { id: 'p1', side: GameSide.Player, destroyed: false },
        { id: 'o1', side: GameSide.Opponent, destroyed: false },
      ],
      { turn: 11 }
    );
    
    const result = checkVictoryConditions(state, configWithLimit);
    
    expect(result).toBe('draw');
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

interface TestUnitOverrides {
  id: string;
  side?: GameSide;
  destroyed?: boolean;
  pilotConscious?: boolean;
  lockState?: LockState;
}

function createStateWithUnits(
  units: TestUnitOverrides[],
  stateOverrides: Partial<IGameState> = {}
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
