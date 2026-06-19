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

describe('isGameOver', () => {
  it('should return true for completed games', () => {
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Completed,
    };

    expect(isGameOver(state)).toBe(true);
  });

  it('should return true for abandoned games', () => {
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Abandoned,
    };

    expect(isGameOver(state)).toBe(true);
  });

  it('should return false for active games', () => {
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Active,
    };

    expect(isGameOver(state)).toBe(false);
  });
});

// =============================================================================
// Victory Conditions
// =============================================================================

describe('checkVictoryConditions', () => {
  const config = createTestConfig();

  it('should return null when game continues', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: false },
      { id: 'o1', side: GameSide.Opponent, destroyed: false },
    ]);

    const result = checkVictoryConditions(state, config);

    expect(result).toBeNull();
  });

  it('should return opponent victory when player is eliminated', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: true },
      { id: 'o1', side: GameSide.Opponent, destroyed: false },
    ]);

    const result = checkVictoryConditions(state, config);

    expect(result).toBe(GameSide.Opponent);
  });

  it('should return player victory when opponent is eliminated', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: false },
      { id: 'o1', side: GameSide.Opponent, destroyed: true },
    ]);

    const result = checkVictoryConditions(state, config);

    expect(result).toBe(GameSide.Player);
  });

  it('should return draw when both sides are eliminated', () => {
    const state = createStateWithUnits([
      { id: 'p1', side: GameSide.Player, destroyed: true },
      { id: 'o1', side: GameSide.Opponent, destroyed: true },
    ]);

    const result = checkVictoryConditions(state, config);

    expect(result).toBe('draw');
  });

  it('should determine winner by surviving units at turn limit', () => {
    const configWithLimit = createTestConfig({ turnLimit: 10 });
    const state = createStateWithUnits(
      [
        { id: 'p1', side: GameSide.Player, destroyed: false },
        { id: 'p2', side: GameSide.Player, destroyed: false },
        { id: 'o1', side: GameSide.Opponent, destroyed: false },
      ],
      { turn: 11 },
    );

    const result = checkVictoryConditions(state, configWithLimit);

    expect(result).toBe(GameSide.Player); // 2 vs 1
  });

  it('should return draw at turn limit with equal forces', () => {
    const configWithLimit = createTestConfig({ turnLimit: 10 });
    const state = createStateWithUnits(
      [
        { id: 'p1', side: GameSide.Player, destroyed: false },
        { id: 'o1', side: GameSide.Opponent, destroyed: false },
      ],
      { turn: 11 },
    );

    const result = checkVictoryConditions(state, configWithLimit);

    expect(result).toBe('draw');
  });
});

// =============================================================================
// Helper Functions
// =============================================================================
