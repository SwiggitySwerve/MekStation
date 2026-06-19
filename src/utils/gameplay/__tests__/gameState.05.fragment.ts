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

describe('applyEvent - UnitDestroyed', () => {
  it('should mark unit as destroyed', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const destroyedEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.UnitDestroyed,
      payload: {
        unitId: 'unit-1',
        cause: 'damage',
      } as IUnitDestroyedPayload,
    });

    const newState = applyEvent(state, destroyedEvent);

    expect(newState.units['unit-1'].destroyed).toBe(true);
    expect(newState.units['unit-1'].destructionCause).toBe('damage');
  });
});

// =============================================================================
// applyEvent Tests - PhysicalAttackResolved
// =============================================================================

describe('applyEvent - PhysicalAttackResolved', () => {
  it('removes the selected attached iNARC pod on successful brush-off replay', () => {
    const selectedINarcPod = {
      teamId: GameSide.Player,
      podType: 'ecm' as const,
      location: 'left_torso',
    };
    const state = createStateWithUnits([
      { id: 'player-1', side: GameSide.Player },
      { id: 'opponent-1', side: GameSide.Opponent },
    ]);
    const initialState: IGameState = {
      ...state,
      units: {
        ...state.units,
        'opponent-1': {
          ...state.units['opponent-1'],
          iNarcPods: [
            { teamId: GameSide.Player, podType: 'homing' },
            selectedINarcPod,
            { teamId: GameSide.Opponent, podType: 'ecm' },
          ],
        },
      },
    };
    const event = createTestEvent({
      type: GameEventType.PhysicalAttackResolved,
      phase: GamePhase.PhysicalAttack,
      payload: {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType: 'brush-off',
        roll: 7,
        toHitNumber: 5,
        hit: true,
        selectedINarcPod,
      } as IPhysicalAttackResolvedPayload,
    });

    const newState = applyEvent(initialState, event);

    expect(newState.units['opponent-1'].iNarcPods).toEqual([
      { teamId: GameSide.Player, podType: 'homing' },
      { teamId: GameSide.Opponent, podType: 'ecm' },
    ]);
  });
});

// =============================================================================
// applyEvent Tests - MinefieldChanged
// =============================================================================

describe('applyEvent - MinefieldChanged', () => {
  const hex = { q: 1, r: 0 };
  const key = coordToKey(hex);

  it('replays add, set, and detonate operations for represented minefields', () => {
    const initialState = createInitialGameState('game-1');
    const added = applyEvent(
      initialState,
      createTestEvent({
        type: GameEventType.MinefieldChanged,
        payload: {
          operation: 'add',
          hex,
          minefield: { type: 'conventional', damagePerLeg: 5, density: 20 },
        } as IMinefieldChangedPayload,
      }),
    );
    const updated = applyEvent(
      added,
      createTestEvent({
        type: GameEventType.MinefieldChanged,
        payload: {
          operation: 'set',
          hex,
          minefield: { type: 'conventional', damagePerLeg: 8, density: 25 },
        } as IMinefieldChangedPayload,
      }),
    );
    const detonated = applyEvent(
      updated,
      createTestEvent({
        type: GameEventType.MinefieldChanged,
        payload: {
          operation: 'detonate',
          hex,
        } as IMinefieldChangedPayload,
      }),
    );

    expect(added.minefields?.[key]).toEqual({
      type: 'conventional',
      damagePerLeg: 5,
      density: 20,
      source: 'event',
    });
    expect(updated.minefields?.[key]).toEqual({
      type: 'conventional',
      damagePerLeg: 8,
      density: 25,
      source: 'event',
    });
    expect(detonated.minefields?.[key]).toEqual({
      type: 'conventional',
      damagePerLeg: 8,
      density: 25,
      detonated: true,
      source: 'event',
    });
  });

  it('replays remove, clear, and reset operations for represented minefields', () => {
    const secondHex = { q: 2, r: 0 };
    const secondKey = coordToKey(secondHex);
    const initialState: IGameState = {
      ...createInitialGameState('game-1'),
      minefields: {
        [key]: { type: 'conventional', damagePerLeg: 5, source: 'scenario' },
        [secondKey]: {
          type: 'conventional',
          damagePerLeg: 10,
          source: 'scenario',
        },
      },
    };
    const removed = applyEvent(
      initialState,
      createTestEvent({
        type: GameEventType.MinefieldChanged,
        payload: {
          operation: 'remove',
          hex,
        } as IMinefieldChangedPayload,
      }),
    );
    const cleared = applyEvent(
      removed,
      createTestEvent({
        type: GameEventType.MinefieldChanged,
        payload: {
          operation: 'clear',
        } as IMinefieldChangedPayload,
      }),
    );
    const reset = applyEvent(
      cleared,
      createTestEvent({
        type: GameEventType.MinefieldChanged,
        payload: {
          operation: 'reset',
          minefields: {
            [key]: {
              type: 'conventional',
              damagePerLeg: 6,
              source: 'test',
            },
          },
        } as IMinefieldChangedPayload,
      }),
    );

    expect(removed.minefields).toEqual({
      [secondKey]: {
        type: 'conventional',
        damagePerLeg: 10,
        source: 'scenario',
      },
    });
    expect(cleared.minefields).toBeUndefined();
    expect(reset.minefields).toEqual({
      [key]: {
        type: 'conventional',
        damagePerLeg: 6,
        source: 'test',
      },
    });
  });
});

// =============================================================================
// applyEvent Tests - SwarmDismounted
// =============================================================================
