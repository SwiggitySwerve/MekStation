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

describe('Combat Event Factories', () => {
  describe('createAttackDeclaredEvent', () => {
    it('should create a valid attack declared event', () => {
      const modifiers = createTestModifiers();

      const event = createAttackDeclaredEvent(
        'game-1',
        20,
        3,
        'unit-1',
        'unit-2',
        ['medium_laser_1', 'medium_laser_2'],
        7,
        modifiers,
      );

      expect(event.type).toBe(GameEventType.AttackDeclared);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(20);
      expect(event.turn).toBe(3);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBe('unit-1');
    });

    it('should include all attack data in payload', () => {
      const modifiers = createTestModifiers();

      const event = createAttackDeclaredEvent(
        'game-1',
        20,
        3,
        'attacker-1',
        'target-1',
        ['ppc', 'ac10'],
        9,
        modifiers,
      );
      const payload = event.payload as {
        attackerId: string;
        targetId: string;
        weapons: readonly string[];
        toHitNumber: number;
        modifiers: readonly IToHitModifier[];
      };

      expect(payload.attackerId).toBe('attacker-1');
      expect(payload.targetId).toBe('target-1');
      expect(payload.weapons).toEqual(['ppc', 'ac10']);
      expect(payload.toHitNumber).toBe(9);
      expect(payload.modifiers).toEqual(modifiers);
    });

    it('should handle single weapon attack', () => {
      const event = createAttackDeclaredEvent(
        'game-1',
        25,
        4,
        'unit-1',
        'unit-2',
        ['gauss_rifle'],
        5,
        [],
      );
      const payload = event.payload as { weapons: readonly string[] };

      expect(payload.weapons).toHaveLength(1);
      expect(payload.weapons[0]).toBe('gauss_rifle');
    });
  });

  describe('createAttacksRevealedEvent', () => {
    it('should create a public attack reveal boundary event', () => {
      const event = createAttacksRevealedEvent(
        'game-1',
        21,
        3,
        ['player-1', 'opponent-1'],
        2,
      );

      expect(event.type).toBe(GameEventType.AttacksRevealed);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(21);
      expect(event.turn).toBe(3);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBeUndefined();
      expect(event.visibility).toBe('public');
    });

    it('should include revealed unit ids and attack count in payload', () => {
      const event = createAttacksRevealedEvent(
        'game-1',
        21,
        3,
        ['player-1', 'opponent-1'],
        2,
      );
      const payload = event.payload as {
        unitIds: readonly string[];
        attackCount: number;
      };

      expect(payload.unitIds).toEqual(['player-1', 'opponent-1']);
      expect(payload.attackCount).toBe(2);
    });
  });

  describe('createAttackResolvedEvent', () => {
    it('should create a valid attack resolved event for a hit', () => {
      const event = createAttackResolvedEvent(
        'game-1',
        21,
        3,
        'unit-1',
        'unit-2',
        'medium_laser_1',
        8,
        7,
        true,
        'center_torso',
        5,
      );

      expect(event.type).toBe(GameEventType.AttackResolved);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(21);
      expect(event.turn).toBe(3);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBe('unit-1');
    });

    it('should include all hit data in payload', () => {
      const event = createAttackResolvedEvent(
        'game-1',
        21,
        3,
        'attacker',
        'target',
        'ppc',
        9,
        7,
        true,
        'left_arm',
        10,
      );
      const payload = event.payload as {
        attackerId: string;
        targetId: string;
        weaponId: string;
        roll: number;
        toHitNumber: number;
        hit: boolean;
        location: string | undefined;
        damage: number | undefined;
      };

      expect(payload.attackerId).toBe('attacker');
      expect(payload.targetId).toBe('target');
      expect(payload.weaponId).toBe('ppc');
      expect(payload.roll).toBe(9);
      expect(payload.toHitNumber).toBe(7);
      expect(payload.hit).toBe(true);
      expect(payload.location).toBe('left_arm');
      expect(payload.damage).toBe(10);
    });

    it('should handle miss result', () => {
      const event = createAttackResolvedEvent(
        'game-1',
        22,
        3,
        'unit-1',
        'unit-2',
        'ac20',
        5,
        8,
        false,
        undefined,
        undefined,
      );
      const payload = event.payload as {
        hit: boolean;
        location: string | undefined;
        damage: number | undefined;
      };

      expect(payload.hit).toBe(false);
      expect(payload.location).toBeUndefined();
      expect(payload.damage).toBeUndefined();
    });
  });

  describe('createDamageAppliedEvent', () => {
    it('should create a valid damage applied event', () => {
      const event = createDamageAppliedEvent(
        'game-1',
        30,
        4,
        'unit-2',
        'center_torso',
        10,
        15,
        20,
        false,
        undefined,
      );

      expect(event.type).toBe(GameEventType.DamageApplied);
      expect(event.gameId).toBe('game-1');
      expect(event.sequence).toBe(30);
      expect(event.turn).toBe(4);
      expect(event.phase).toBe(GamePhase.WeaponAttack);
      expect(event.actorId).toBe('unit-2');
    });

    it('should include all damage data in payload', () => {
      const event = createDamageAppliedEvent(
        'game-1',
        30,
        4,
        'target',
        'right_torso',
        15,
        5,
        12,
        false,
        ['ammo_srm6'],
      );
      const payload = event.payload as {
        unitId: string;
        location: string;
        damage: number;
        armorRemaining: number;
        structureRemaining: number;
        locationDestroyed: boolean;
        criticals: readonly string[] | undefined;
      };

      expect(payload.unitId).toBe('target');
      expect(payload.location).toBe('right_torso');
      expect(payload.damage).toBe(15);
      expect(payload.armorRemaining).toBe(5);
      expect(payload.structureRemaining).toBe(12);
      expect(payload.locationDestroyed).toBe(false);
      expect(payload.criticals).toEqual(['ammo_srm6']);
    });

    it('should handle location destruction', () => {
      const event = createDamageAppliedEvent(
        'game-1',
        35,
        5,
        'unit-1',
        'left_arm',
        25,
        0,
        0,
        true,
        ['hand_actuator', 'medium_laser'],
      );
      const payload = event.payload as {
        locationDestroyed: boolean;
        armorRemaining: number;
        structureRemaining: number;
        criticals: readonly string[] | undefined;
      };

      expect(payload.locationDestroyed).toBe(true);
      expect(payload.armorRemaining).toBe(0);
      expect(payload.structureRemaining).toBe(0);
      expect(payload.criticals).toEqual(['hand_actuator', 'medium_laser']);
    });

    it('should handle damage without criticals', () => {
      const event = createDamageAppliedEvent(
        'game-1',
        31,
        4,
        'unit-2',
        'head',
        5,
        4,
        3,
        false,
        undefined,
      );
      const payload = event.payload as {
        criticals: readonly string[] | undefined;
      };

      expect(payload.criticals).toBeUndefined();
    });
  });
});

// =============================================================================
// Status Event Factory Tests
// =============================================================================
