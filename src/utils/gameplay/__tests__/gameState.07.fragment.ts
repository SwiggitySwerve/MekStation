import {
  GameEventType,
  GamePhase,
  GameStatus,
  GameSide,
  LockState,
  Facing,
  MovementType,
  IGameEvent,
  IGameUnit,
  IUnitGameState,
  IGameConfig,
  IGameState,
  IGameCreatedPayload,
  IGameStartedPayload,
  IGameEndedPayload,
  IPhaseChangedPayload,
  IInitiativeOrderSetPayload,
  IInitiativeRolledPayload,
  IAttacksRevealedPayload,
  IMovementDeclaredPayload,
  IDamageAppliedPayload,
  IDesignatorMarkerAppliedPayload,
  IHeatPayload,
  IMinefieldChangedPayload,
  IPilotHitPayload,
  IPhysicalAttackResolvedPayload,
  ISwarmDismountedPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';
/**
 * Game State Tests
 *
 * Tests for event-sourced game state derivation.
 */
import { UnitType } from '@/types/unit';
import { coordToKey } from '@/utils/gameplay/hexMath';

import {
  createInitialUnitState,
  createInitialGameState,
  applyEvent,
  deriveState,
  deriveStateAtSequence,
  deriveStateAtTurn,
  getActiveUnits,
  getUnitsAwaitingAction,
  allUnitsLocked,
  isGameOver,
  checkVictoryConditions,
} from '../gameState';
import { createStateWithUnits } from './gameState.test-helpers';

// =============================================================================
// Test Fixtures
// =============================================================================

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

function createTestConfig(overrides: Partial<IGameConfig> = {}): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    ...overrides,
  };
}

function createTestEvent(overrides: Partial<IGameEvent> = {}): IGameEvent {
  return {
    id: 'event-1',
    gameId: 'game-1',
    sequence: 1,
    timestamp: '2024-01-01T00:00:00Z',
    type: GameEventType.GameCreated,
    turn: 0,
    phase: GamePhase.Initiative,
    payload: {},
    ...overrides,
  } as IGameEvent;
}

// =============================================================================
// createInitialUnitState Tests
// =============================================================================

describe('deriveState', () => {
  it('should apply all events in sequence', () => {
    const events: IGameEvent[] = [
      createTestEvent({
        id: 'e1',
        sequence: 1,
        type: GameEventType.GameCreated,
        payload: {
          config: createTestConfig(),
          units: [createTestUnit()],
        } as IGameCreatedPayload,
      }),
      createTestEvent({
        id: 'e2',
        sequence: 2,
        type: GameEventType.GameStarted,
        payload: { firstSide: GameSide.Player } as IGameStartedPayload,
      }),
    ];

    const state = deriveState('game-1', events);

    expect(state.status).toBe(GameStatus.Active);
    expect(state.turn).toBe(1);
    expect(Object.keys(state.units)).toHaveLength(1);
  });

  it('should return initial state for empty events', () => {
    const state = deriveState('game-1', []);

    expect(state.gameId).toBe('game-1');
    expect(state.status).toBe(GameStatus.Setup);
    expect(state.units).toEqual({});
  });
});

// =============================================================================
// deriveStateAtSequence Tests
// =============================================================================

describe('deriveStateAtSequence', () => {
  it('should only apply events up to sequence number', () => {
    const events: IGameEvent[] = [
      createTestEvent({
        id: 'e1',
        sequence: 1,
        type: GameEventType.GameCreated,
        payload: {
          config: createTestConfig(),
          units: [createTestUnit()],
        } as IGameCreatedPayload,
      }),
      createTestEvent({
        id: 'e2',
        sequence: 2,
        type: GameEventType.GameStarted,
        payload: { firstSide: GameSide.Player } as IGameStartedPayload,
      }),
      createTestEvent({
        id: 'e3',
        sequence: 3,
        type: GameEventType.GameEnded,
        payload: {
          winner: GameSide.Player,
          reason: 'destruction',
        } as IGameEndedPayload,
      }),
    ];

    const state = deriveStateAtSequence('game-1', events, 2);

    // Should not have the GameEnded event applied
    expect(state.status).toBe(GameStatus.Active);
    expect(state.result).toBeUndefined();
  });
});

// =============================================================================
// deriveStateAtTurn Tests
// =============================================================================

describe('deriveStateAtTurn', () => {
  it('should only apply events up to specified turn', () => {
    const events: IGameEvent[] = [
      createTestEvent({
        id: 'e1',
        sequence: 1,
        turn: 0,
        type: GameEventType.GameCreated,
        payload: {
          config: createTestConfig(),
          units: [createTestUnit()],
        } as IGameCreatedPayload,
      }),
      createTestEvent({
        id: 'e2',
        sequence: 2,
        turn: 1,
        type: GameEventType.GameStarted,
        payload: { firstSide: GameSide.Player } as IGameStartedPayload,
      }),
      createTestEvent({
        id: 'e3',
        sequence: 3,
        turn: 2,
        type: GameEventType.TurnStarted,
        payload: {},
      }),
    ];

    const state = deriveStateAtTurn('game-1', events, 1);

    expect(state.turn).toBe(1);
  });
});

// =============================================================================
// State Query Functions
// =============================================================================

describe('getActiveUnits', () => {
  it('should return non-destroyed conscious units for a side', () => {
    const state = createStateWithUnits([
      {
        id: 'p1',
        side: GameSide.Player,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'p2',
        side: GameSide.Player,
        destroyed: true,
        pilotConscious: true,
      },
      {
        id: 'p3',
        side: GameSide.Player,
        destroyed: false,
        pilotConscious: false,
      },
      {
        id: 'o1',
        side: GameSide.Opponent,
        destroyed: false,
        pilotConscious: true,
      },
    ]);

    const playerUnits = getActiveUnits(state, GameSide.Player);

    expect(playerUnits).toHaveLength(1);
    expect(playerUnits[0].id).toBe('p1');
  });
});

describe('getUnitsAwaitingAction', () => {
  it('should return units with pending lock state', () => {
    const state = createStateWithUnits([
      {
        id: 'u1',
        lockState: LockState.Pending,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'u2',
        lockState: LockState.Locked,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'u3',
        lockState: LockState.Pending,
        destroyed: true,
        pilotConscious: true,
      },
    ]);

    const awaiting = getUnitsAwaitingAction(state);

    expect(awaiting).toHaveLength(1);
    expect(awaiting[0].id).toBe('u1');
  });
});

describe('allUnitsLocked', () => {
  it('should return true when all active units are locked', () => {
    const state = createStateWithUnits([
      {
        id: 'u1',
        lockState: LockState.Locked,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'u2',
        lockState: LockState.Resolved,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'u2b',
        lockState: LockState.Revealed,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'u3',
        lockState: LockState.Pending,
        destroyed: true,
        pilotConscious: true,
      },
    ]);

    expect(allUnitsLocked(state)).toBe(true);
  });

  it('should return false when any active unit is not locked', () => {
    const state = createStateWithUnits([
      {
        id: 'u1',
        lockState: LockState.Locked,
        destroyed: false,
        pilotConscious: true,
      },
      {
        id: 'u2',
        lockState: LockState.Pending,
        destroyed: false,
        pilotConscious: true,
      },
    ]);

    expect(allUnitsLocked(state)).toBe(false);
  });
});
