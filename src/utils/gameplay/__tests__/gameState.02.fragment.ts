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

describe('applyEvent - PhaseChanged', () => {
  it('should update phase and reset lock states', () => {
    let state = createInitialGameState('game-1');

    // Create a unit
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    // Change phase
    const phaseEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PhaseChanged,
      payload: {
        fromPhase: GamePhase.Initiative,
        toPhase: GamePhase.Movement,
      } as IPhaseChangedPayload,
    });

    const newState = applyEvent(state, phaseEvent);

    expect(newState.phase).toBe(GamePhase.Movement);
    expect(newState.activationIndex).toBe(0);
    expect(newState.units['unit-1'].lockState).toBe(LockState.Pending);
  });

  it('should reset movement tracking when entering movement phase', () => {
    let state = createInitialGameState('game-1');

    // Create a unit and set some movement values
    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    // Manually set movement values for testing
    state = {
      ...state,
      units: {
        ...state.units,
        'unit-1': {
          ...state.units['unit-1'],
          movementThisTurn: MovementType.Walk,
          hexesMovedThisTurn: 4,
          movedBackwardThisTurn: true,
          usedMechanicalJumpBoosterThisTurn: true,
        },
      },
    };

    // Change to movement phase
    const phaseEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PhaseChanged,
      payload: {
        fromPhase: GamePhase.End,
        toPhase: GamePhase.Movement,
      } as IPhaseChangedPayload,
    });

    const newState = applyEvent(state, phaseEvent);

    expect(newState.units['unit-1'].movementThisTurn).toBe(
      MovementType.Stationary,
    );
    expect(newState.units['unit-1'].hexesMovedThisTurn).toBe(0);
    expect(newState.units['unit-1'].movedBackwardThisTurn).toBe(false);
    expect(newState.units['unit-1'].usedMechanicalJumpBoosterThisTurn).toBe(
      false,
    );
  });
});

// =============================================================================
// applyEvent Tests - TurnStarted
// =============================================================================

describe('applyEvent - TurnStarted', () => {
  it('should update turn number and reset events', () => {
    const initialState = createInitialGameState('game-1');

    const event = createTestEvent({
      type: GameEventType.TurnStarted,
      turn: 2,
      payload: {},
    });

    const newState = applyEvent(initialState, event);

    expect(newState.turn).toBe(2);
    expect(newState.phase).toBe(GamePhase.Initiative);
    expect(newState.activationIndex).toBe(0);
    expect(newState.turnEvents).toContain(event);
  });
});

// =============================================================================
// applyEvent Tests - InitiativeRolled
// =============================================================================

describe('applyEvent - InitiativeRolled', () => {
  it('should set initiative winner and first mover', () => {
    const initialState = createInitialGameState('game-1');

    const event = createTestEvent({
      type: GameEventType.InitiativeRolled,
      payload: {
        playerRoll: 8,
        opponentRoll: 5,
        winner: GameSide.Player,
        movesFirst: GameSide.Opponent,
      } as IInitiativeRolledPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.initiativeWinner).toBe(GameSide.Player);
    expect(newState.firstMover).toBe(GameSide.Opponent);
  });
});

describe('applyEvent - InitiativeOrderSet', () => {
  it('should set replayable initiative order and reset activation index', () => {
    const initialState = {
      ...createInitialGameState('game-1'),
      activationIndex: 3,
    };

    const event = createTestEvent({
      type: GameEventType.InitiativeOrderSet,
      payload: {
        winner: GameSide.Player,
        firstMover: GameSide.Opponent,
        secondMover: GameSide.Player,
      } as IInitiativeOrderSetPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.initiativeWinner).toBe(GameSide.Player);
    expect(newState.firstMover).toBe(GameSide.Opponent);
    expect(newState.activationIndex).toBe(0);
  });
});

// =============================================================================
// applyEvent Tests - MovementDeclared
// =============================================================================
