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

  it('derives HQ initiative from represented working default communications tonnage', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        initiativeEquipment: {
          communicationsMode: 'Default',
          workingCommunicationsTonnage: 7,
        },
      }),
      createTestUnit({
        id: 'opponent-1',
        side: GameSide.Opponent,
        initiativeEquipment: {
          communicationsMode: 'Non-Default',
          workingCommunicationsTonnage: 7,
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

  it('applies represented Triple-Core Processor initiative for active BattleMech pilots with VDNI or BVDNI', () => {
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
      opponentTotal: 5,
      winner: GameSide.Opponent,
    });
  });

  it('suppresses represented Triple-Core Processor initiative when neural interface is disconnected', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        abilities: ['triple_core_processor', 'vdni'],
        neuralInterfaceActive: false,
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

    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      winner: GameSide.Opponent,
    });
    expect(event.payload).not.toHaveProperty('playerModifier');
    expect(event.payload).not.toHaveProperty('playerTotal');
  });

  it('uses the best represented Triple-Core Processor command-equipment uplift and fails closed without VDNI or BVDNI', () => {
    const config = createTestConfig();
    const units = [
      createTestUnit({
        id: 'player-1',
        side: GameSide.Player,
        abilities: ['triple_core_processor'],
        initiativeEquipment: {
          workingCommunicationsTonnage: 7,
        },
      }),
      createTestUnit({
        id: 'player-2',
        side: GameSide.Player,
        abilities: ['triple_core_processor', 'bvdni'],
        c3Equipment: [{ role: 'c3i', sourceEquipmentId: 'isc3i' }],
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

    expect(rolled.currentState.initiativeWinner).toBe(GameSide.Player);
    expect(event.payload).toMatchObject({
      playerRoll: 2,
      opponentRoll: 5,
      playerModifier: 3,
      playerTotal: 5,
      winner: GameSide.Player,
    });
  });

  it('reduces represented Triple-Core Processor initiative when the qualifying unit is shutdown', () => {
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
    session = {
      ...session,
      currentState: {
        ...session.currentState,
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

  it('reduces represented Triple-Core Processor initiative under enemy ECM', () => {
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
      playerModifier: 1,
      playerTotal: 3,
      winner: GameSide.Opponent,
    });
  });
});
