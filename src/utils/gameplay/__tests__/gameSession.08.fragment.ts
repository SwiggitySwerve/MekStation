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

    session = advancePhase(session); // -> PhysicalAttack
    expect(session.currentState.phase).toBe(GamePhase.PhysicalAttack);

    session = advancePhase(session); // -> Heat
    expect(session.currentState.phase).toBe(GamePhase.Heat);

    session = advancePhase(session); // -> End
    expect(session.currentState.phase).toBe(GamePhase.End);

    session = advancePhase(session); // -> Initiative (wrap to new turn)
    expect(session.currentState.phase).toBe(GamePhase.Initiative);
    const lastEvent = session.events[session.events.length - 1];
    expect(lastEvent.turn).toBe(2);
  });

  it('should maintain event chronology', () => {
    let session = createActiveSession();
    session = advancePhase(session);
    session = advancePhase(session);

    for (let i = 1; i < session.events.length; i++) {
      expect(session.events[i].sequence).toBeGreaterThan(
        session.events[i - 1].sequence,
      );
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
      0,
    );

    expect(session.currentState.units).toEqual(originalUnits);
  });

  it('should not mutate session on lockMovement', () => {
    const session = createMovementPhaseSession();
    const originalLockState = session.currentState.units['player-1'].lockState;

    lockMovement(session, 'player-1');

    expect(session.currentState.units['player-1'].lockState).toBe(
      originalLockState,
    );
  });
});
