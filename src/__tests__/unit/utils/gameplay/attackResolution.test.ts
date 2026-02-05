/**
 * Attack Resolution Tests
 * Tests for attack declaration and resolution flow.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import {
  IGameConfig,
  IGameUnit,
  IGameEvent,
  IGameSession,
  GameSide,
  GameEventType,
  LockState,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  RangeBracket,
  FiringArc,
  MovementType,
  WeaponCategory,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  createGameSession,
  startGame,
  advancePhase,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveAttack,
  resolveAllAttacks,
  DiceRoller,
} from '@/utils/gameplay/gameSession';

describe('Attack Resolution', () => {
  const testConfig: IGameConfig = {
    mapRadius: 10,
    turnLimit: 10,
    victoryConditions: ['destruction'],
    optionalRules: [],
  };

  const testUnits: IGameUnit[] = [
    {
      id: 'unit-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-2',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-3r',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
    },
  ];

  function setupWeaponAttackPhase(): IGameSession {
    let session = createGameSession(testConfig, testUnits);
    session = startGame(session, GameSide.Player);
    session = advancePhase(session);

    session = declareMovement(
      session,
      'unit-1',
      { q: 0, r: 0 },
      { q: 0, r: 0 },
      Facing.North,
      MovementType.Stationary,
      0,
      0,
    );
    session = lockMovement(session, 'unit-1');

    session = declareMovement(
      session,
      'unit-2',
      { q: 3, r: 0 },
      { q: 3, r: 0 },
      Facing.South,
      MovementType.Stationary,
      0,
      0,
    );
    session = lockMovement(session, 'unit-2');

    session = advancePhase(session);

    return session;
  }

  function createMockDiceRoller(
    rolls: Array<{ dice: [number, number]; total: number }>,
  ): DiceRoller {
    let callIndex = 0;
    return () => {
      const roll = rolls[callIndex] || rolls[rolls.length - 1];
      callIndex++;
      return {
        dice: roll.dice,
        total: roll.total,
        isSnakeEyes: roll.total === 2,
        isBoxcars: roll.total === 12,
      };
    };
  }

  describe('declareAttack()', () => {
    it('should declare an attack in weapon attack phase', () => {
      const session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      const updated = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );

      const attackEvent = updated.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      );

      expect(attackEvent).toBeDefined();
      expect((attackEvent!.payload as IAttackDeclaredPayload).attackerId).toBe(
        'unit-1',
      );
      expect((attackEvent!.payload as IAttackDeclaredPayload).targetId).toBe(
        'unit-2',
      );
      expect(
        (attackEvent!.payload as IAttackDeclaredPayload).weapons,
      ).toContain('weapon-1');
    });

    it('should calculate to-hit number correctly', () => {
      const session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      const updated = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );

      const attackEvent = updated.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      );

      expect((attackEvent!.payload as IAttackDeclaredPayload).toHitNumber).toBe(
        4,
      );
    });

    it('should throw if not in weapon attack phase', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      expect(() =>
        declareAttack(
          session,
          'unit-1',
          'unit-2',
          weapons,
          3,
          RangeBracket.Short,
          FiringArc.Front,
        ),
      ).toThrow('Not in weapon attack phase');
    });

    it('should set unit lock state to Planning', () => {
      const session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      const updated = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );

      expect(updated.currentState.units['unit-1'].lockState).toBe(
        LockState.Planning,
      );
    });
  });

  describe('lockAttack()', () => {
    it('should lock attack for a unit', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      expect(session.currentState.units['unit-1'].lockState).toBe(
        LockState.Locked,
      );
    });

    it('should create AttackLocked event', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      const lockEvent = session.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackLocked,
      );

      expect(lockEvent).toBeDefined();
      expect(lockEvent!.actorId).toBe('unit-1');
    });

    it('should throw if not in weapon attack phase', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);

      expect(() => lockAttack(session, 'unit-1')).toThrow(
        'Not in weapon attack phase',
      );
    });
  });

  describe('resolveAttack()', () => {
    it('should resolve a hit attack and apply damage', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      const mockRoller = createMockDiceRoller([
        { dice: [4, 4], total: 8 },
        { dice: [3, 4], total: 7 },
      ]);

      const attackEvent = session.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      )!;

      const resolved = resolveAttack(session, attackEvent, mockRoller);

      const resolvedEvent = resolved.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackResolved,
      );

      expect(resolvedEvent).toBeDefined();
      expect((resolvedEvent!.payload as IAttackResolvedPayload).hit).toBe(true);
      expect((resolvedEvent!.payload as IAttackResolvedPayload).damage).toBe(5);

      const damageEvent = resolved.events.find(
        (e: IGameEvent) => e.type === GameEventType.DamageApplied,
      );

      expect(damageEvent).toBeDefined();
      expect((damageEvent!.payload as IDamageAppliedPayload).unitId).toBe(
        'unit-2',
      );
      expect((damageEvent!.payload as IDamageAppliedPayload).damage).toBe(5);
    });

    it('should resolve a miss attack without applying damage', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      const mockRoller = createMockDiceRoller([{ dice: [1, 2], total: 3 }]);

      const attackEvent = session.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      )!;

      const resolved = resolveAttack(session, attackEvent, mockRoller);

      const resolvedEvent = resolved.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackResolved,
      );

      expect(resolvedEvent).toBeDefined();
      expect((resolvedEvent!.payload as IAttackResolvedPayload).hit).toBe(
        false,
      );

      const damageEvent = resolved.events.find(
        (e: IGameEvent) => e.type === GameEventType.DamageApplied,
      );

      expect(damageEvent).toBeUndefined();
    });

    it('should determine hit location when attack hits', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      const mockRoller = createMockDiceRoller([
        { dice: [4, 4], total: 8 },
        { dice: [3, 4], total: 7 },
      ]);

      const attackEvent = session.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      )!;

      const resolved = resolveAttack(session, attackEvent, mockRoller);

      const resolvedEvent = resolved.events.find(
        (e: IGameEvent) => e.type === GameEventType.AttackResolved,
      );

      expect((resolvedEvent!.payload as IAttackResolvedPayload).location).toBe(
        'center_torso',
      );
    });
  });

  describe('resolveAllAttacks()', () => {
    it('should resolve all declared attacks', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      session = declareAttack(
        session,
        'unit-2',
        'unit-1',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-2');

      const mockRoller = createMockDiceRoller([
        { dice: [3, 3], total: 6 },
        { dice: [3, 4], total: 7 },
        { dice: [2, 3], total: 5 },
        { dice: [3, 4], total: 7 },
      ]);

      const resolved = resolveAllAttacks(session, mockRoller);

      const resolvedEvents = resolved.events.filter(
        (e: IGameEvent) => e.type === GameEventType.AttackResolved,
      );

      expect(resolvedEvents.length).toBe(2);
    });

    it('should only resolve attacks from current turn', () => {
      let session = setupWeaponAttackPhase();

      const weapons = [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'unit-1',
        'unit-2',
        weapons,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'unit-1');

      const mockRoller = createMockDiceRoller([
        { dice: [4, 4], total: 8 },
        { dice: [3, 4], total: 7 },
      ]);

      const resolved = resolveAllAttacks(session, mockRoller);

      const resolvedEvents = resolved.events.filter(
        (e: IGameEvent) => e.type === GameEventType.AttackResolved,
      );

      expect(resolvedEvents.length).toBe(1);
    });
  });
});
