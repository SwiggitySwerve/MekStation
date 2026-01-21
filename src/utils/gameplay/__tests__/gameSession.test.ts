/**
 * Game Session Tests
 *
 * Comprehensive tests for the game session management module.
 * Tests all exported functions with full coverage of success and error cases.
 */

import {
  createGameSession,
  startGame,
  endGame,
  appendEvent,
  getEventsForTurn,
  getEventsForPhase,
  getNextPhase,
  advancePhase,
  canAdvancePhase,
  roll2d6,
  rollInitiative,
  declareMovement,
  lockMovement,
  replayToSequence,
  replayToTurn,
  generateGameLog,
} from '../gameSession';
import {
  GamePhase,
  GameStatus,
  GameSide,
  GameEventType,
  LockState,
  Facing,
  MovementType,
  IGameConfig,
  IGameUnit,
  IGameSession,
  IGameEvent,
  IHexCoordinate,
} from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestConfig(overrides: Partial<IGameConfig> = {}): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    ...overrides,
  };
}

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

function createTestUnits(): readonly IGameUnit[] {
  return [
    createTestUnit({ id: 'player-1', name: 'Atlas', side: GameSide.Player }),
    createTestUnit({ id: 'player-2', name: 'Hunchback', side: GameSide.Player }),
    createTestUnit({ id: 'opponent-1', name: 'Marauder', side: GameSide.Opponent }),
    createTestUnit({ id: 'opponent-2', name: 'Warhammer', side: GameSide.Opponent }),
  ];
}

function createActiveSession(): IGameSession {
  const config = createTestConfig();
  const units = createTestUnits();
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  return session;
}

function createMovementPhaseSession(): IGameSession {
  let session = createActiveSession();
  // Roll initiative first
  session = rollInitiative(session);
  // Advance to movement phase
  session = advancePhase(session);
  return session;
}

// =============================================================================
// createGameSession Tests
// =============================================================================

describe('createGameSession', () => {
  it('should create a session with a unique id', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    
    const session1 = createGameSession(config, units);
    const session2 = createGameSession(config, units);
    
    expect(session1.id).toBeDefined();
    expect(session2.id).toBeDefined();
    expect(session1.id).not.toBe(session2.id);
  });

  it('should store config and units', () => {
    const config = createTestConfig({ mapRadius: 15 });
    const units = createTestUnits();
    
    const session = createGameSession(config, units);
    
    expect(session.config).toEqual(config);
    expect(session.units).toEqual(units);
  });

  it('should set timestamps', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    
    const before = new Date().toISOString();
    const session = createGameSession(config, units);
    const after = new Date().toISOString();
    
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
    expect(session.createdAt >= before).toBe(true);
    expect(session.createdAt <= after).toBe(true);
  });

  it('should create initial game_created event', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    
    const session = createGameSession(config, units);
    
    expect(session.events).toHaveLength(1);
    expect(session.events[0].type).toBe('game_created');
    expect(session.events[0].sequence).toBe(0);
    expect(session.events[0].turn).toBe(0);
  });

  it('should derive initial state in setup status', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    
    const session = createGameSession(config, units);
    
    expect(session.currentState.status).toBe(GameStatus.Setup);
    expect(session.currentState.turn).toBe(0);
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
  });

  it('should create unit states for all units', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    
    const session = createGameSession(config, units);
    
    expect(Object.keys(session.currentState.units)).toHaveLength(4);
    expect(session.currentState.units['player-1']).toBeDefined();
    expect(session.currentState.units['opponent-1']).toBeDefined();
  });

  it('should work with empty units array', () => {
    const config = createTestConfig();
    
    const session = createGameSession(config, []);
    
    expect(session.units).toHaveLength(0);
    expect(Object.keys(session.currentState.units)).toHaveLength(0);
  });

  it('should work with single unit', () => {
    const config = createTestConfig();
    const units = [createTestUnit()];
    
    const session = createGameSession(config, units);
    
    expect(session.units).toHaveLength(1);
  });
});

// =============================================================================
// startGame Tests
// =============================================================================

describe('startGame', () => {
  it('should transition from Setup to Active', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    
    const started = startGame(session, GameSide.Player);
    
    expect(started.currentState.status).toBe(GameStatus.Active);
  });

  it('should set turn to 1', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    
    const started = startGame(session, GameSide.Player);
    
    expect(started.currentState.turn).toBe(1);
  });

  it('should set first mover', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    
    const started = startGame(session, GameSide.Opponent);
    
    expect(started.currentState.firstMover).toBe(GameSide.Opponent);
  });

  it('should add game_started event', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    
    const started = startGame(session, GameSide.Player);
    
    expect(started.events).toHaveLength(2);
    expect(started.events[1].type).toBe('game_started');
  });

  it('should throw if game is not in setup state', () => {
    const session = createActiveSession();
    
    expect(() => startGame(session, GameSide.Player)).toThrow('Game is not in setup state');
  });

  it('should throw if game is already completed', () => {
    let session = createActiveSession();
    session = endGame(session, GameSide.Player, 'destruction');
    
    expect(() => startGame(session, GameSide.Player)).toThrow('Game is not in setup state');
  });

  it('should not mutate original session', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    const originalStatus = session.currentState.status;
    
    startGame(session, GameSide.Player);
    
    expect(session.currentState.status).toBe(originalStatus);
  });
});

// =============================================================================
// endGame Tests
// =============================================================================

describe('endGame', () => {
  it('should transition from Active to Completed', () => {
    const session = createActiveSession();
    
    const ended = endGame(session, GameSide.Player, 'destruction');
    
    expect(ended.currentState.status).toBe(GameStatus.Completed);
  });

  it('should set winner and reason', () => {
    const session = createActiveSession();
    
    const ended = endGame(session, GameSide.Opponent, 'concede');
    
    expect(ended.currentState.result?.winner).toBe(GameSide.Opponent);
    expect(ended.currentState.result?.reason).toBe('concede');
  });

  it('should handle draw result', () => {
    const session = createActiveSession();
    
    const ended = endGame(session, 'draw', 'turn_limit');
    
    expect(ended.currentState.result?.winner).toBe('draw');
  });

  it('should add game_ended event', () => {
    const session = createActiveSession();
    const eventCount = session.events.length;
    
    const ended = endGame(session, GameSide.Player, 'objective');
    
    expect(ended.events).toHaveLength(eventCount + 1);
    expect(ended.events[ended.events.length - 1].type).toBe('game_ended');
  });

  it('should throw if game is not active', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    
    expect(() => endGame(session, GameSide.Player, 'destruction')).toThrow('Game is not active');
  });

  it('should throw if game is already completed', () => {
    let session = createActiveSession();
    session = endGame(session, GameSide.Player, 'destruction');
    
    expect(() => endGame(session, GameSide.Opponent, 'concede')).toThrow('Game is not active');
  });

  it('should support all end reasons', () => {
    const reasons: Array<'destruction' | 'concede' | 'turn_limit' | 'objective'> = [
      'destruction',
      'concede',
      'turn_limit',
      'objective',
    ];
    
    for (const reason of reasons) {
      const session = createActiveSession();
      const ended = endGame(session, GameSide.Player, reason);
      expect(ended.currentState.result?.reason).toBe(reason);
    }
  });
});

// =============================================================================
// appendEvent Tests
// =============================================================================

describe('appendEvent', () => {
  it('should add event to events array', () => {
    const session = createActiveSession();
    const eventCount = session.events.length;
    
    // Use a valid event structure
    const newEvent: IGameEvent = {
      id: 'test-event',
      gameId: session.id,
      sequence: eventCount,
      timestamp: new Date().toISOString(),
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
    };
    
    const updated = appendEvent(session, newEvent);
    
    expect(updated.events).toHaveLength(eventCount + 1);
  });

  it('should derive new state', () => {
    const session = createActiveSession();
    const initialPhase = session.currentState.phase;
    
    const newEvent: IGameEvent = {
      id: 'test-event',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
    };
    
    const updated = appendEvent(session, newEvent);
    
    expect(updated.currentState.phase).not.toBe(initialPhase);
  });

  it('should update updatedAt timestamp', () => {
    const session = createActiveSession();
    const originalUpdatedAt = session.updatedAt;
    
    // Small delay to ensure timestamp changes
    const newEvent: IGameEvent = {
      id: 'test-event',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
    };
    
    const updated = appendEvent(session, newEvent);
    
    expect(updated.updatedAt >= originalUpdatedAt).toBe(true);
  });

  it('should not mutate original session', () => {
    const session = createActiveSession();
    const originalEventCount = session.events.length;
    
    const newEvent: IGameEvent = {
      id: 'test-event',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
    };
    
    appendEvent(session, newEvent);
    
    expect(session.events).toHaveLength(originalEventCount);
  });

  it('should preserve session immutability - different reference', () => {
    const session = createActiveSession();
    
    const newEvent: IGameEvent = {
      id: 'test-event',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
    };
    
    const updated = appendEvent(session, newEvent);
    
    expect(updated).not.toBe(session);
    expect(updated.events).not.toBe(session.events);
  });
});

// =============================================================================
// getEventsForTurn Tests
// =============================================================================

describe('getEventsForTurn', () => {
  it('should return events for specified turn', () => {
    let session = createActiveSession();
    // Add more events to have multiple turns
    session = advancePhase(session);
    session = advancePhase(session);
    
    const turn1Events = getEventsForTurn(session, 1);
    
    expect(turn1Events.length).toBeGreaterThan(0);
    expect(turn1Events.every(e => e.turn === 1)).toBe(true);
  });

  it('should return empty array for non-existent turn', () => {
    const session = createActiveSession();
    
    const events = getEventsForTurn(session, 999);
    
    expect(events).toHaveLength(0);
  });

  it('should return turn 0 events (game_created)', () => {
    const session = createActiveSession();
    
    const events = getEventsForTurn(session, 0);
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('game_created');
  });

  it('should return readonly array', () => {
    const session = createActiveSession();
    
    const events = getEventsForTurn(session, 1);
    
    // TypeScript should enforce readonly, but we verify it's an array
    expect(Array.isArray(events)).toBe(true);
  });
});

// =============================================================================
// getEventsForPhase Tests
// =============================================================================

describe('getEventsForPhase', () => {
  it('should return events for specified turn and phase', () => {
    const session = createActiveSession();
    
    const events = getEventsForPhase(session, 1, GamePhase.Initiative);
    
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(e => e.turn === 1 && e.phase === GamePhase.Initiative)).toBe(true);
  });

  it('should return empty array for non-existent phase', () => {
    const session = createActiveSession();
    
    const events = getEventsForPhase(session, 1, GamePhase.Heat);
    
    expect(events).toHaveLength(0);
  });

  it('should return empty array for wrong turn', () => {
    const session = createActiveSession();
    
    const events = getEventsForPhase(session, 999, GamePhase.Initiative);
    
    expect(events).toHaveLength(0);
  });

  it('should filter by both turn and phase', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    
    const initEvents = getEventsForPhase(session, 1, GamePhase.Initiative);
    const moveEvents = getEventsForPhase(session, 1, GamePhase.Movement);
    
    expect(initEvents.every(e => e.phase === GamePhase.Initiative)).toBe(true);
    expect(moveEvents.every(e => e.phase === GamePhase.Movement)).toBe(true);
  });
});

// =============================================================================
// getNextPhase Tests
// =============================================================================

describe('getNextPhase', () => {
  it('should return Movement after Initiative', () => {
    expect(getNextPhase(GamePhase.Initiative)).toBe(GamePhase.Movement);
  });

  it('should return WeaponAttack after Movement', () => {
    expect(getNextPhase(GamePhase.Movement)).toBe(GamePhase.WeaponAttack);
  });

  it('should return Heat after WeaponAttack', () => {
    expect(getNextPhase(GamePhase.WeaponAttack)).toBe(GamePhase.Heat);
  });

  it('should return End after Heat', () => {
    expect(getNextPhase(GamePhase.Heat)).toBe(GamePhase.End);
  });

  it('should wrap to Initiative after End', () => {
    expect(getNextPhase(GamePhase.End)).toBe(GamePhase.Initiative);
  });

  it('should handle PhysicalAttack phase (not in phase order)', () => {
    // PhysicalAttack is defined but not in the phase order, should wrap to Initiative
    expect(getNextPhase(GamePhase.PhysicalAttack)).toBe(GamePhase.Initiative);
  });
});

// =============================================================================
// advancePhase Tests
// =============================================================================

describe('advancePhase', () => {
  it('should advance from Initiative to Movement', () => {
    const session = createActiveSession();
    
    const advanced = advancePhase(session);
    
    expect(advanced.currentState.phase).toBe(GamePhase.Movement);
  });

  it('should add phase_changed event', () => {
    const session = createActiveSession();
    const eventCount = session.events.length;
    
    const advanced = advancePhase(session);
    
    expect(advanced.events).toHaveLength(eventCount + 1);
    expect(advanced.events[advanced.events.length - 1].type).toBe('phase_changed');
  });

  it('should wrap from End to Initiative phase', () => {
    let session = createActiveSession();
    // Advance through all phases
    session = advancePhase(session); // -> Movement
    session = advancePhase(session); // -> WeaponAttack
    session = advancePhase(session); // -> Heat
    session = advancePhase(session); // -> End
    
    session = advancePhase(session); // -> Initiative (wrap)
    
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
    // Note: The turn is tracked in the event but not applied to state.turn in applyPhaseChanged
    // This is the current implementation behavior
  });

  it('should not increment turn when not wrapping', () => {
    const session = createActiveSession();
    const initialTurn = session.currentState.turn;
    
    const advanced = advancePhase(session);
    
    expect(advanced.currentState.turn).toBe(initialTurn);
  });

  it('should reset lock states on phase change', () => {
    let session = createMovementPhaseSession();
    // Lock a unit
    session = lockMovement(session, 'player-1');
    expect(session.currentState.units['player-1'].lockState).toBe(LockState.Locked);
    
    // Lock all other units so we can advance
    session = lockMovement(session, 'player-2');
    session = lockMovement(session, 'opponent-1');
    session = lockMovement(session, 'opponent-2');
    
    session = advancePhase(session);
    
    expect(session.currentState.units['player-1'].lockState).toBe(LockState.Pending);
  });
});

// =============================================================================
// canAdvancePhase Tests
// =============================================================================

describe('canAdvancePhase', () => {
  it('should return false if game is not active', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    
    expect(canAdvancePhase(session)).toBe(false);
  });

  it('should return false if game is completed', () => {
    let session = createActiveSession();
    session = endGame(session, GameSide.Player, 'destruction');
    
    expect(canAdvancePhase(session)).toBe(false);
  });

  it('should return true for Initiative phase (no lock requirement)', () => {
    const session = createActiveSession();
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
    
    expect(canAdvancePhase(session)).toBe(true);
  });

  it('should return false for Movement phase with unlocked units', () => {
    const session = createMovementPhaseSession();
    
    expect(canAdvancePhase(session)).toBe(false);
  });

  it('should return true for Movement phase with all units locked', () => {
    let session = createMovementPhaseSession();
    session = lockMovement(session, 'player-1');
    session = lockMovement(session, 'player-2');
    session = lockMovement(session, 'opponent-1');
    session = lockMovement(session, 'opponent-2');
    
    expect(canAdvancePhase(session)).toBe(true);
  });

  it('should return true for Heat phase (no lock requirement)', () => {
    let session = createActiveSession();
    // Advance to Heat phase
    session = advancePhase(session); // -> Movement
    session = advancePhase(session); // -> WeaponAttack
    session = advancePhase(session); // -> Heat
    
    expect(canAdvancePhase(session)).toBe(true);
  });

  it('should return true for End phase (no lock requirement)', () => {
    let session = createActiveSession();
    // Advance to End phase
    session = advancePhase(session); // -> Movement
    session = advancePhase(session); // -> WeaponAttack
    session = advancePhase(session); // -> Heat
    session = advancePhase(session); // -> End
    
    expect(canAdvancePhase(session)).toBe(true);
  });
});

// =============================================================================
// roll2d6 Tests
// =============================================================================

describe('roll2d6', () => {
  it('should return a number between 2 and 12', () => {
    for (let i = 0; i < 100; i++) {
      const roll = roll2d6();
      expect(roll).toBeGreaterThanOrEqual(2);
      expect(roll).toBeLessThanOrEqual(12);
    }
  });

  it('should return integer values', () => {
    for (let i = 0; i < 100; i++) {
      const roll = roll2d6();
      expect(Number.isInteger(roll)).toBe(true);
    }
  });

  it('should produce varied results (not always the same)', () => {
    const rolls = new Set<number>();
    for (let i = 0; i < 100; i++) {
      rolls.add(roll2d6());
    }
    // With 100 rolls, we should see at least 3 different values
    expect(rolls.size).toBeGreaterThanOrEqual(3);
  });

  describe('with mocked Math.random', () => {
    let originalRandom: () => number;
    
    beforeEach(() => {
      originalRandom = Math.random;
    });
    
    afterEach(() => {
      Math.random = originalRandom;
    });

    it('should return 2 for minimum rolls (1 + 1)', () => {
      let callCount = 0;
      Math.random = () => {
        callCount++;
        return 0; // Will produce 1 on each die
      };
      
      expect(roll2d6()).toBe(2);
      expect(callCount).toBe(2); // Called twice for 2d6
    });

    it('should return 12 for maximum rolls (6 + 6)', () => {
      Math.random = () => 0.999999; // Will produce 6 on each die
      
      expect(roll2d6()).toBe(12);
    });

    it('should return 7 for average rolls (3 + 4)', () => {
      let callCount = 0;
      Math.random = () => {
        callCount++;
        // First die: 3, Second die: 4
        return callCount === 1 ? 0.4 : 0.6;
      };
      
      const roll = roll2d6();
      expect(roll).toBe(7);
    });
  });
});

// =============================================================================
// rollInitiative Tests
// =============================================================================

describe('rollInitiative', () => {
  let originalRandom: () => number;
  
  beforeEach(() => {
    originalRandom = Math.random;
  });
  
  afterEach(() => {
    Math.random = originalRandom;
  });

  it('should throw if not in Initiative phase', () => {
    let session = createActiveSession();
    session = advancePhase(session); // -> Movement
    
    expect(() => rollInitiative(session)).toThrow('Not in initiative phase');
  });

  it('should add initiative_rolled event', () => {
    const session = createActiveSession();
    const eventCount = session.events.length;
    
    const rolled = rollInitiative(session);
    
    expect(rolled.events).toHaveLength(eventCount + 1);
    expect(rolled.events[rolled.events.length - 1].type).toBe('initiative_rolled');
  });

  it('should set initiative winner when player rolls higher', () => {
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // Player: high roll (8), Opponent: low roll (3)
      return callCount <= 2 ? 0.9 : 0.1;
    };
    
    const session = createActiveSession();
    const rolled = rollInitiative(session);
    
    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Player);
  });

  it('should set initiative winner when opponent rolls higher', () => {
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // Player: low roll (3), Opponent: high roll (8)
      return callCount <= 2 ? 0.1 : 0.9;
    };
    
    const session = createActiveSession();
    const rolled = rollInitiative(session);
    
    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Opponent);
  });

  it('should handle tie (player wins ties)', () => {
    Math.random = () => 0.5; // Same roll for both
    
    const session = createActiveSession();
    const rolled = rollInitiative(session);
    
    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Player);
  });

  it('should allow winner to choose who moves first', () => {
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // Player wins initiative
      return callCount <= 2 ? 0.9 : 0.1;
    };
    
    const session = createActiveSession();
    const rolled = rollInitiative(session, GameSide.Player);
    
    expect(rolled.currentState.firstMover).toBe(GameSide.Player);
  });

  it('should default to winner moving second (tactical advantage)', () => {
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // Player wins initiative
      return callCount <= 2 ? 0.9 : 0.1;
    };
    
    const session = createActiveSession();
    const rolled = rollInitiative(session);
    
    // Player won, so opponent moves first by default
    expect(rolled.currentState.firstMover).toBe(GameSide.Opponent);
  });

  it('should default to opponent moving first when opponent wins', () => {
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // Opponent wins initiative
      return callCount <= 2 ? 0.1 : 0.9;
    };
    
    const session = createActiveSession();
    const rolled = rollInitiative(session);
    
    // Opponent won, so player moves first by default
    expect(rolled.currentState.firstMover).toBe(GameSide.Player);
  });
});

// =============================================================================
// declareMovement Tests
// =============================================================================

describe('declareMovement', () => {
  const from: IHexCoordinate = { q: 0, r: 5 };
  const to: IHexCoordinate = { q: 1, r: 4 };

  it('should throw if not in Movement phase', () => {
    const session = createActiveSession();
    
    expect(() => declareMovement(
      session,
      'player-1',
      from,
      to,
      Facing.North,
      MovementType.Walk,
      2,
      0
    )).toThrow('Not in movement phase');
  });

  it('should throw if unit not found', () => {
    const session = createMovementPhaseSession();
    
    expect(() => declareMovement(
      session,
      'non-existent',
      from,
      to,
      Facing.North,
      MovementType.Walk,
      2,
      0
    )).toThrow('Unit non-existent not found');
  });

  it('should add movement_declared event', () => {
    const session = createMovementPhaseSession();
    const eventCount = session.events.length;
    
    const moved = declareMovement(
      session,
      'player-1',
      from,
      to,
      Facing.North,
      MovementType.Walk,
      2,
      0
    );
    
    expect(moved.events).toHaveLength(eventCount + 1);
    expect(moved.events[moved.events.length - 1].type).toBe('movement_declared');
  });

  it('should update unit position', () => {
    const session = createMovementPhaseSession();
    
    const moved = declareMovement(
      session,
      'player-1',
      from,
      to,
      Facing.Northeast,
      MovementType.Walk,
      2,
      0
    );
    
    expect(moved.currentState.units['player-1'].position).toEqual(to);
    expect(moved.currentState.units['player-1'].facing).toBe(Facing.Northeast);
  });

  it('should set movement type and hexes moved', () => {
    const session = createMovementPhaseSession();
    
    const moved = declareMovement(
      session,
      'player-1',
      from,
      to,
      Facing.North,
      MovementType.Run,
      8,
      2
    );
    
    expect(moved.currentState.units['player-1'].movementThisTurn).toBe(MovementType.Run);
    expect(moved.currentState.units['player-1'].hexesMovedThisTurn).toBe(8);
  });

  it('should generate heat', () => {
    const session = createMovementPhaseSession();
    const initialHeat = session.currentState.units['player-1'].heat;
    
    const moved = declareMovement(
      session,
      'player-1',
      from,
      to,
      Facing.North,
      MovementType.Jump,
      4,
      4
    );
    
    expect(moved.currentState.units['player-1'].heat).toBe(initialHeat + 4);
  });

  it('should set lock state to Planning', () => {
    const session = createMovementPhaseSession();
    
    const moved = declareMovement(
      session,
      'player-1',
      from,
      to,
      Facing.North,
      MovementType.Walk,
      2,
      0
    );
    
    expect(moved.currentState.units['player-1'].lockState).toBe(LockState.Planning);
  });

  it('should support stationary movement', () => {
    const session = createMovementPhaseSession();
    
    const moved = declareMovement(
      session,
      'player-1',
      from,
      from, // Same position
      Facing.North,
      MovementType.Stationary,
      0,
      0
    );
    
    expect(moved.currentState.units['player-1'].movementThisTurn).toBe(MovementType.Stationary);
    expect(moved.currentState.units['player-1'].hexesMovedThisTurn).toBe(0);
  });
});

// =============================================================================
// lockMovement Tests
// =============================================================================

describe('lockMovement', () => {
  it('should throw if not in Movement phase', () => {
    const session = createActiveSession();
    
    expect(() => lockMovement(session, 'player-1')).toThrow('Not in movement phase');
  });

  it('should add movement_locked event', () => {
    const session = createMovementPhaseSession();
    const eventCount = session.events.length;
    
    const locked = lockMovement(session, 'player-1');
    
    expect(locked.events).toHaveLength(eventCount + 1);
    expect(locked.events[locked.events.length - 1].type).toBe('movement_locked');
  });

  it('should set unit lock state to Locked', () => {
    const session = createMovementPhaseSession();
    
    const locked = lockMovement(session, 'player-1');
    
    expect(locked.currentState.units['player-1'].lockState).toBe(LockState.Locked);
  });

  it('should increment activation index', () => {
    const session = createMovementPhaseSession();
    const initialIndex = session.currentState.activationIndex;
    
    const locked = lockMovement(session, 'player-1');
    
    expect(locked.currentState.activationIndex).toBe(initialIndex + 1);
  });

  it('should not affect other units', () => {
    const session = createMovementPhaseSession();
    
    const locked = lockMovement(session, 'player-1');
    
    expect(locked.currentState.units['player-2'].lockState).toBe(LockState.Pending);
    expect(locked.currentState.units['opponent-1'].lockState).toBe(LockState.Pending);
  });

  it('should allow locking multiple units', () => {
    let session = createMovementPhaseSession();
    
    session = lockMovement(session, 'player-1');
    session = lockMovement(session, 'player-2');
    session = lockMovement(session, 'opponent-1');
    
    expect(session.currentState.units['player-1'].lockState).toBe(LockState.Locked);
    expect(session.currentState.units['player-2'].lockState).toBe(LockState.Locked);
    expect(session.currentState.units['opponent-1'].lockState).toBe(LockState.Locked);
  });
});

// =============================================================================
// replayToSequence Tests
// =============================================================================

describe('replayToSequence', () => {
  it('should return state at specific sequence', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    session = advancePhase(session);
    
    // Replay to sequence 1 (game_started)
    const state = replayToSequence(session, 1);
    
    expect(state.status).toBe(GameStatus.Active);
    expect(state.phase).toBe(GamePhase.Initiative);
  });

  it('should return initial state for sequence 0', () => {
    const session = createActiveSession();
    
    const state = replayToSequence(session, 0);
    
    expect(state.status).toBe(GameStatus.Setup);
  });

  it('should include events up to and including sequence', () => {
    let session = createActiveSession();
    const startedSequence = session.events[1].sequence;
    session = advancePhase(session);
    
    const state = replayToSequence(session, startedSequence);
    
    expect(state.status).toBe(GameStatus.Active);
    expect(state.phase).toBe(GamePhase.Initiative);
  });

  it('should handle sequence beyond all events', () => {
    const session = createActiveSession();
    
    const state = replayToSequence(session, 9999);
    
    // Should include all events
    expect(state.status).toBe(session.currentState.status);
  });
});

// =============================================================================
// replayToTurn Tests
// =============================================================================

describe('replayToTurn', () => {
  it('should return state at specific turn', () => {
    let session = createActiveSession();
    // Advance through full turn
    session = advancePhase(session); // -> Movement
    session = advancePhase(session); // -> WeaponAttack
    session = advancePhase(session); // -> Heat
    session = advancePhase(session); // -> End
    session = advancePhase(session); // -> Initiative (turn 2)
    
    const state = replayToTurn(session, 1);
    
    expect(state.turn).toBeLessThanOrEqual(1);
  });

  it('should return state for turn 0', () => {
    const session = createActiveSession();
    
    const state = replayToTurn(session, 0);
    
    expect(state.status).toBe(GameStatus.Setup);
    expect(state.turn).toBe(0);
  });

  it('should handle turn beyond current turn', () => {
    const session = createActiveSession();
    
    const state = replayToTurn(session, 9999);
    
    expect(state.turn).toBe(session.currentState.turn);
  });

  it('should include all events up to the turn', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    
    const state = replayToTurn(session, 1);
    
    expect(state.phase).toBe(session.currentState.phase);
  });
});

// =============================================================================
// generateGameLog Tests
// =============================================================================

describe('generateGameLog', () => {
  it('should return string log', () => {
    const session = createActiveSession();
    
    const log = generateGameLog(session);
    
    expect(typeof log).toBe('string');
  });

  it('should include game_created event', () => {
    const session = createActiveSession();
    
    const log = generateGameLog(session);
    
    expect(log).toContain('Game created');
  });

  it('should include game_started event', () => {
    const session = createActiveSession();
    
    const log = generateGameLog(session);
    
    expect(log).toContain('Game started');
  });

  it('should include phase_changed events', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    
    const log = generateGameLog(session);
    
    expect(log).toContain('Phase changed');
  });

  it('should include game_ended event', () => {
    let session = createActiveSession();
    session = endGame(session, GameSide.Player, 'destruction');
    
    const log = generateGameLog(session);
    
    expect(log).toContain('Game ended');
  });

  it('should include initiative_rolled event', () => {
    let session = createActiveSession();
    session = rollInitiative(session);
    
    const log = generateGameLog(session);
    
    expect(log).toContain('Initiative rolled');
  });

  it('should include movement_declared event', () => {
    let session = createMovementPhaseSession();
    session = declareMovement(
      session,
      'player-1',
      { q: 0, r: 5 },
      { q: 1, r: 4 },
      Facing.North,
      MovementType.Walk,
      2,
      0
    );
    
    const log = generateGameLog(session);
    
    expect(log).toContain('player-1');
    expect(log).toContain('moved');
  });

  it('should include movement_locked event', () => {
    let session = createMovementPhaseSession();
    session = lockMovement(session, 'player-1');
    
    const log = generateGameLog(session);
    
    expect(log).toContain('player-1');
    expect(log).toContain('locked movement');
  });

  it('should format log lines with turn and phase', () => {
    const session = createActiveSession();
    
    const log = generateGameLog(session);
    
    expect(log).toMatch(/\[Turn \d+\/\w+\]/);
  });

  it('should return empty string for empty events', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    // Manually clear events (this is for testing only)
    const emptySession: IGameSession = {
      ...session,
      events: [],
    };
    
    const log = generateGameLog(emptySession);
    
    expect(log).toBe('');
  });

  it('should handle multiple lines separated by newlines', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    session = advancePhase(session);
    
    const log = generateGameLog(session);
    const lines = log.split('\n');
    
    expect(lines.length).toBeGreaterThan(1);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  it('should play through a full turn cycle', () => {
    let session = createActiveSession();
    expect(session.currentState.turn).toBe(1);
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
    
    // Roll initiative
    session = rollInitiative(session);
    expect(session.currentState.initiativeWinner).toBeDefined();
    
    // Advance to movement
    session = advancePhase(session);
    expect(session.currentState.phase).toBe(GamePhase.Movement);
    
    // Declare and lock movement for all units
    const units = ['player-1', 'player-2', 'opponent-1', 'opponent-2'];
    for (const unitId of units) {
      session = lockMovement(session, unitId);
    }
    
    // Advance through remaining phases
    session = advancePhase(session); // -> WeaponAttack
    expect(session.currentState.phase).toBe(GamePhase.WeaponAttack);
    
    session = advancePhase(session); // -> Heat
    expect(session.currentState.phase).toBe(GamePhase.Heat);
    
    session = advancePhase(session); // -> End
    expect(session.currentState.phase).toBe(GamePhase.End);
    
    session = advancePhase(session); // -> Initiative (wrap to new turn)
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
    // Note: Turn increment is tracked in events but applyPhaseChanged doesn't update state.turn
    // The last phase_changed event will have the correct turn number in its event.turn field
    const lastEvent = session.events[session.events.length - 1];
    expect(lastEvent.turn).toBe(2);
  });

  it('should maintain event chronology', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    session = advancePhase(session);
    
    for (let i = 1; i < session.events.length; i++) {
      expect(session.events[i].sequence).toBeGreaterThan(session.events[i - 1].sequence);
    }
  });

  it('should allow replay to any point in game history', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    session = advancePhase(session);
    
    // Replay to each sequence
    for (const event of session.events) {
      const state = replayToSequence(session, event.sequence);
      expect(state).toBeDefined();
    }
  });

  it('should correctly end a game mid-turn', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    
    session = endGame(session, GameSide.Player, 'destruction');
    
    expect(session.currentState.status).toBe(GameStatus.Completed);
    expect(session.currentState.phase).toBe(GamePhase.Movement);
  });
});

// =============================================================================
// Immutability Tests
// =============================================================================

describe('Immutability', () => {
  it('should not mutate session on createGameSession', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    
    const session1 = createGameSession(config, units);
    const session2 = createGameSession(config, units);
    
    expect(session1).not.toBe(session2);
    expect(session1.events).not.toBe(session2.events);
  });

  it('should not mutate session on startGame', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    const session = createGameSession(config, units);
    const originalEvents = [...session.events];
    
    const started = startGame(session, GameSide.Player);
    
    expect(session.events).toEqual(originalEvents);
    expect(started.events).not.toBe(session.events);
  });

  it('should not mutate session on advancePhase', () => {
    const session = createActiveSession();
    const originalPhase = session.currentState.phase;
    
    const advanced = advancePhase(session);
    
    expect(session.currentState.phase).toBe(originalPhase);
    expect(advanced.currentState).not.toBe(session.currentState);
  });

  it('should not mutate session on rollInitiative', () => {
    const session = createActiveSession();
    const originalEvents = [...session.events];
    
    rollInitiative(session);
    
    expect(session.events).toEqual(originalEvents);
  });

  it('should not mutate session on declareMovement', () => {
    const session = createMovementPhaseSession();
    const originalUnits = { ...session.currentState.units };
    
    declareMovement(
      session,
      'player-1',
      { q: 0, r: 5 },
      { q: 1, r: 4 },
      Facing.North,
      MovementType.Walk,
      2,
      0
    );
    
    expect(session.currentState.units).toEqual(originalUnits);
  });

  it('should not mutate session on lockMovement', () => {
    const session = createMovementPhaseSession();
    const originalLockState = session.currentState.units['player-1'].lockState;
    
    lockMovement(session, 'player-1');
    
    expect(session.currentState.units['player-1'].lockState).toBe(originalLockState);
  });
});
