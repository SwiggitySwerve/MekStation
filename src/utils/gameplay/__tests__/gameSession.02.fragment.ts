/**
 * Game Session Tests
 *
 * Comprehensive tests for the game session management module.
 * Tests all exported functions with full coverage of success and error cases.
 */

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
  lockAttack,
  replayToSequence,
  replayToTurn,
  generateGameLog,
} from '../gameSession';

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
    createTestUnit({
      id: 'player-2',
      name: 'Hunchback',
      side: GameSide.Player,
    }),
    createTestUnit({
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
    }),
    createTestUnit({
      id: 'opponent-2',
      name: 'Warhammer',
      side: GameSide.Opponent,
    }),
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

function createWeaponAttackPhaseSession(): IGameSession {
  return advancePhase(createMovementPhaseSession());
}

// =============================================================================
// createGameSession Tests
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

    expect(() => endGame(session, GameSide.Player, 'destruction')).toThrow(
      'Game is not active',
    );
  });

  it('should throw if game is already completed', () => {
    let session = createActiveSession();
    session = endGame(session, GameSide.Player, 'destruction');

    expect(() => endGame(session, GameSide.Opponent, 'concede')).toThrow(
      'Game is not active',
    );
  });

  it('should support all end reasons', () => {
    const reasons: Array<
      'destruction' | 'concede' | 'turn_limit' | 'objective' | 'aborted'
    > = ['destruction', 'concede', 'turn_limit', 'objective', 'aborted'];

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
    expect(turn1Events.every((e) => e.turn === 1)).toBe(true);
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
