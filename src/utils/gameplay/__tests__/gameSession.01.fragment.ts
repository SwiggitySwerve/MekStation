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

  it('derives unambiguous Boosted Comm Implant C3i networks from unit abilities', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        abilities: ['boost_comm_implant'],
      }),
      createTestUnit({
        id: 'player-2',
        side: GameSide.Player,
        abilities: ['boost_comm_implant'],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];

    const session = createGameSession(config, units);

    expect(session.currentState.c3Network?.networks).toEqual([
      {
        networkId: 'player-c3i-1',
        type: 'improved',
        teamId: GameSide.Player,
        members: [
          expect.objectContaining({
            entityId: 'player-1',
            teamId: GameSide.Player,
            role: 'c3i',
            operational: true,
          }),
          expect.objectContaining({
            entityId: 'player-2',
            teamId: GameSide.Player,
            role: 'c3i',
            operational: true,
          }),
        ],
      },
    ]);
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

    expect(() => startGame(session, GameSide.Player)).toThrow(
      'Game is not in setup state',
    );
  });

  it('should throw if game is already completed', () => {
    let session = createActiveSession();
    session = endGame(session, GameSide.Player, 'destruction');

    expect(() => startGame(session, GameSide.Player)).toThrow(
      'Game is not in setup state',
    );
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
