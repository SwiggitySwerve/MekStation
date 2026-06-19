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

describe('declareMovement', () => {
  const from: IHexCoordinate = { q: 0, r: 5 };
  const to: IHexCoordinate = { q: 1, r: 4 };

  it('should throw if not in Movement phase', () => {
    const session = createActiveSession();

    expect(() =>
      declareMovement(
        session,
        'player-1',
        from,
        to,
        Facing.North,
        MovementType.Walk,
        2,
        0,
      ),
    ).toThrow('Not in movement phase');
  });

  it('should throw if unit not found', () => {
    const session = createMovementPhaseSession();

    expect(() =>
      declareMovement(
        session,
        'non-existent',
        from,
        to,
        Facing.North,
        MovementType.Walk,
        2,
        0,
      ),
    ).toThrow('Unit non-existent not found');
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
      0,
    );

    expect(moved.events).toHaveLength(eventCount + 1);
    expect(moved.events[moved.events.length - 1].type).toBe(
      'movement_declared',
    );
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
      0,
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
      2,
    );

    expect(moved.currentState.units['player-1'].movementThisTurn).toBe(
      MovementType.Run,
    );
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
      4,
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
      0,
    );

    expect(moved.currentState.units['player-1'].lockState).toBe(
      LockState.Planning,
    );
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
      0,
    );

    expect(moved.currentState.units['player-1'].movementThisTurn).toBe(
      MovementType.Stationary,
    );
    expect(moved.currentState.units['player-1'].hexesMovedThisTurn).toBe(0);
  });
});

// =============================================================================
// lockMovement Tests
// =============================================================================

describe('lockMovement', () => {
  it('should throw if not in Movement phase', () => {
    const session = createActiveSession();

    expect(() => lockMovement(session, 'player-1')).toThrow(
      'Not in movement phase',
    );
  });

  it('should add movement_locked event', () => {
    const session = createMovementPhaseSession();
    const eventCount = session.events.length;

    const locked = lockMovement(session, 'player-1');

    expect(locked.events).toHaveLength(eventCount + 1);
    expect(locked.events[locked.events.length - 1].type).toBe(
      'movement_locked',
    );
  });

  it('should set unit lock state to Locked', () => {
    const session = createMovementPhaseSession();

    const locked = lockMovement(session, 'player-1');

    expect(locked.currentState.units['player-1'].lockState).toBe(
      LockState.Locked,
    );
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

    expect(locked.currentState.units['player-2'].lockState).toBe(
      LockState.Pending,
    );
    expect(locked.currentState.units['opponent-1'].lockState).toBe(
      LockState.Pending,
    );
  });

  it('should allow locking multiple units', () => {
    let session = createMovementPhaseSession();

    session = lockMovement(session, 'player-1');
    session = lockMovement(session, 'player-2');
    session = lockMovement(session, 'opponent-1');

    expect(session.currentState.units['player-1'].lockState).toBe(
      LockState.Locked,
    );
    expect(session.currentState.units['player-2'].lockState).toBe(
      LockState.Locked,
    );
    expect(session.currentState.units['opponent-1'].lockState).toBe(
      LockState.Locked,
    );
  });
});

// =============================================================================
// replayToSequence Tests
// =============================================================================
