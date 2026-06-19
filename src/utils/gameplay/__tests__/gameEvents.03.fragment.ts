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

describe('Movement Event Factories', () => {
  describe('createMovementDeclaredEvent', () => {
    it('should create a valid movement declared event', () => {
      const event = createMovementDeclaredEvent(
        'game-1',
        10,
        2,
        'unit-1',
        { q: 0, r: 0 },
        { q: 2, r: -1 },
        Facing.Northeast,
        MovementType.Walk,
        4,
        0,
      );

      expect(event.type).toBe(GameEventType.MovementDeclared);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(10);
      expect(event.turn).toBe(2);
      expect(event.phase).toBe(GamePhase.Movement);
      expect(event.actorId).toBe('unit-1');
    });

    it('should include all movement data in payload', () => {
      const from = { q: -2, r: 3 };
      const to = { q: 1, r: 0 };

      const event = createMovementDeclaredEvent(
        'game-1',
        10,
        2,
        'unit-1',
        from,
        to,
        Facing.South,
        MovementType.Run,
        8,
        2,
      );
      const payload = event.payload as {
        unitId: string;
        from: { q: number; r: number };
        to: { q: number; r: number };
        facing: Facing;
        movementType: MovementType;
        mpUsed: number;
        heatGenerated: number;
      };

      expect(payload.unitId).toBe('unit-1');
      expect(payload.from).toEqual(from);
      expect(payload.to).toEqual(to);
      expect(payload.facing).toBe(Facing.South);
      expect(payload.movementType).toBe(MovementType.Run);
      expect(payload.mpUsed).toBe(8);
      expect(payload.heatGenerated).toBe(2);
    });

    it('should handle jump movement with heat', () => {
      const event = createMovementDeclaredEvent(
        'game-1',
        15,
        3,
        'unit-2',
        { q: 0, r: 0 },
        { q: 4, r: -2 },
        Facing.Northwest,
        MovementType.Jump,
        5,
        5,
      );
      const payload = event.payload as {
        movementType: MovementType;
        heatGenerated: number;
      };

      expect(payload.movementType).toBe(MovementType.Jump);
      expect(payload.heatGenerated).toBe(5);
    });

    it('should handle stationary movement', () => {
      const position = { q: 3, r: 3 };
      const event = createMovementDeclaredEvent(
        'game-1',
        10,
        1,
        'unit-1',
        position,
        position,
        Facing.North,
        MovementType.Stationary,
        0,
        0,
      );
      const payload = event.payload as {
        from: { q: number; r: number };
        to: { q: number; r: number };
        mpUsed: number;
        heatGenerated: number;
      };

      expect(payload.from).toEqual(position);
      expect(payload.to).toEqual(position);
      expect(payload.mpUsed).toBe(0);
      expect(payload.heatGenerated).toBe(0);
    });
  });

  describe('createGoProneMovementDeclaredEvent', () => {
    it('should create a same-hex movement declared event with a goProne step', () => {
      const position = { q: 3, r: -1 };
      const event = createGoProneMovementDeclaredEvent(
        'game-1',
        10,
        1,
        'unit-1',
        position,
        Facing.North,
      );
      const payload = event.payload as {
        from: { q: number; r: number };
        to: { q: number; r: number };
        movementType: MovementType;
        mpUsed: number;
        heatGenerated: number;
        hexesMoved?: number;
        steps?: readonly unknown[];
      };

      expect(event.type).toBe(GameEventType.MovementDeclared);
      expect(payload.from).toEqual(position);
      expect(payload.to).toEqual(position);
      expect(payload.movementType).toBe(MovementType.Stationary);
      expect(payload.mpUsed).toBe(1);
      expect(payload.heatGenerated).toBe(0);
      expect(payload.hexesMoved).toBe(0);
      expect(payload.steps).toEqual([
        { kind: 'goProne', index: 0, at: position, mpCost: 1 },
      ]);
    });

    it('should preserve a zero-cost goProne step for hull-down transitions', () => {
      const position = { q: 3, r: -1 };
      const event = createGoProneMovementDeclaredEvent(
        'game-1',
        10,
        1,
        'unit-1',
        position,
        Facing.North,
        0,
      );
      const payload = event.payload as {
        mpUsed: number;
        turningMpCost?: number;
        steps?: readonly unknown[];
      };

      expect(payload.mpUsed).toBe(0);
      expect(payload.turningMpCost).toBe(0);
      expect(payload.steps).toEqual([
        { kind: 'goProne', index: 0, at: position, mpCost: 0 },
      ]);
    });
  });

  describe('createMovementEnhancementActivatedEvent', () => {
    it('should create a movement enhancement activation event', () => {
      const event = createMovementEnhancementActivatedEvent(
        'game-1',
        11,
        2,
        'unit-1',
        'MASC',
      );

      expect(event.type).toBe(GameEventType.MovementEnhancementActivated);
      expect(event.phase).toBe(GamePhase.Movement);
      expect(event.actorId).toBe('unit-1');
      expect(event.payload).toEqual({
        unitId: 'unit-1',
        enhancement: 'MASC',
      });
    });
  });

  describe('createMovementLockedEvent', () => {
    it('should create a valid movement locked event', () => {
      const event = createMovementLockedEvent('game-1', 11, 2, 'unit-1');

      expect(event.type).toBe(GameEventType.MovementLocked);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(11);
      expect(event.turn).toBe(2);
      expect(event.phase).toBe(GamePhase.Movement);
      expect(event.actorId).toBe('unit-1');
    });

    it('should include unitId in payload', () => {
      const event = createMovementLockedEvent('game-1', 12, 3, 'mech-atlas');
      const payload = event.payload as { unitId: string };

      expect(payload.unitId).toBe('mech-atlas');
    });
  });
});

// =============================================================================
// Combat Event Factory Tests
// =============================================================================
