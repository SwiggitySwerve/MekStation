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

describe('applyEvent - MovementDeclared', () => {
  it('should update unit position and movement state', () => {
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

    // Declare movement
    const movementEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: 'unit-1',
        from: { q: -2, r: 5 },
        to: { q: 0, r: 3 },
        facing: Facing.Northeast,
        movementType: MovementType.Run,
        mpUsed: 8,
        heatGenerated: 2,
      } as IMovementDeclaredPayload,
    });

    const newState = applyEvent(state, movementEvent);
    const unit = newState.units['unit-1'];

    expect(unit.position).toEqual({ q: 0, r: 3 });
    expect(unit.facing).toBe(Facing.Northeast);
    expect(unit.movementThisTurn).toBe(MovementType.Run);
    expect(unit.hexesMovedThisTurn).toBe(8);
    expect(unit.heat).toBe(2);
    expect(unit.lockState).toBe(LockState.Planning);
  });

  it('records backward movement from the step chain', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const movementEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: 'unit-1',
        from: { q: 0, r: 0 },
        to: { q: -1, r: 0 },
        facing: Facing.North,
        movementType: MovementType.Run,
        mpUsed: 2,
        heatGenerated: 2,
        hexesMoved: 1,
        steps: [
          {
            kind: 'forward',
            index: 0,
            direction: 'backward',
            from: { q: 0, r: 0 },
            to: { q: -1, r: 0 },
            mpCost: 1,
            terrainEntered: 'clear',
            elevationDelta: 0,
          },
        ],
      } as IMovementDeclaredPayload,
    });

    const newState = applyEvent(state, movementEvent);

    expect(newState.units['unit-1'].hexesMovedThisTurn).toBe(1);
    expect(newState.units['unit-1'].movedBackwardThisTurn).toBe(true);
  });

  it('records mechanical jump booster use from the step chain', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const movementEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: 'unit-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        facing: Facing.North,
        movementType: MovementType.Jump,
        mpUsed: 1,
        heatGenerated: 1,
        hexesMoved: 1,
        steps: [
          {
            kind: 'jump',
            index: 0,
            from: { q: 0, r: 0 },
            to: { q: 1, r: 0 },
            mpCost: 1,
            terrainEntered: 'clear',
            usesMechanicalJumpBooster: true,
          },
        ],
      } as IMovementDeclaredPayload,
    });

    const newState = applyEvent(state, movementEvent);

    expect(newState.units['unit-1'].movementThisTurn).toBe(MovementType.Jump);
    expect(newState.units['unit-1'].usedMechanicalJumpBoosterThisTurn).toBe(
      true,
    );
  });

  it('should accumulate heat', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    // Set initial heat
    state = {
      ...state,
      units: {
        ...state.units,
        'unit-1': { ...state.units['unit-1'], heat: 5 },
      },
    };

    const movementEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: 'unit-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 1 },
        facing: Facing.North,
        movementType: MovementType.Jump,
        mpUsed: 4,
        heatGenerated: 4,
      } as IMovementDeclaredPayload,
    });

    const newState = applyEvent(state, movementEvent);

    expect(newState.units['unit-1'].heat).toBe(9); // 5 + 4
  });
});

// =============================================================================
// applyEvent Tests - MovementLocked
// =============================================================================

describe('applyEvent - MovementLocked', () => {
  it('should lock unit movement and increment activation index', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const lockEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.MovementLocked,
      actorId: 'unit-1',
      payload: {},
    });

    const newState = applyEvent(state, lockEvent);

    expect(newState.units['unit-1'].lockState).toBe(LockState.Locked);
    expect(newState.activationIndex).toBe(1);
  });
});

// =============================================================================
// applyEvent Tests - AttacksRevealed
// =============================================================================

describe('applyEvent - AttacksRevealed', () => {
  it('should reveal locked weapon-phase units from the payload', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [
          createTestUnit({ id: 'unit-1' }),
          createTestUnit({ id: 'unit-2', side: GameSide.Opponent }),
        ],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);
    state = {
      ...state,
      phase: GamePhase.WeaponAttack,
      units: {
        ...state.units,
        'unit-1': {
          ...state.units['unit-1'],
          lockState: LockState.Locked,
        },
        'unit-2': {
          ...state.units['unit-2'],
          lockState: LockState.Locked,
        },
      },
    };

    const revealEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.AttacksRevealed,
      phase: GamePhase.WeaponAttack,
      payload: {
        unitIds: ['unit-1', 'unit-2'],
        attackCount: 1,
      } as IAttacksRevealedPayload,
    });

    const newState = applyEvent(state, revealEvent);

    expect(newState.units['unit-1'].lockState).toBe(LockState.Revealed);
    expect(newState.units['unit-2'].lockState).toBe(LockState.Revealed);
  });
});

// =============================================================================
// applyEvent Tests - DamageApplied
// =============================================================================
