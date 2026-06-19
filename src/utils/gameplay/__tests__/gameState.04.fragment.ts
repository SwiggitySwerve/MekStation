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

describe('applyEvent - DamageApplied', () => {
  it('should update armor and structure', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const damageEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DamageApplied,
      payload: {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 15,
        structureRemaining: 16,
        locationDestroyed: false,
      } as IDamageAppliedPayload,
    });

    const newState = applyEvent(state, damageEvent);
    const unit = newState.units['unit-1'];

    expect(unit.armor['center_torso']).toBe(15);
    expect(unit.structure['center_torso']).toBe(16);
  });

  it('should track destroyed locations', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const damageEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DamageApplied,
      payload: {
        unitId: 'unit-1',
        location: 'left_arm',
        damage: 20,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } as IDamageAppliedPayload,
    });

    const newState = applyEvent(state, damageEvent);

    expect(newState.units['unit-1'].destroyedLocations).toContain('left_arm');
  });

  it('should track critical hits', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const damageEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DamageApplied,
      payload: {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 5,
        armorRemaining: 0,
        structureRemaining: 10,
        locationDestroyed: false,
        criticals: ['engine', 'gyro'],
      } as IDamageAppliedPayload,
    });

    const newState = applyEvent(state, damageEvent);

    expect(newState.units['unit-1'].destroyedEquipment).toContain('engine');
    expect(newState.units['unit-1'].destroyedEquipment).toContain('gyro');
  });
});

// =============================================================================
// applyEvent Tests - HeatGenerated/HeatDissipated
// =============================================================================

describe('applyEvent - Heat events', () => {
  it('should update heat on HeatGenerated', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const heatEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.HeatGenerated,
      payload: {
        unitId: 'unit-1',
        amount: 5,
        source: 'weapons',
        newTotal: 8,
      } as IHeatPayload,
    });

    const newState = applyEvent(state, heatEvent);

    expect(newState.units['unit-1'].heat).toBe(8);
  });

  it('should update heat on HeatDissipated', () => {
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
        'unit-1': { ...state.units['unit-1'], heat: 15 },
      },
    };

    const heatEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.HeatDissipated,
      payload: {
        unitId: 'unit-1',
        amount: -10,
        source: 'dissipation',
        newTotal: 5,
      } as IHeatPayload,
    });

    const newState = applyEvent(state, heatEvent);

    expect(newState.units['unit-1'].heat).toBe(5);
  });
});

// =============================================================================
// applyEvent Tests - PilotHit
// =============================================================================

describe('applyEvent - PilotHit', () => {
  it('should update pilot wounds', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const pilotHitEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PilotHit,
      payload: {
        unitId: 'unit-1',
        wounds: 1,
        totalWounds: 2,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      } as IPilotHitPayload,
    });

    const newState = applyEvent(state, pilotHitEvent);

    expect(newState.units['unit-1'].pilotWounds).toBe(2);
    expect(newState.units['unit-1'].pilotConscious).toBe(true);
  });

  it('should handle consciousness check failure', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [createTestUnit()],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const pilotHitEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.PilotHit,
      payload: {
        unitId: 'unit-1',
        wounds: 2,
        totalWounds: 4,
        source: 'ammo_explosion',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: false,
      } as IPilotHitPayload,
    });

    const newState = applyEvent(state, pilotHitEvent);

    expect(newState.units['unit-1'].pilotConscious).toBe(false);
  });
});

// =============================================================================
// applyEvent Tests - UnitDestroyed
// =============================================================================
