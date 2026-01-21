/**
 * Game Events Tests
 *
 * Comprehensive tests for game event factory functions and serialization utilities.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import {
  generateEventId,
  createGameCreatedEvent,
  createGameStartedEvent,
  createGameEndedEvent,
  createPhaseChangedEvent,
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createAttackDeclaredEvent,
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
      const payload = event.payload as { config: IGameConfig; units: readonly IGameUnit[] };

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
        'destruction'
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
        'concede'
      );
      const payload = event.payload as {
        winner: GameSide | 'draw';
        reason: string;
      };

      expect(payload.winner).toBe(GameSide.Opponent);
      expect(payload.reason).toBe('concede');
    });

    it('should handle draw result', () => {
      const event = createGameEndedEvent(
        'game-1',
        200,
        20,
        GamePhase.End,
        'draw',
        'turn_limit'
      );
      const payload = event.payload as { winner: GameSide | 'draw'; reason: string };

      expect(payload.winner).toBe('draw');
      expect(payload.reason).toBe('turn_limit');
    });

    it('should support all end reasons', () => {
      const reasons = ['destruction', 'concede', 'turn_limit', 'objective'] as const;

      for (const reason of reasons) {
        const event = createGameEndedEvent(
          'game-1',
          1,
          1,
          GamePhase.End,
          GameSide.Player,
          reason
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
        GamePhase.Movement
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
        GamePhase.WeaponAttack
      );
      const payload = event.payload as { fromPhase: GamePhase; toPhase: GamePhase };

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
        const event = createPhaseChangedEvent('game-1', i, 1, phases[i], phases[i + 1]);
        const payload = event.payload as { fromPhase: GamePhase; toPhase: GamePhase };

        expect(payload.fromPhase).toBe(phases[i]);
        expect(payload.toPhase).toBe(phases[i + 1]);
      }
    });
  });
});

// =============================================================================
// Initiative Event Factory Tests
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
        GameSide.Opponent
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
        GameSide.Player
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
        GameSide.Player
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
        GameSide.Player
      );
      const minPayload = minEvent.payload as { playerRoll: number; opponentRoll: number };
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
        GameSide.Opponent
      );
      const maxPayload = maxEvent.payload as { playerRoll: number; opponentRoll: number };
      expect(maxPayload.playerRoll).toBe(12);
      expect(maxPayload.opponentRoll).toBe(2);
    });
  });
});

// =============================================================================
// Movement Event Factory Tests
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
        0
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
        2
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
        5
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
        0
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
        modifiers
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
        modifiers
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
        []
      );
      const payload = event.payload as { weapons: readonly string[] };

      expect(payload.weapons).toHaveLength(1);
      expect(payload.weapons[0]).toBe('gauss_rifle');
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
        5
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
        10
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
        undefined
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
        undefined
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
        ['ammo_srm6']
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
        ['hand_actuator', 'medium_laser']
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
        undefined
      );
      const payload = event.payload as { criticals: readonly string[] | undefined };

      expect(payload.criticals).toBeUndefined();
    });
  });
});

// =============================================================================
// Status Event Factory Tests
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
        15
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
        8
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
      const sources = ['movement', 'weapons', 'dissipation', 'external'] as const;

      for (const source of sources) {
        const event = createHeatGeneratedEvent(
          'game-1',
          1,
          1,
          GamePhase.Heat,
          'unit-1',
          5,
          source,
          10
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
        true
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
        false
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
      const sources = ['head_hit', 'ammo_explosion', 'mech_destruction'] as const;

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
          undefined
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
        undefined
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
        'damage'
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
        GamePhase.Heat,
        'mech-destroyed',
        'shutdown'
      );
      const payload = event.payload as {
        unitId: string;
        cause: string;
      };

      expect(payload.unitId).toBe('mech-destroyed');
      expect(payload.cause).toBe('shutdown');
    });

    it('should handle all destruction causes', () => {
      const causes = ['damage', 'ammo_explosion', 'pilot_death', 'shutdown'] as const;

      for (const cause of causes) {
        const event = createUnitDestroyedEvent('game-1', 1, 1, GamePhase.End, 'unit-1', cause);
        const payload = event.payload as { cause: string };
        expect(payload.cause).toBe(cause);
      }
    });
  });
});

// =============================================================================
// Serialization Tests
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
        modifiers
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
        createGameCreatedEvent('game-1', createTestConfig(), [createTestUnit()]),
        createGameStartedEvent('game-1', 1, GameSide.Player),
        createPhaseChangedEvent('game-1', 2, 1, GamePhase.Initiative, GamePhase.Movement),
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
        createGameCreatedEvent('game-1', createTestConfig(), [createTestUnit()]),
        createGameStartedEvent('game-1', 1, GameSide.Player),
        createInitiativeRolledEvent('game-1', 2, 1, 7, 5, GameSide.Player, GameSide.Opponent),
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
          0
        ),
        createAttackDeclaredEvent(
          'game-1',
          4,
          1,
          'unit-1',
          'unit-2',
          ['laser'],
          6,
          createTestModifiers()
        ),
        createDamageAppliedEvent('game-1', 5, 1, 'unit-2', 'ct', 5, 10, 15, false, undefined),
        createHeatGeneratedEvent('game-1', 6, 1, GamePhase.Heat, 'unit-1', 5, 'weapons', 10),
        createPilotHitEvent('game-1', 7, 1, GamePhase.WeaponAttack, 'unit-2', 1, 1, 'head_hit', false, undefined),
        createUnitDestroyedEvent('game-1', 8, 1, GamePhase.End, 'unit-2', 'damage'),
        createGameEndedEvent('game-1', 9, 1, GamePhase.End, GameSide.Player, 'destruction'),
      ];

      const json = serializeEvents(events);
      const restored = deserializeEvents(json);

      expect(restored).toHaveLength(events.length);
      for (let i = 0; i < events.length; i++) {
        expect(restored[i].type).toBe(events[i].type);
        expect(restored[i].gameId).toBe(events[i].gameId);
        expect(restored[i].sequence).toBe(events[i].sequence);
        expect(JSON.stringify(restored[i].payload)).toBe(JSON.stringify(events[i].payload));
      }
    });
  });
});
