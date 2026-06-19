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
      {
        event: createInitiativeRolledEvent(),
        type: GameEventType.InitiativeRolled,
      },
      {
        event: createMovementDeclaredEvent(),
        type: GameEventType.MovementDeclared,
      },
      {
        event: createMovementLockedEvent(),
        type: GameEventType.MovementLocked,
      },
      {
        event: createAttackDeclaredEvent(),
        type: GameEventType.AttackDeclared,
      },
      {
        event: createAttackResolvedEvent(),
        type: GameEventType.AttackResolved,
      },
      { event: createDamageAppliedEvent(), type: GameEventType.DamageApplied },
      { event: createHeatGeneratedEvent(), type: GameEventType.HeatGenerated },
      {
        event: createHeatDissipatedEvent(),
        type: GameEventType.HeatDissipated,
      },
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

describe('getAttacksRevealedPayload', () => {
  it('should extract payload from AttacksRevealed event', () => {
    const event = createAttacksRevealedEvent();
    const payload = getAttacksRevealedPayload(event);

    expect(payload).not.toBeNull();
    expect(payload?.unitIds).toEqual(['unit-1', 'unit-2']);
    expect(payload?.attackCount).toBe(2);
  });

  it('should return null for non-AttacksRevealed event', () => {
    const event = createAttackDeclaredEvent();
    const payload = getAttacksRevealedPayload(event);

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
