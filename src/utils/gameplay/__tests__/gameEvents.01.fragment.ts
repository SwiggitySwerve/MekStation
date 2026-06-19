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

describe('generateEventId', () => {
  it('should generate a unique ID', () => {
    const id1 = generateEventId();
    const id2 = generateEventId();

    expect(id1).toBeDefined();
    expect(typeof id1).toBe('string');
    expect(id1).not.toBe(id2);
  });

  it('should generate UUID-format string', () => {
    const id = generateEventId();
    // UUID v4 format: 8-4-4-4-12 hex characters
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });
});

// =============================================================================
// Lifecycle Event Factory Tests
// =============================================================================

describe('Lifecycle Event Factories', () => {
  describe('createGameCreatedEvent', () => {
    it('should create a valid game created event', () => {
      const config = createTestConfig();
      const units = [createTestUnit()];

      const event = createGameCreatedEvent('game-1', config, units);

      expect(event.type).toBe(GameEventType.GameCreated);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(0);
      expect(event.turn).toBe(0);
      expect(event.phase).toBe(GamePhase.Initiative);
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should include config and units in payload', () => {
      const config = createTestConfig({ turnLimit: 10 });
      const units = [
        createTestUnit({ id: 'unit-1', side: GameSide.Player }),
        createTestUnit({ id: 'unit-2', side: GameSide.Opponent }),
      ];

      const event = createGameCreatedEvent('game-1', config, units);
      const payload = event.payload as {
        config: IGameConfig;
        units: readonly IGameUnit[];
      };

      expect(payload.config).toBe(config);
      expect(payload.units).toBe(units);
      expect(payload.units).toHaveLength(2);
    });

    it('should have valid ISO timestamp', () => {
      const event = createGameCreatedEvent('game-1', createTestConfig(), []);

      const timestamp = new Date(event.timestamp);
      expect(timestamp.toISOString()).toBe(event.timestamp);
    });
  });

  describe('createGameStartedEvent', () => {
    it('should create a valid game started event', () => {
      const event = createGameStartedEvent('game-1', 1, GameSide.Player);

      expect(event.type).toBe(GameEventType.GameStarted);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(1);
      expect(event.turn).toBe(1);
      expect(event.phase).toBe(GamePhase.Initiative);
    });

    it('should include firstSide in payload', () => {
      const event = createGameStartedEvent('game-1', 1, GameSide.Opponent);
      const payload = event.payload as { firstSide: GameSide };

      expect(payload.firstSide).toBe(GameSide.Opponent);
    });
  });

  describe('createGameEndedEvent', () => {
    it('should create a valid game ended event with winner', () => {
      const event = createGameEndedEvent(
        'game-1',
        100,
        10,
        GamePhase.End,
        GameSide.Player,
        'destruction',
      );

      expect(event.type).toBe(GameEventType.GameEnded);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(100);
      expect(event.turn).toBe(10);
      expect(event.phase).toBe(GamePhase.End);
    });

    it('should include winner and reason in payload', () => {
      const event = createGameEndedEvent(
        'game-1',
        50,
        5,
        GamePhase.End,
        GameSide.Opponent,
        'concede',
      );
      const payload = event.payload as {
        winner: GameSide | 'draw';
        reason: string;
        turns?: number;
      };

      expect(payload.winner).toBe(GameSide.Opponent);
      expect(payload.reason).toBe('concede');
      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (game-event-system delta — backfill `IGameEndedPayload.turns`):
      // the final turn count threads through from the `turn` parameter
      // so summary consumers can read it directly without scanning the
      // turn-lifecycle events.
      expect(payload.turns).toBe(5);
    });

    it('should handle draw result', () => {
      const event = createGameEndedEvent(
        'game-1',
        200,
        20,
        GamePhase.End,
        'draw',
        'turn_limit',
      );
      const payload = event.payload as {
        winner: GameSide | 'draw';
        reason: string;
      };

      expect(payload.winner).toBe('draw');
      expect(payload.reason).toBe('turn_limit');
    });

    it('should support all end reasons', () => {
      const reasons = [
        'destruction',
        'concede',
        'turn_limit',
        'objective',
      ] as const;

      for (const reason of reasons) {
        const event = createGameEndedEvent(
          'game-1',
          1,
          1,
          GamePhase.End,
          GameSide.Player,
          reason,
        );
        const payload = event.payload as { reason: string };
        expect(payload.reason).toBe(reason);
      }
    });
  });
});

// =============================================================================
// Turn/Phase Event Factory Tests
// =============================================================================

describe('Turn/Phase Event Factories', () => {
  describe('createPhaseChangedEvent', () => {
    it('should create a valid phase changed event', () => {
      const event = createPhaseChangedEvent(
        'game-1',
        5,
        2,
        GamePhase.Initiative,
        GamePhase.Movement,
      );

      expect(event.type).toBe(GameEventType.PhaseChanged);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(5);
      expect(event.turn).toBe(2);
      expect(event.phase).toBe(GamePhase.Movement);
    });

    it('should include fromPhase and toPhase in payload', () => {
      const event = createPhaseChangedEvent(
        'game-1',
        10,
        3,
        GamePhase.Movement,
        GamePhase.WeaponAttack,
      );
      const payload = event.payload as {
        fromPhase: GamePhase;
        toPhase: GamePhase;
      };

      expect(payload.fromPhase).toBe(GamePhase.Movement);
      expect(payload.toPhase).toBe(GamePhase.WeaponAttack);
    });

    it('should handle all phase transitions', () => {
      const phases = [
        GamePhase.Initiative,
        GamePhase.Movement,
        GamePhase.WeaponAttack,
        GamePhase.PhysicalAttack,
        GamePhase.Heat,
        GamePhase.End,
      ];

      for (let i = 0; i < phases.length - 1; i++) {
        const event = createPhaseChangedEvent(
          'game-1',
          i,
          1,
          phases[i],
          phases[i + 1],
        );
        const payload = event.payload as {
          fromPhase: GamePhase;
          toPhase: GamePhase;
        };

        expect(payload.fromPhase).toBe(phases[i]);
        expect(payload.toPhase).toBe(phases[i + 1]);
      }
    });
  });
});

// =============================================================================
// Initiative Event Factory Tests
// =============================================================================
