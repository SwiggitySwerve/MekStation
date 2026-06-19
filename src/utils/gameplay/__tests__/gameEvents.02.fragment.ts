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

describe('Initiative Event Factories', () => {
  describe('createInitiativeRolledEvent', () => {
    it('should create a valid initiative rolled event', () => {
      const event = createInitiativeRolledEvent(
        'game-1',
        3,
        1,
        8,
        5,
        GameSide.Player,
        GameSide.Opponent,
      );

      expect(event.type).toBe(GameEventType.InitiativeRolled);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(3);
      expect(event.turn).toBe(1);
      expect(event.phase).toBe(GamePhase.Initiative);
    });

    it('should include all roll data in payload', () => {
      const event = createInitiativeRolledEvent(
        'game-1',
        3,
        2,
        10,
        7,
        GameSide.Player,
        GameSide.Player,
      );
      const payload = event.payload as {
        playerRoll: number;
        opponentRoll: number;
        winner: GameSide;
        movesFirst: GameSide;
      };

      expect(payload.playerRoll).toBe(10);
      expect(payload.opponentRoll).toBe(7);
      expect(payload.winner).toBe(GameSide.Player);
      expect(payload.movesFirst).toBe(GameSide.Player);
    });

    it('should handle opponent winning initiative', () => {
      const event = createInitiativeRolledEvent(
        'game-1',
        3,
        1,
        5,
        9,
        GameSide.Opponent,
        GameSide.Player,
      );
      const payload = event.payload as {
        winner: GameSide;
        movesFirst: GameSide;
      };

      expect(payload.winner).toBe(GameSide.Opponent);
      expect(payload.movesFirst).toBe(GameSide.Player);
    });

    it('should handle edge case dice rolls', () => {
      // Minimum roll (2)
      const minEvent = createInitiativeRolledEvent(
        'game-1',
        1,
        1,
        2,
        12,
        GameSide.Opponent,
        GameSide.Player,
      );
      const minPayload = minEvent.payload as {
        playerRoll: number;
        opponentRoll: number;
      };
      expect(minPayload.playerRoll).toBe(2);
      expect(minPayload.opponentRoll).toBe(12);

      // Maximum roll (12)
      const maxEvent = createInitiativeRolledEvent(
        'game-1',
        1,
        1,
        12,
        2,
        GameSide.Player,
        GameSide.Opponent,
      );
      const maxPayload = maxEvent.payload as {
        playerRoll: number;
        opponentRoll: number;
      };
      expect(maxPayload.playerRoll).toBe(12);
      expect(maxPayload.opponentRoll).toBe(2);
    });
  });

  describe('createInitiativeOrderSetEvent', () => {
    it('should create a replayable initiative order event', () => {
      const event = createInitiativeOrderSetEvent(
        'game-1',
        4,
        2,
        GameSide.Player,
        GameSide.Opponent,
      );

      expect(event.type).toBe(GameEventType.InitiativeOrderSet);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(4);
      expect(event.turn).toBe(2);
      expect(event.phase).toBe(GamePhase.Initiative);
      expect(event.payload).toMatchObject({
        winner: GameSide.Player,
        firstMover: GameSide.Opponent,
        secondMover: GameSide.Player,
      });
    });
  });
});

// =============================================================================
// Movement Event Factory Tests
// =============================================================================
