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
    expect(log).toContain('Initiative order set');
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
      0,
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

  it('should include attacks_revealed event', () => {
    let session = createWeaponAttackPhaseSession();
    for (const unitId of ['player-1', 'player-2', 'opponent-1', 'opponent-2']) {
      session = lockAttack(session, unitId);
    }

    const log = generateGameLog(session);

    expect(log).toContain('Attacks revealed');
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
