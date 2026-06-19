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

describe('createInitialUnitState', () => {
  it('should create unit state with correct initial values', () => {
    const unit = createTestUnit();
    const position = { q: 0, r: 0 };

    const state = createInitialUnitState(unit, position);

    expect(state.id).toBe(unit.id);
    expect(state.side).toBe(unit.side);
    expect(state.position).toEqual(position);
    expect(state.facing).toBe(Facing.North);
    expect(state.heat).toBe(0);
    expect(state.movementThisTurn).toBe(MovementType.Stationary);
    expect(state.hexesMovedThisTurn).toBe(0);
    expect(state.pilotWounds).toBe(0);
    expect(state.pilotConscious).toBe(true);
    expect(state.destroyed).toBe(false);
    expect(state.lockState).toBe(LockState.Pending);
  });

  it('should use provided facing', () => {
    const unit = createTestUnit();
    const position = { q: 0, r: 0 };

    const state = createInitialUnitState(unit, position, Facing.South);

    expect(state.facing).toBe(Facing.South);
  });

  it('should initialize empty collections', () => {
    const unit = createTestUnit();
    const position = { q: 0, r: 0 };

    const state = createInitialUnitState(unit, position);

    expect(state.armor).toEqual({});
    expect(state.structure).toEqual({});
    expect(state.destroyedLocations).toEqual([]);
    expect(state.destroyedEquipment).toEqual([]);
    expect(state.ammo).toEqual({});
  });
});

// =============================================================================
// createInitialGameState Tests
// =============================================================================

describe('createInitialGameState', () => {
  it('should create game state with setup status', () => {
    const state = createInitialGameState('game-1');

    expect(state.gameId).toBe('game-1');
    expect(state.status).toBe(GameStatus.Setup);
    expect(state.turn).toBe(0);
    expect(state.phase).toBe(GamePhase.Initiative);
    expect(state.activationIndex).toBe(0);
    expect(state.units).toEqual({});
    expect(state.turnEvents).toEqual([]);
  });
});

// =============================================================================
// applyEvent Tests - GameCreated
// =============================================================================

describe('applyEvent - GameCreated', () => {
  it('should create units from GameCreated event', () => {
    const initialState = createInitialGameState('game-1');
    const units: IGameUnit[] = [
      createTestUnit({ id: 'unit-1', side: GameSide.Player }),
      createTestUnit({ id: 'unit-2', side: GameSide.Opponent }),
    ];

    const event = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units,
      } as IGameCreatedPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.status).toBe(GameStatus.Setup);
    expect(Object.keys(newState.units)).toHaveLength(2);
    expect(newState.units['unit-1']).toBeDefined();
    expect(newState.units['unit-2']).toBeDefined();
  });

  it('should assign starting positions based on side', () => {
    const initialState = createInitialGameState('game-1');
    const units: IGameUnit[] = [
      createTestUnit({ id: 'player-1', side: GameSide.Player }),
      createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
    ];

    const event = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units,
      } as IGameCreatedPayload,
    });

    const newState = applyEvent(initialState, event);

    // Player faces north, opponent faces south
    expect(newState.units['player-1'].facing).toBe(Facing.North);
    expect(newState.units['opponent-1'].facing).toBe(Facing.South);
  });
});

// =============================================================================
// applyEvent Tests - GameStarted
// =============================================================================

describe('applyEvent - GameStarted', () => {
  it('should set game to active status', () => {
    const initialState = createInitialGameState('game-1');

    const event = createTestEvent({
      type: GameEventType.GameStarted,
      payload: {
        firstSide: GameSide.Player,
      } as IGameStartedPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.status).toBe(GameStatus.Active);
    expect(newState.turn).toBe(1);
    expect(newState.phase).toBe(GamePhase.Initiative);
    expect(newState.firstMover).toBe(GameSide.Player);
  });
});

// =============================================================================
// applyEvent Tests - GameEnded
// =============================================================================

describe('applyEvent - GameEnded', () => {
  it('should set game to completed with result', () => {
    const initialState = createInitialGameState('game-1');

    const event = createTestEvent({
      type: GameEventType.GameEnded,
      payload: {
        winner: GameSide.Player,
        reason: 'destruction',
      } as IGameEndedPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.status).toBe(GameStatus.Completed);
    expect(newState.result?.winner).toBe(GameSide.Player);
    expect(newState.result?.reason).toBe('destruction');
  });

  it('should handle draw result', () => {
    const initialState = createInitialGameState('game-1');

    const event = createTestEvent({
      type: GameEventType.GameEnded,
      payload: {
        winner: 'draw',
        reason: 'turn_limit',
      } as IGameEndedPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.result?.winner).toBe('draw');
  });
});

// =============================================================================
// applyEvent Tests - PhaseChanged
// =============================================================================
