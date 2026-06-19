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

describe('Status Event Factories', () => {
  describe('createHeatGeneratedEvent', () => {
    it('should create a valid heat generated event', () => {
      const event = createHeatGeneratedEvent(
        'game-1',
        40,
        5,
        GamePhase.WeaponAttack,
        'unit-1',
        10,
        'weapons',
        15,
      );

      expect(event.type).toBe(GameEventType.HeatGenerated);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(40);
      expect(event.turn).toBe(5);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBe('unit-1');
    });

    it('should include all heat data in payload', () => {
      const event = createHeatGeneratedEvent(
        'game-1',
        40,
        5,
        GamePhase.Movement,
        'mech-1',
        4,
        'movement',
        8,
      );
      const payload = event.payload as {
        unitId: string;
        amount: number;
        source: string;
        newTotal: number;
      };

      expect(payload.unitId).toBe('mech-1');
      expect(payload.amount).toBe(4);
      expect(payload.source).toBe('movement');
      expect(payload.newTotal).toBe(8);
    });

    it('should handle all heat sources', () => {
      const sources = [
        'movement',
        'weapons',
        'dissipation',
        'external',
      ] as const;

      for (const source of sources) {
        const event = createHeatGeneratedEvent(
          'game-1',
          1,
          1,
          GamePhase.Heat,
          'unit-1',
          5,
          source,
          10,
        );
        const payload = event.payload as { source: string };
        expect(payload.source).toBe(source);
      }
    });
  });

  describe('createHeatDissipatedEvent', () => {
    it('should create a valid heat dissipated event', () => {
      const event = createHeatDissipatedEvent('game-1', 50, 5, 'unit-1', 10, 5);

      expect(event.type).toBe(GameEventType.HeatDissipated);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(50);
      expect(event.turn).toBe(5);
      expect(event.phase).toBe(GamePhase.Heat);
      expect(event.actorId).toBe('unit-1');
    });

    it('should negate the amount in payload', () => {
      const event = createHeatDissipatedEvent('game-1', 50, 5, 'unit-1', 10, 5);
      const payload = event.payload as {
        amount: number;
        source: string;
        newTotal: number;
      };

      expect(payload.amount).toBe(-10);
      expect(payload.source).toBe('dissipation');
      expect(payload.newTotal).toBe(5);
    });

    it('should handle already negative amount', () => {
      const event = createHeatDissipatedEvent('game-1', 51, 5, 'unit-1', -8, 2);
      const payload = event.payload as { amount: number };

      // Math.abs ensures positive before negating
      expect(payload.amount).toBe(-8);
    });
  });

  describe('createPilotHitEvent', () => {
    it('should create a valid pilot hit event', () => {
      const event = createPilotHitEvent(
        'game-1',
        60,
        6,
        GamePhase.WeaponAttack,
        'unit-1',
        1,
        2,
        'head_hit',
        true,
        true,
      );

      expect(event.type).toBe(GameEventType.PilotHit);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(60);
      expect(event.turn).toBe(6);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBe('unit-1');
    });

    it('should include all pilot damage data in payload', () => {
      const event = createPilotHitEvent(
        'game-1',
        60,
        6,
        GamePhase.WeaponAttack,
        'mech-1',
        2,
        4,
        'ammo_explosion',
        true,
        false,
      );
      const payload = event.payload as {
        unitId: string;
        wounds: number;
        totalWounds: number;
        source: string;
        consciousnessCheckRequired: boolean;
        consciousnessCheckPassed: boolean | undefined;
      };

      expect(payload.unitId).toBe('mech-1');
      expect(payload.wounds).toBe(2);
      expect(payload.totalWounds).toBe(4);
      expect(payload.source).toBe('ammo_explosion');
      expect(payload.consciousnessCheckRequired).toBe(true);
      expect(payload.consciousnessCheckPassed).toBe(false);
    });

    it('should handle all pilot damage sources', () => {
      const sources = [
        'head_hit',
        'ammo_explosion',
        'mech_destruction',
      ] as const;

      for (const source of sources) {
        const event = createPilotHitEvent(
          'game-1',
          1,
          1,
          GamePhase.WeaponAttack,
          'unit-1',
          1,
          1,
          source,
          false,
          undefined,
        );
        const payload = event.payload as { source: string };
        expect(payload.source).toBe(source);
      }
    });

    it('should handle no consciousness check required', () => {
      const event = createPilotHitEvent(
        'game-1',
        61,
        6,
        GamePhase.WeaponAttack,
        'unit-1',
        1,
        1,
        'head_hit',
        false,
        undefined,
      );
      const payload = event.payload as {
        consciousnessCheckRequired: boolean;
        consciousnessCheckPassed: boolean | undefined;
      };

      expect(payload.consciousnessCheckRequired).toBe(false);
      expect(payload.consciousnessCheckPassed).toBeUndefined();
    });
  });

  describe('createUnitDestroyedEvent', () => {
    it('should create a valid unit destroyed event', () => {
      const event = createUnitDestroyedEvent(
        'game-1',
        70,
        7,
        GamePhase.WeaponAttack,
        'unit-2',
        'damage',
      );

      expect(event.type).toBe(GameEventType.UnitDestroyed);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(70);
      expect(event.turn).toBe(7);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBe('unit-2');
    });

    it('should include unitId and cause in payload', () => {
      const event = createUnitDestroyedEvent(
        'game-1',
        70,
        7,
        GamePhase.WeaponAttack,
        'mech-destroyed',
        'engine_destroyed',
      );
      const payload = event.payload as {
        unitId: string;
        cause: string;
      };

      expect(payload.unitId).toBe('mech-destroyed');
      expect(payload.cause).toBe('engine_destroyed');
    });

    it('should handle all destruction causes', () => {
      const causes = [
        'damage',
        'ammo_explosion',
        'pilot_death',
        'engine_destroyed',
        'impossible_displacement',
        'ct_destroyed',
        'head_destroyed',
      ] as const;

      for (const cause of causes) {
        const event = createUnitDestroyedEvent(
          'game-1',
          1,
          1,
          GamePhase.End,
          'unit-1',
          cause,
        );
        const payload = event.payload as { cause: string };
        expect(payload.cause).toBe(cause);
      }
    });
  });
});

// =============================================================================
// Serialization Tests
// =============================================================================
