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

  it('should add initiative roll and explicit initiative order events', () => {
    const session = createActiveSession();
    const eventCount = session.events.length;

    const rolled = rollInitiative(session);

    expect(rolled.events).toHaveLength(eventCount + 2);
    expect(rolled.events.at(-2)?.type).toBe(GameEventType.InitiativeRolled);
    expect(rolled.events.at(-1)?.type).toBe(GameEventType.InitiativeOrderSet);
    expect(rolled.events.at(-1)?.payload).toMatchObject({
      winner: rolled.currentState.initiativeWinner,
      firstMover: rolled.currentState.firstMover,
    });
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

  it('applies source-backed force initiative quirks without changing raw dice fields', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        unitQuirks: ['battle_computer', 'command_mech'],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const dice = [1, 1, 2, 3];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1);
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Opponent);
    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      playerModifier: 2,
      opponentModifier: 0,
      playerTotal: 4,
      opponentTotal: 5,
      winner: GameSide.Opponent,
    });
  });

  it('uses the highest positive initiative component instead of stacking command with HQ or quirks', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        initiativeCommandBonus: 2,
        unitQuirks: ['battle_computer'],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const dice = [1, 1, 2, 3];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1);
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Opponent);
    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      playerModifier: 2,
      playerTotal: 4,
      winner: GameSide.Opponent,
    });
  });

  it('does not stack HQ and quirk force initiative bonuses', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        initiativeHQBonus: 2,
        unitQuirks: ['battle_computer'],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const dice = [1, 1, 2, 3];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1);
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Opponent);
    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      playerModifier: 2,
      playerTotal: 4,
      winner: GameSide.Opponent,
    });
  });

  it('does not infer initiative equipment bonuses from command-looking metadata', () => {
    const config = createTestConfig();
    const commandLookingUnit = {
      ...createTestUnit({
        id: 'player-1',
        name: 'Command Console HQ',
        side: GameSide.Player,
        unitRef: 'command-console-hq',
      }),
      cockpitType: 'Command Console',
      equipment: [
        {
          id: 'Communications Equipment',
          location: 'HEAD',
          tons: 7,
        },
      ],
    } as IGameUnit & {
      readonly cockpitType: string;
      readonly equipment: readonly {
        readonly id: string;
        readonly location: string;
        readonly tons: number;
      }[];
    };
    const units = [
      commandLookingUnit,
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const dice = [1, 1, 2, 3];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1);
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Opponent);
    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      winner: GameSide.Opponent,
    });
    expect(event.payload).not.toHaveProperty('playerModifier');
    expect(event.payload).not.toHaveProperty('opponentModifier');
    expect(event.payload).not.toHaveProperty('playerTotal');
    expect(event.payload).not.toHaveProperty('opponentTotal');
  });
});
