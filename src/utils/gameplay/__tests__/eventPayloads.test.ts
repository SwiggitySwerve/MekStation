/**
 * Event Payloads Tests
 *
 * Tests for type-safe event payload extractors.
 */

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
import {
  IGameEvent,
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
} from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

function createBaseEvent(
  overrides: Partial<IGameEvent> = {}
): IGameEvent {
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

describe('isEventType', () => {
  it('should return true for matching event type', () => {
    const event = createGameCreatedEvent();
    expect(isEventType(event, GameEventType.GameCreated)).toBe(true);
  });

  it('should return false for non-matching event type', () => {
    const event = createGameCreatedEvent();
    expect(isEventType(event, GameEventType.GameStarted)).toBe(false);
  });

  it('should work with all event types', () => {
    const eventTypes = [
      { event: createGameCreatedEvent(), type: GameEventType.GameCreated },
      { event: createGameStartedEvent(), type: GameEventType.GameStarted },
      { event: createGameEndedEvent(), type: GameEventType.GameEnded },
      { event: createPhaseChangedEvent(), type: GameEventType.PhaseChanged },
      { event: createInitiativeRolledEvent(), type: GameEventType.InitiativeRolled },
      { event: createMovementDeclaredEvent(), type: GameEventType.MovementDeclared },
      { event: createMovementLockedEvent(), type: GameEventType.MovementLocked },
      { event: createAttackDeclaredEvent(), type: GameEventType.AttackDeclared },
      { event: createAttackResolvedEvent(), type: GameEventType.AttackResolved },
      { event: createDamageAppliedEvent(), type: GameEventType.DamageApplied },
      { event: createHeatGeneratedEvent(), type: GameEventType.HeatGenerated },
      { event: createHeatDissipatedEvent(), type: GameEventType.HeatDissipated },
      { event: createPilotHitEvent(), type: GameEventType.PilotHit },
      { event: createUnitDestroyedEvent(), type: GameEventType.UnitDestroyed },
    ];

    for (const { event, type } of eventTypes) {
      expect(isEventType(event, type)).toBe(true);
    }
  });
});

// =============================================================================
// Payload Extractor Tests
// =============================================================================

describe('getGameCreatedPayload', () => {
  it('should extract payload from GameCreated event', () => {
    const event = createGameCreatedEvent();
    const payload = getGameCreatedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.config.mapRadius).toBe(10);
    expect(payload?.units.length).toBe(1);
    expect(payload?.units[0].name).toBe('Test Mech');
  });

  it('should return null for non-GameCreated event', () => {
    const event = createGameStartedEvent();
    const payload = getGameCreatedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getGameStartedPayload', () => {
  it('should extract payload from GameStarted event', () => {
    const event = createGameStartedEvent();
    const payload = getGameStartedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.firstSide).toBe(GameSide.Player);
  });

  it('should return null for non-GameStarted event', () => {
    const event = createGameCreatedEvent();
    const payload = getGameStartedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getGameEndedPayload', () => {
  it('should extract payload from GameEnded event', () => {
    const event = createGameEndedEvent();
    const payload = getGameEndedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.winner).toBe(GameSide.Player);
    expect(payload?.reason).toBe('destruction');
  });

  it('should return null for non-GameEnded event', () => {
    const event = createGameStartedEvent();
    const payload = getGameEndedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getPhaseChangedPayload', () => {
  it('should extract payload from PhaseChanged event', () => {
    const event = createPhaseChangedEvent();
    const payload = getPhaseChangedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.fromPhase).toBe(GamePhase.Initiative);
    expect(payload?.toPhase).toBe(GamePhase.Movement);
  });

  it('should return null for non-PhaseChanged event', () => {
    const event = createGameStartedEvent();
    const payload = getPhaseChangedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getInitiativeRolledPayload', () => {
  it('should extract payload from InitiativeRolled event', () => {
    const event = createInitiativeRolledEvent();
    const payload = getInitiativeRolledPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.playerRoll).toBe(8);
    expect(payload?.opponentRoll).toBe(5);
    expect(payload?.winner).toBe(GameSide.Player);
    expect(payload?.movesFirst).toBe(GameSide.Opponent);
  });

  it('should return null for non-InitiativeRolled event', () => {
    const event = createGameStartedEvent();
    const payload = getInitiativeRolledPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getMovementDeclaredPayload', () => {
  it('should extract payload from MovementDeclared event', () => {
    const event = createMovementDeclaredEvent();
    const payload = getMovementDeclaredPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-1');
    expect(payload?.from).toEqual({ q: 0, r: 0 });
    expect(payload?.to).toEqual({ q: 1, r: 0 });
    expect(payload?.facing).toBe(Facing.North);
    expect(payload?.movementType).toBe(MovementType.Walk);
    expect(payload?.mpUsed).toBe(1);
  });

  it('should return null for non-MovementDeclared event', () => {
    const event = createGameStartedEvent();
    const payload = getMovementDeclaredPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getMovementLockedPayload', () => {
  it('should extract payload from MovementLocked event', () => {
    const event = createMovementLockedEvent();
    const payload = getMovementLockedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-1');
  });

  it('should return null for non-MovementLocked event', () => {
    const event = createGameStartedEvent();
    const payload = getMovementLockedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getAttackDeclaredPayload', () => {
  it('should extract payload from AttackDeclared event', () => {
    const event = createAttackDeclaredEvent();
    const payload = getAttackDeclaredPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.attackerId).toBe('unit-1');
    expect(payload?.targetId).toBe('unit-2');
    expect(payload?.weapons).toEqual(['weapon-1']);
    expect(payload?.toHitNumber).toBe(7);
    expect(payload?.modifiers.length).toBe(2);
  });

  it('should return null for non-AttackDeclared event', () => {
    const event = createGameStartedEvent();
    const payload = getAttackDeclaredPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getAttackResolvedPayload', () => {
  it('should extract payload from AttackResolved event', () => {
    const event = createAttackResolvedEvent();
    const payload = getAttackResolvedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.attackerId).toBe('unit-1');
    expect(payload?.targetId).toBe('unit-2');
    expect(payload?.weaponId).toBe('weapon-1');
    expect(payload?.roll).toBe(9);
    expect(payload?.hit).toBe(true);
    expect(payload?.location).toBe('center_torso');
    expect(payload?.damage).toBe(10);
  });

  it('should return null for non-AttackResolved event', () => {
    const event = createGameStartedEvent();
    const payload = getAttackResolvedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getDamageAppliedPayload', () => {
  it('should extract payload from DamageApplied event', () => {
    const event = createDamageAppliedEvent();
    const payload = getDamageAppliedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-2');
    expect(payload?.location).toBe('center_torso');
    expect(payload?.damage).toBe(10);
    expect(payload?.armorRemaining).toBe(10);
    expect(payload?.structureRemaining).toBe(16);
    expect(payload?.locationDestroyed).toBe(false);
  });

  it('should return null for non-DamageApplied event', () => {
    const event = createGameStartedEvent();
    const payload = getDamageAppliedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getHeatGeneratedPayload', () => {
  it('should extract payload from HeatGenerated event', () => {
    const event = createHeatGeneratedEvent();
    const payload = getHeatGeneratedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-1');
    expect(payload?.amount).toBe(5);
    expect(payload?.source).toBe('weapons');
    expect(payload?.newTotal).toBe(5);
  });

  it('should return null for non-HeatGenerated event', () => {
    const event = createGameStartedEvent();
    const payload = getHeatGeneratedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getHeatDissipatedPayload', () => {
  it('should extract payload from HeatDissipated event', () => {
    const event = createHeatDissipatedEvent();
    const payload = getHeatDissipatedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-1');
    expect(payload?.amount).toBe(-3);
    expect(payload?.source).toBe('dissipation');
    expect(payload?.newTotal).toBe(2);
  });

  it('should return null for non-HeatDissipated event', () => {
    const event = createGameStartedEvent();
    const payload = getHeatDissipatedPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getPilotHitPayload', () => {
  it('should extract payload from PilotHit event', () => {
    const event = createPilotHitEvent();
    const payload = getPilotHitPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-2');
    expect(payload?.wounds).toBe(1);
    expect(payload?.totalWounds).toBe(1);
    expect(payload?.source).toBe('head_hit');
    expect(payload?.consciousnessCheckRequired).toBe(true);
    expect(payload?.consciousnessCheckPassed).toBe(true);
  });

  it('should return null for non-PilotHit event', () => {
    const event = createGameStartedEvent();
    const payload = getPilotHitPayload(event);

    expect(payload).toBeNull();
  });
});

describe('getUnitDestroyedPayload', () => {
  it('should extract payload from UnitDestroyed event', () => {
    const event = createUnitDestroyedEvent();
    const payload = getUnitDestroyedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitId).toBe('unit-2');
    expect(payload?.cause).toBe('damage');
  });

  it('should return null for non-UnitDestroyed event', () => {
    const event = createGameStartedEvent();
    const payload = getUnitDestroyedPayload(event);

    expect(payload).toBeNull();
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('filterEventsByType', () => {
  const events: IGameEvent[] = [
    createGameCreatedEvent(),
    createGameStartedEvent(),
    createPhaseChangedEvent(),
    createPhaseChangedEvent(),
    createMovementDeclaredEvent(),
  ];

  it('should filter events by type', () => {
    const phaseChangedEvents = filterEventsByType(events, GameEventType.PhaseChanged);
    expect(phaseChangedEvents.length).toBe(2);
    expect(phaseChangedEvents.every(e => e.type === GameEventType.PhaseChanged)).toBe(true);
  });

  it('should return empty array if no events match', () => {
    const unitDestroyedEvents = filterEventsByType(events, GameEventType.UnitDestroyed);
    expect(unitDestroyedEvents.length).toBe(0);
  });

  it('should return single event when only one matches', () => {
    const gameCreatedEvents = filterEventsByType(events, GameEventType.GameCreated);
    expect(gameCreatedEvents.length).toBe(1);
  });

  it('should handle empty event array', () => {
    const result = filterEventsByType([], GameEventType.GameCreated);
    expect(result.length).toBe(0);
  });
});

describe('getLastEventOfType', () => {
  it('should return the last event of the specified type', () => {
    const events: IGameEvent[] = [
      { ...createPhaseChangedEvent(), id: 'event-1', sequence: 1 },
      { ...createMovementDeclaredEvent(), id: 'event-2', sequence: 2 },
      { ...createPhaseChangedEvent(), id: 'event-3', sequence: 3 },
      { ...createMovementDeclaredEvent(), id: 'event-4', sequence: 4 },
    ];

    const lastPhaseChange = getLastEventOfType(events, GameEventType.PhaseChanged);
    expect(lastPhaseChange).not.toBeNull();
    expect(lastPhaseChange?.id).toBe('event-3');
  });

  it('should return null if no events of type exist', () => {
    const events: IGameEvent[] = [
      createGameCreatedEvent(),
      createGameStartedEvent(),
    ];

    const result = getLastEventOfType(events, GameEventType.UnitDestroyed);
    expect(result).toBeNull();
  });

  it('should return the only event if there is one', () => {
    const events: IGameEvent[] = [
      createGameCreatedEvent(),
    ];

    const result = getLastEventOfType(events, GameEventType.GameCreated);
    expect(result).not.toBeNull();
    expect(result?.type).toBe(GameEventType.GameCreated);
  });

  it('should handle empty event array', () => {
    const result = getLastEventOfType([], GameEventType.GameCreated);
    expect(result).toBeNull();
  });
});

describe('getEventsForUnit', () => {
  it('should return events where unit is the actor', () => {
    // Use events that don't have unitId in payload
    const events: IGameEvent[] = [
      { ...createPhaseChangedEvent(), actorId: 'unit-1', id: 'e1' },
      { ...createPhaseChangedEvent(), actorId: 'unit-2', id: 'e2' },
    ];

    const unit1Events = getEventsForUnit(events, 'unit-1');
    expect(unit1Events.length).toBe(1);
    expect(unit1Events[0].actorId).toBe('unit-1');
  });

  it('should return events where unit is in the payload unitId', () => {
    const damageEvent = createDamageAppliedEvent(); // unitId: 'unit-2'
    const events: IGameEvent[] = [damageEvent];

    const unit2Events = getEventsForUnit(events, 'unit-2');
    expect(unit2Events.length).toBe(1);
  });

  it('should return events where unit is the attacker', () => {
    const attackEvent = createAttackDeclaredEvent(); // attackerId: 'unit-1'
    const events: IGameEvent[] = [attackEvent];

    const unit1Events = getEventsForUnit(events, 'unit-1');
    expect(unit1Events.length).toBe(1);
  });

  it('should return events where unit is the target', () => {
    const attackEvent = createAttackDeclaredEvent(); // targetId: 'unit-2'
    const events: IGameEvent[] = [attackEvent];

    const unit2Events = getEventsForUnit(events, 'unit-2');
    expect(unit2Events.length).toBe(1);
  });

  it('should return empty array if no events for unit', () => {
    const events: IGameEvent[] = [
      createGameCreatedEvent(),
      createGameStartedEvent(),
    ];

    const result = getEventsForUnit(events, 'unit-nonexistent');
    expect(result.length).toBe(0);
  });

  it('should handle empty event array', () => {
    const result = getEventsForUnit([], 'unit-1');
    expect(result.length).toBe(0);
  });

  it('should return multiple events for same unit', () => {
    // Use events without overlapping unitId in payload
    const events: IGameEvent[] = [
      { ...createPhaseChangedEvent(), actorId: 'unit-1', id: 'e1' },
      { ...createPhaseChangedEvent(), actorId: 'unit-1', id: 'e2' },
      { ...createPhaseChangedEvent(), actorId: 'unit-1', id: 'e3' },
      { ...createPhaseChangedEvent(), actorId: 'unit-2', id: 'e4' },
    ];

    const unit1Events = getEventsForUnit(events, 'unit-1');
    expect(unit1Events.length).toBe(3);
  });
});
