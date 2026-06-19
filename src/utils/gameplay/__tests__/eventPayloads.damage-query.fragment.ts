import type { IGameEvent } from './eventPayloads.test-helpers';

import {
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
} from './eventPayloads.test-helpers';
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
    const phaseChangedEvents = filterEventsByType(
      events,
      GameEventType.PhaseChanged,
    );
    expect(phaseChangedEvents.length).toBe(2);
    expect(
      phaseChangedEvents.every((e) => e.type === GameEventType.PhaseChanged),
    ).toBe(true);
  });

  it('should return empty array if no events match', () => {
    const unitDestroyedEvents = filterEventsByType(
      events,
      GameEventType.UnitDestroyed,
    );
    expect(unitDestroyedEvents.length).toBe(0);
  });

  it('should return single event when only one matches', () => {
    const gameCreatedEvents = filterEventsByType(
      events,
      GameEventType.GameCreated,
    );
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

    const lastPhaseChange = getLastEventOfType(
      events,
      GameEventType.PhaseChanged,
    );
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
    const events: IGameEvent[] = [createGameCreatedEvent()];

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
