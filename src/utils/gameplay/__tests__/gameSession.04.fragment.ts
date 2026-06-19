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

describe('lockAttack', () => {
  it('should not reveal attacks until every active unit has locked', () => {
    let session = createWeaponAttackPhaseSession();

    session = lockAttack(session, 'player-1');

    expect(
      session.events.some(
        (event) => event.type === GameEventType.AttacksRevealed,
      ),
    ).toBe(false);
    expect(session.currentState.units['player-1'].lockState).toBe(
      LockState.Locked,
    );
  });

  it('should emit AttacksRevealed after the last active unit locks', () => {
    let session = createWeaponAttackPhaseSession();

    session = lockAttack(session, 'player-1');
    session = lockAttack(session, 'player-2');
    session = lockAttack(session, 'opponent-1');
    session = lockAttack(session, 'opponent-2');

    const revealEvent = session.events.findLast(
      (event) => event.type === GameEventType.AttacksRevealed,
    );
    expect(revealEvent).toBeDefined();
    expect(revealEvent?.sequence).toBe(session.events.length - 1);
    expect(revealEvent?.visibility).toBe('public');
    expect(revealEvent?.payload).toEqual({
      unitIds: ['opponent-1', 'opponent-2', 'player-1', 'player-2'],
      attackCount: 0,
    });
    expect(session.currentState.units['player-1'].lockState).toBe(
      LockState.Revealed,
    );
    expect(session.currentState.units['opponent-2'].lockState).toBe(
      LockState.Revealed,
    );
    expect(canAdvancePhase(session)).toBe(true);
  });

  it('should include only current-turn AttackDeclared records in reveal count', () => {
    let session = createWeaponAttackPhaseSession();
    session = appendEvent(session, {
      id: 'older-attack',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: '2026-05-26T00:00:00.000Z',
      type: GameEventType.AttackDeclared,
      turn: session.currentState.turn - 1,
      phase: GamePhase.WeaponAttack,
      actorId: 'player-1',
      payload: {},
    } as IGameEvent);
    session = appendEvent(session, {
      id: 'current-attack',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: '2026-05-26T00:00:00.000Z',
      type: GameEventType.AttackDeclared,
      turn: session.currentState.turn,
      phase: GamePhase.WeaponAttack,
      actorId: 'player-1',
      payload: {},
    } as IGameEvent);

    for (const unitId of ['player-1', 'player-2', 'opponent-1', 'opponent-2']) {
      session = lockAttack(session, unitId);
    }

    const revealEvent = session.events.findLast(
      (event) => event.type === GameEventType.AttacksRevealed,
    );
    expect(revealEvent?.payload).toMatchObject({ attackCount: 1 });
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
