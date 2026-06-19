/**
 * Game Events Tests
 *
 * Comprehensive tests for game event factory functions and serialization utilities.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameConfig,
  IGameUnit,
  Facing,
  MovementType,
  IToHitModifier,
} from '@/types/gameplay';

import {
  generateEventId,
  createGameCreatedEvent,
  createGameStartedEvent,
  createGameEndedEvent,
  createPhaseChangedEvent,
  createInitiativeOrderSetEvent,
  createInitiativeRolledEvent,
  createMovementEnhancementActivatedEvent,
  createGoProneMovementDeclaredEvent,
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
  serializeEvent,
  deserializeEvent,
  serializeEvents,
  deserializeEvents,
} from '../gameEvents';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestConfig(overrides: Partial<IGameConfig> = {}): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    ...overrides,
  };
}

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

function createTestModifiers(): readonly IToHitModifier[] {
  return [
    { name: 'Range', value: 2, source: 'range_calculator' },
    { name: 'Target Movement', value: 1, source: 'target_movement' },
  ];
}

// =============================================================================
// generateEventId Tests
// =============================================================================

describe('Event Serialization', () => {
  describe('serializeEvent', () => {
    it('should serialize event to JSON string', () => {
      const event = createGameCreatedEvent('game-1', createTestConfig(), []);

      const json = serializeEvent(event);

      expect(typeof json).toBe('string');
      expect(() => {
        JSON.parse(json);
      }).not.toThrow();
    });

    it('should preserve all event properties', () => {
      const config = createTestConfig({ turnLimit: 5 });
      const units = [createTestUnit()];
      const event = createGameCreatedEvent('game-1', config, units);

      const json = serializeEvent(event);
      const parsed = JSON.parse(json) as {
        type: string;
        gameId: string;
        payload: { config: { turnLimit: number }; units: unknown[] };
      };

      expect(parsed.type).toBe(GameEventType.GameCreated);
      expect(parsed.gameId).toBe('game-1');
      expect(parsed.payload.config.turnLimit).toBe(5);
      expect(parsed.payload.units).toHaveLength(1);
    });
  });

  describe('deserializeEvent', () => {
    it('should deserialize JSON string to event', () => {
      const original = createGameStartedEvent('game-1', 1, GameSide.Player);
      const json = serializeEvent(original);

      const deserialized = deserializeEvent(json);

      expect(deserialized.type).toBe(original.type);
      expect(deserialized.gameId).toBe(original.gameId);
      expect(deserialized.id).toBe(original.id);
    });

    it('should preserve complex payload data', () => {
      const modifiers = createTestModifiers();
      const original = createAttackDeclaredEvent(
        'game-1',
        10,
        2,
        'attacker',
        'target',
        ['weapon1', 'weapon2'],
        7,
        modifiers,
      );
      const json = serializeEvent(original);

      const deserialized = deserializeEvent(json);
      const payload = deserialized.payload as {
        weapons: readonly string[];
        modifiers: readonly IToHitModifier[];
      };

      expect(payload.weapons).toEqual(['weapon1', 'weapon2']);
      expect(payload.modifiers).toEqual(modifiers);
    });
  });

  describe('serializeEvents', () => {
    it('should serialize multiple events to JSON array string', () => {
      const events = [
        createGameCreatedEvent('game-1', createTestConfig(), []),
        createGameStartedEvent('game-1', 1, GameSide.Player),
      ];

      const json = serializeEvents(events);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const json = serializeEvents([]);

      expect(json).toBe('[]');
    });
  });

  describe('deserializeEvents', () => {
    it('should deserialize JSON array string to events', () => {
      const original = [
        createGameCreatedEvent('game-1', createTestConfig(), [
          createTestUnit(),
        ]),
        createGameStartedEvent('game-1', 1, GameSide.Player),
        createPhaseChangedEvent(
          'game-1',
          2,
          1,
          GamePhase.Initiative,
          GamePhase.Movement,
        ),
      ];
      const json = serializeEvents(original);

      const deserialized = deserializeEvents(json);

      expect(deserialized).toHaveLength(3);
      expect(deserialized[0].type).toBe(GameEventType.GameCreated);
      expect(deserialized[1].type).toBe(GameEventType.GameStarted);
      expect(deserialized[2].type).toBe(GameEventType.PhaseChanged);
    });

    it('should handle empty array', () => {
      const deserialized = deserializeEvents('[]');

      expect(deserialized).toHaveLength(0);
    });
  });

  describe('round-trip serialization', () => {
    it('should maintain event integrity through serialize/deserialize', () => {
      const events = [
        createGameCreatedEvent('game-1', createTestConfig(), [
          createTestUnit(),
        ]),
        createGameStartedEvent('game-1', 1, GameSide.Player),
        createInitiativeRolledEvent(
          'game-1',
          2,
          1,
          7,
          5,
          GameSide.Player,
          GameSide.Opponent,
        ),
        createMovementDeclaredEvent(
          'game-1',
          3,
          1,
          'unit-1',
          { q: 0, r: 0 },
          { q: 2, r: -1 },
          Facing.North,
          MovementType.Walk,
          4,
          0,
        ),
        createAttackDeclaredEvent(
          'game-1',
          4,
          1,
          'unit-1',
          'unit-2',
          ['laser'],
          6,
          createTestModifiers(),
        ),
        createDamageAppliedEvent(
          'game-1',
          5,
          1,
          'unit-2',
          'ct',
          5,
          10,
          15,
          false,
          undefined,
        ),
        createHeatGeneratedEvent(
          'game-1',
          6,
          1,
          GamePhase.Heat,
          'unit-1',
          5,
          'weapons',
          10,
        ),
        createPilotHitEvent(
          'game-1',
          7,
          1,
          GamePhase.WeaponAttack,
          'unit-2',
          1,
          1,
          'head_hit',
          false,
          undefined,
        ),
        createUnitDestroyedEvent(
          'game-1',
          8,
          1,
          GamePhase.End,
          'unit-2',
          'damage',
        ),
        createGameEndedEvent(
          'game-1',
          9,
          1,
          GamePhase.End,
          GameSide.Player,
          'destruction',
        ),
      ];

      const json = serializeEvents(events);
      const restored = deserializeEvents(json);

      expect(restored).toHaveLength(events.length);
      for (let i = 0; i < events.length; i++) {
        expect(restored[i].type).toBe(events[i].type);
        expect(restored[i].gameId).toBe(events[i].gameId);
        expect(restored[i].sequence).toBe(events[i].sequence);
        expect(JSON.stringify(restored[i].payload)).toBe(
          JSON.stringify(events[i].payload),
        );
      }
    });
  });
});
