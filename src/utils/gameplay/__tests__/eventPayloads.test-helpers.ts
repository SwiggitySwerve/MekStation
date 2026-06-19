/**
 * Event Payloads Tests
 *
 * Tests for type-safe event payload extractors.
 */

import {
  IGameEvent,
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
} from '@/types/gameplay';

import {
  isEventType,
  getGameCreatedPayload,
  getGameStartedPayload,
  getGameEndedPayload,
  getPhaseChangedPayload,
  getInitiativeRolledPayload,
  getMovementDeclaredPayload,
  getMovementLockedPayload,
  getAttackDeclaredPayload,
  getAttacksRevealedPayload,
  getAttackResolvedPayload,
  getDamageAppliedPayload,
  getHeatGeneratedPayload,
  getHeatDissipatedPayload,
  getPilotHitPayload,
  getUnitDestroyedPayload,
  filterEventsByType,
  getLastEventOfType,
  getEventsForUnit,
} from '../eventPayloads';

// =============================================================================
// Test Fixtures
// =============================================================================

function createBaseEvent(overrides: Partial<IGameEvent> = {}): IGameEvent {
  return {
    id: 'event-1',
    gameId: 'game-1',
    sequence: 1,
    timestamp: '2025-01-01T00:00:00Z',
    type: GameEventType.GameCreated,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {},
    ...overrides,
  };
}

function createGameCreatedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.GameCreated,
    payload: {
      config: {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['destruction'],
        optionalRules: [],
      },
      units: [
        {
          id: 'unit-1',
          name: 'Test Mech',
          side: GameSide.Player,
          unitRef: 'mech-ref-1',
          pilotRef: 'pilot-ref-1',
          gunnery: 4,
          piloting: 5,
        },
      ],
    },
  });
}

function createGameStartedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.GameStarted,
    payload: {
      firstSide: GameSide.Player,
    },
  });
}

function createGameEndedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.GameEnded,
    payload: {
      winner: GameSide.Player,
      reason: 'destruction',
    },
  });
}

function createPhaseChangedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.PhaseChanged,
    payload: {
      fromPhase: GamePhase.Initiative,
      toPhase: GamePhase.Movement,
    },
  });
}

function createInitiativeRolledEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.InitiativeRolled,
    payload: {
      playerRoll: 8,
      opponentRoll: 5,
      winner: GameSide.Player,
      movesFirst: GameSide.Opponent,
    },
  });
}

function createMovementDeclaredEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.MovementDeclared,
    actorId: 'unit-1',
    payload: {
      unitId: 'unit-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    },
  });
}

function createMovementLockedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.MovementLocked,
    actorId: 'unit-1',
    payload: {
      unitId: 'unit-1',
    },
  });
}

function createAttackDeclaredEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.AttackDeclared,
    actorId: 'unit-1',
    payload: {
      attackerId: 'unit-1',
      targetId: 'unit-2',
      weapons: ['weapon-1'],
      toHitNumber: 7,
      modifiers: [
        { name: 'Base', value: 4, source: 'gunnery' },
        { name: 'Range', value: 2, source: 'range' },
      ],
    },
  });
}

function createAttacksRevealedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.AttacksRevealed,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitIds: ['unit-1', 'unit-2'],
      attackCount: 2,
    },
  });
}

function createAttackResolvedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.AttackResolved,
    actorId: 'unit-1',
    payload: {
      attackerId: 'unit-1',
      targetId: 'unit-2',
      weaponId: 'weapon-1',
      roll: 9,
      toHitNumber: 7,
      hit: true,
      location: 'center_torso',
      damage: 10,
    },
  });
}

function createDamageAppliedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.DamageApplied,
    payload: {
      unitId: 'unit-2',
      location: 'center_torso',
      damage: 10,
      armorRemaining: 10,
      structureRemaining: 16,
      locationDestroyed: false,
    },
  });
}

function createHeatGeneratedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.HeatGenerated,
    actorId: 'unit-1',
    payload: {
      unitId: 'unit-1',
      amount: 5,
      source: 'weapons',
      newTotal: 5,
    },
  });
}

function createHeatDissipatedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.HeatDissipated,
    actorId: 'unit-1',
    payload: {
      unitId: 'unit-1',
      amount: -3,
      source: 'dissipation',
      newTotal: 2,
    },
  });
}

function createPilotHitEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.PilotHit,
    payload: {
      unitId: 'unit-2',
      wounds: 1,
      totalWounds: 1,
      source: 'head_hit',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    },
  });
}

function createUnitDestroyedEvent(): IGameEvent {
  return createBaseEvent({
    type: GameEventType.UnitDestroyed,
    payload: {
      unitId: 'unit-2',
      cause: 'damage',
    },
  });
}

// =============================================================================
// isEventType Tests
// =============================================================================

export {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  isEventType,
  getGameCreatedPayload,
  getGameStartedPayload,
  getGameEndedPayload,
  getPhaseChangedPayload,
  getInitiativeRolledPayload,
  getMovementDeclaredPayload,
  getMovementLockedPayload,
  getAttackDeclaredPayload,
  getAttacksRevealedPayload,
  getAttackResolvedPayload,
  getDamageAppliedPayload,
  getHeatGeneratedPayload,
  getHeatDissipatedPayload,
  getPilotHitPayload,
  getUnitDestroyedPayload,
  filterEventsByType,
  getLastEventOfType,
  getEventsForUnit,
  createBaseEvent,
  createGameCreatedEvent,
  createGameStartedEvent,
  createGameEndedEvent,
  createPhaseChangedEvent,
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createAttackDeclaredEvent,
  createAttacksRevealedEvent,
  createAttackResolvedEvent,
  createDamageAppliedEvent,
  createHeatGeneratedEvent,
  createHeatDissipatedEvent,
  createPilotHitEvent,
  createUnitDestroyedEvent,
};
export type { IGameEvent };
