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

  it('does not apply the represented Triple-Core Processor ECM penalty when the affected unit has own operational ECM', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        abilities: ['triple_core_processor', 'vdni'],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const playerOnePosition = session.currentState.units['player-1'].position;
    session = {
      ...session,
      currentState: {
        ...session.currentState,
        electronicWarfare: {
          ecmSuites: [
            {
              type: 'guardian',
              mode: 'ecm',
              operational: true,
              entityId: 'opponent-1:guardian:0',
              teamId: GameSide.Opponent,
              position: { ...playerOnePosition },
            },
            {
              type: 'guardian',
              mode: 'ecm',
              operational: true,
              entityId: 'player-1:guardian:0',
              teamId: GameSide.Player,
              position: { ...playerOnePosition },
            },
          ],
          activeProbes: [],
        },
      },
    };
    const dice = [1, 1, 2, 3];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1);
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      playerModifier: 2,
      playerTotal: 4,
      winner: GameSide.Opponent,
    });
  });

  it('stacks represented Triple-Core Processor shutdown and EMI initiative penalties', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        abilities: ['triple_core_processor', 'vdni'],
        c3Equipment: [{ role: 'c3i', sourceEquipmentId: 'isc3i' }],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    session = {
      ...session,
      currentState: {
        ...session.currentState,
        electromagneticInterference: true,
        units: {
          ...session.currentState.units,
          'player-1': {
            ...session.currentState.units['player-1'],
            shutdown: true,
          },
        },
      },
    };
    const dice = [1, 1, 2, 3];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1);
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      playerModifier: 1,
      playerTotal: 3,
      winner: GameSide.Opponent,
    });
  });

  it('derives command-console initiative only when represented gates qualify', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        initiativeEquipment: {
          cockpitType: 'Command Console',
          commandConsoleCrewActive: true,
          tonnage: 60,
          unitType: 'BattleMech',
        },
      }),
      createTestUnit({
        id: 'opponent-1',
        side: GameSide.Opponent,
        initiativeEquipment: {
          cockpitType: 'Command Console',
          commandConsoleCrewActive: true,
          tonnage: 65,
          unitType: 'IndustrialMech',
        },
      }),
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
    });
  });

  it('replaces the requested side roll when active Tactical Genius is present', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        abilities: ['tactical_genius'],
      }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const dice = [1, 1, 6, 1, 6, 6];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1, {
      tacticalGeniusRerollSide: GameSide.Player,
    });
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Player);
    expect(event.payload).toMatchObject({
      playerOriginalRoll: 2,
      opponentOriginalRoll: 7,
      playerRoll: 12,
      opponentRoll: 7,
      tacticalGeniusRerollSide: GameSide.Player,
      winner: GameSide.Player,
    });
  });

  it('ignores a Tactical Genius reroll request for a side without the SPA', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({ id: 'player-1', side: GameSide.Player }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    const dice = [1, 1, 6, 1, 6, 6];

    const rolled = rollInitiative(session, undefined, () => dice.shift() ?? 1, {
      tacticalGeniusRerollSide: GameSide.Player,
    });
    const event = rolled.events.find(
      (entry) => entry.type === GameEventType.InitiativeRolled,
    )!;

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Opponent);
    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 7,
      winner: GameSide.Opponent,
    });
    expect(event.payload).not.toHaveProperty('tacticalGeniusRerollSide');
    expect(dice).toEqual([6, 6]);
  });
});
