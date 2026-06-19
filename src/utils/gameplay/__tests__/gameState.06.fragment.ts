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

describe('applyEvent - SwarmDismounted', () => {
  it('should replay go-prone swarmer dislodgement by clearing attached swarm state', () => {
    const host = createInitialUnitState(
      createTestUnit({ id: 'player-1', side: GameSide.Player }),
      { q: 0, r: 0 },
    );
    const swarmer: IUnitGameState = {
      ...createInitialUnitState(
        createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
        { q: 0, r: 0 },
      ),
      unitType: UnitType.BATTLE_ARMOR,
      isSwarming: true,
      combatState: {
        kind: 'squad',
        state: {
          unitId: 'opponent-1',
          squadSize: 0,
          troopers: [],
          swarmingUnitId: 'player-1',
          legAttackCommitted: false,
          mimeticActiveThisTurn: true,
          stealthKind: 'mimetic',
          hasMagneticClamp: true,
          hasVibroClaws: false,
          vibroClawCount: 0,
          destroyed: false,
        },
      },
    };
    const state: IGameState = {
      ...createInitialGameState('game-1'),
      status: GameStatus.Active,
      units: {
        'player-1': host,
        'opponent-1': swarmer,
      },
    };

    const event = createTestEvent({
      sequence: 2,
      type: GameEventType.SwarmDismounted,
      payload: {
        unitId: 'opponent-1',
        targetUnitId: 'player-1',
        cause: 'go_prone_dislodgement',
        dismountDamage: 0,
      } as ISwarmDismountedPayload,
    });

    const newState = applyEvent(state, event);
    const replayedSwarmer = newState.units['opponent-1'];

    expect(replayedSwarmer.isSwarming).toBe(false);
    expect(
      replayedSwarmer.combatState?.kind === 'squad'
        ? replayedSwarmer.combatState.state.swarmingUnitId
        : undefined,
    ).toBeUndefined();
    expect(
      replayedSwarmer.combatState?.kind === 'squad'
        ? replayedSwarmer.combatState.state.mimeticActiveThisTurn
        : undefined,
    ).toBe(true);
    expect(newState.units['player-1']).toBe(host);
  });
});

// =============================================================================
// applyEvent Tests - DesignatorMarkerApplied
// =============================================================================

describe('applyEvent - DesignatorMarkerApplied', () => {
  it('should replay TAG designator marker state onto the target', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [
          createTestUnit({ id: 'player-1', side: GameSide.Player }),
          createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
        ],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const markerEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DesignatorMarkerApplied,
      payload: {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: 'tag-1',
        marker: 'tag',
        persistent: false,
        turn: 1,
      } as IDesignatorMarkerAppliedPayload,
    });

    const newState = applyEvent(state, markerEvent);

    expect(newState.units['opponent-1'].tagDesignated).toBe(true);
    expect(newState.units['opponent-1'].narcedBy).toEqual([]);
  });

  it('should replay NARC marker state without duplicating team markers', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [
          createTestUnit({ id: 'player-1', side: GameSide.Player }),
          createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
        ],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const markerEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DesignatorMarkerApplied,
      payload: {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: 'narc-1',
        marker: 'narc',
        persistent: true,
        turn: 1,
        teamId: GameSide.Player,
      } as IDesignatorMarkerAppliedPayload,
    });

    const firstReplay = applyEvent(state, markerEvent);
    const secondReplay = applyEvent(firstReplay, markerEvent);

    expect(secondReplay.units['opponent-1'].narcedBy).toEqual([
      GameSide.Player,
    ]);
    expect(secondReplay.units['opponent-1'].tagDesignated).toBe(false);
  });

  it('should replay iNARC variant pods without duplicating team pods', () => {
    let state = createInitialGameState('game-1');

    const createEvent = createTestEvent({
      type: GameEventType.GameCreated,
      payload: {
        config: createTestConfig(),
        units: [
          createTestUnit({ id: 'player-1', side: GameSide.Player }),
          createTestUnit({ id: 'opponent-1', side: GameSide.Opponent }),
        ],
      } as IGameCreatedPayload,
    });
    state = applyEvent(state, createEvent);

    const markerEvent = createTestEvent({
      sequence: 2,
      type: GameEventType.DesignatorMarkerApplied,
      payload: {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: 'inarc-1',
        marker: 'inarc',
        podType: 'homing',
        persistent: true,
        turn: 1,
        location: 'center_torso',
        teamId: GameSide.Player,
      } as IDesignatorMarkerAppliedPayload,
    });
    const haywireMarkerEvent = createTestEvent({
      sequence: 3,
      type: GameEventType.DesignatorMarkerApplied,
      payload: {
        attackerId: 'opponent-1',
        targetId: 'player-1',
        weaponId: 'inarc-1',
        marker: 'inarc',
        podType: 'haywire',
        persistent: true,
        turn: 1,
        teamId: GameSide.Opponent,
      } as IDesignatorMarkerAppliedPayload,
    });
    const ecmMarkerEvent = createTestEvent({
      sequence: 4,
      type: GameEventType.DesignatorMarkerApplied,
      payload: {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: 'inarc-1',
        marker: 'inarc',
        podType: 'ecm',
        persistent: true,
        turn: 1,
        teamId: GameSide.Player,
      } as IDesignatorMarkerAppliedPayload,
    });
    const nemesisMarkerEvent = createTestEvent({
      sequence: 5,
      type: GameEventType.DesignatorMarkerApplied,
      payload: {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: 'inarc-1',
        marker: 'inarc',
        podType: 'nemesis',
        persistent: true,
        turn: 1,
        teamId: GameSide.Player,
      } as IDesignatorMarkerAppliedPayload,
    });

    const firstReplay = applyEvent(state, markerEvent);
    const secondReplay = applyEvent(firstReplay, markerEvent);
    const haywireReplay = applyEvent(secondReplay, haywireMarkerEvent);
    const ecmReplay = applyEvent(haywireReplay, ecmMarkerEvent);
    const nemesisReplay = applyEvent(ecmReplay, nemesisMarkerEvent);

    expect(nemesisReplay.units['opponent-1'].iNarcPods).toEqual([
      {
        teamId: GameSide.Player,
        podType: 'homing',
        location: 'center_torso',
      },
      {
        teamId: GameSide.Player,
        podType: 'ecm',
      },
      {
        teamId: GameSide.Player,
        podType: 'nemesis',
      },
    ]);
    expect(nemesisReplay.units['opponent-1'].narcedBy).toEqual([]);
    expect(nemesisReplay.units['player-1'].iNarcPods).toEqual([
      {
        teamId: GameSide.Opponent,
        podType: 'haywire',
      },
    ]);
  });
});

// =============================================================================
// deriveState Tests
// =============================================================================
