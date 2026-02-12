/**
 * Weapon Data Wiring Integration Tests
 *
 * Verifies that real weapon data (damage, heat, ranges) flows from
 * attack declaration through resolution, replacing hardcoded values.
 */

import {
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  IGameConfig,
  IGameUnit,
  IGameSession,
  IHexCoordinate,
  RangeBracket,
  FiringArc,
  IWeaponAttack,
  GameEventType,
  IAttackResolvedPayload,
  IAttackDeclaredPayload,
  IHeatPayload,
} from '@/types/gameplay';

import {
  createGameSession,
  startGame,
  rollInitiative,
  advancePhase,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveAllAttacks,
  resolveHeatPhase,
  DiceRoller,
} from '../gameSession';
import { createDiceRoll } from '../hitLocation';

// =============================================================================
// Fixtures
// =============================================================================

function createConfig(): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function createUnits(options?: {
  playerHeatSinks?: number;
  opponentHeatSinks?: number;
}): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
      heatSinks: options?.playerHeatSinks,
    },
    {
      id: 'opponent-1',
      name: 'Hunchback',
      side: GameSide.Opponent,
      unitRef: 'hbk-4g',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
      heatSinks: options?.opponentHeatSinks,
    },
  ];
}

function advanceToWeaponAttack(session: IGameSession): IGameSession {
  let s = rollInitiative(session);
  s = advancePhase(s); // → Movement

  const from: IHexCoordinate = { q: 0, r: 0 };
  const to: IHexCoordinate = { q: 1, r: 0 };
  s = declareMovement(
    s,
    'player-1',
    from,
    to,
    Facing.North,
    MovementType.Walk,
    1,
    1,
  );
  s = lockMovement(s, 'player-1');
  s = declareMovement(
    s,
    'opponent-1',
    from,
    { q: -1, r: 0 },
    Facing.South,
    MovementType.Walk,
    1,
    1,
  );
  s = lockMovement(s, 'opponent-1');
  s = advancePhase(s); // → WeaponAttack

  return s;
}

/**
 * Creates a roller that alternates: odd calls hit (12), even calls target CT (7).
 * Avoids head location (roll 12) which triggers the 3-damage head-cap rule.
 */
function createAlwaysHitRoller(): DiceRoller {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount % 2 === 1) {
      return { dice: [6, 6], total: 12, isSnakeEyes: false, isBoxcars: true };
    }
    return { dice: [4, 3], total: 7, isSnakeEyes: false, isBoxcars: false };
  };
}

function alwaysHitRoller(): {
  dice: readonly number[];
  total: number;
  isSnakeEyes: boolean;
  isBoxcars: boolean;
} {
  return { dice: [4, 3], total: 7, isSnakeEyes: false, isBoxcars: false };
}

// =============================================================================
// Tests: Weapon damage flows from declaration to resolution
// =============================================================================

describe('Weapon Data Wiring', () => {
  describe('Task 1.1 / 1.10: resolveAttack uses real weapon damage', () => {
    it('AC/20 should deal 20 damage, not hardcoded 5', () => {
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const ac20Attack: IWeaponAttack[] = [
        {
          weaponId: 'ac-20-1',
          weaponName: 'AC/20',
          damage: 20,
          heat: 7,
          category: 'ballistic' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        ac20Attack,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');

      session = resolveAllAttacks(session, alwaysHitRoller);

      const resolvedEvents = session.events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      );
      expect(resolvedEvents.length).toBe(1);

      const payload = resolvedEvents[0].payload as IAttackResolvedPayload;
      expect(payload.hit).toBe(true);
      expect(payload.damage).toBe(20);
    });

    it('Medium Laser should deal 5 damage', () => {
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const mediumLaserAttack: IWeaponAttack[] = [
        {
          weaponId: 'medium-laser-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: 'energy' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        mediumLaserAttack,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');

      session = resolveAllAttacks(session, alwaysHitRoller);

      const resolvedEvents = session.events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      );
      const payload = resolvedEvents[0].payload as IAttackResolvedPayload;
      expect(payload.hit).toBe(true);
      expect(payload.damage).toBe(5);
    });

    it('PPC should deal 10 damage', () => {
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const ppcAttack: IWeaponAttack[] = [
        {
          weaponId: 'ppc-1',
          weaponName: 'PPC',
          damage: 10,
          heat: 10,
          category: 'energy' as never,
          minRange: 3,
          shortRange: 6,
          mediumRange: 12,
          longRange: 18,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        ppcAttack,
        6,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');

      session = resolveAllAttacks(session, alwaysHitRoller);

      const resolvedEvents = session.events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      );
      const payload = resolvedEvents[0].payload as IAttackResolvedPayload;
      expect(payload.damage).toBe(10);
    });

    it('multiple weapons should each deal their own damage', () => {
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const multiWeaponAttack: IWeaponAttack[] = [
        {
          weaponId: 'ac-20-1',
          weaponName: 'AC/20',
          damage: 20,
          heat: 7,
          category: 'ballistic' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
        {
          weaponId: 'medium-laser-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: 'energy' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        multiWeaponAttack,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');

      session = resolveAllAttacks(session, alwaysHitRoller);

      const resolvedEvents = session.events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      );
      expect(resolvedEvents.length).toBe(2);

      const damages = resolvedEvents.map(
        (e) => (e.payload as IAttackResolvedPayload).damage,
      );
      expect(damages).toContain(20);
      expect(damages).toContain(5);
    });
  });

  describe('Task 1.10: weaponAttacks data stored in attack event', () => {
    it('attack declared event carries weapon data', () => {
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const attacks: IWeaponAttack[] = [
        {
          weaponId: 'ac-20-1',
          weaponName: 'AC/20',
          damage: 20,
          heat: 7,
          category: 'ballistic' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        attacks,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );

      const declaredEvent = session.events.find(
        (e) => e.type === GameEventType.AttackDeclared,
      );
      expect(declaredEvent).toBeDefined();

      const payload = declaredEvent!.payload as IAttackDeclaredPayload;
      expect(payload.weaponAttacks).toBeDefined();
      expect(payload.weaponAttacks!.length).toBe(1);
      expect(payload.weaponAttacks![0].damage).toBe(20);
      expect(payload.weaponAttacks![0].heat).toBe(7);
      expect(payload.weaponAttacks![0].weaponName).toBe('AC/20');
    });
  });

  describe('Task 1.5: weapon heat flows through heat phase', () => {
    it('heat phase uses actual weapon heat values', () => {
      const units = createUnits({ playerHeatSinks: 15 });
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      // Declare attack with known heat values: AC/20 (7 heat) + ML (3 heat) = 10 heat
      const attacks: IWeaponAttack[] = [
        {
          weaponId: 'ac-20-1',
          weaponName: 'AC/20',
          damage: 20,
          heat: 7,
          category: 'ballistic' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
        {
          weaponId: 'medium-laser-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: 'energy' as never,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        attacks,
        3,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');
      session = resolveAllAttacks(session);
      session = advancePhase(session); // → PhysicalAttack
      session = advancePhase(session); // → Heat

      session = resolveHeatPhase(session);

      // Find heat generated event for player-1
      const heatGenEvents = session.events.filter(
        (e) =>
          e.type === GameEventType.HeatGenerated && e.actorId === 'player-1',
      );
      expect(heatGenEvents.length).toBeGreaterThan(0);

      const heatPayload = heatGenEvents[0].payload as IHeatPayload;
      // Movement heat(1) + weapon heat(7+3=10) = 11
      expect(heatPayload.amount).toBe(11);
    });
  });

  describe('Task 1.6: unit heat sinks used instead of hardcoded 10', () => {
    it('unit with 15 heat sinks dissipates 15 heat', () => {
      const units = createUnits({ playerHeatSinks: 15 });
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const attacks: IWeaponAttack[] = [
        {
          weaponId: 'ppc-1',
          weaponName: 'PPC',
          damage: 10,
          heat: 10,
          category: 'energy' as never,
          minRange: 3,
          shortRange: 6,
          mediumRange: 12,
          longRange: 18,
          isCluster: false,
        },
        {
          weaponId: 'ppc-2',
          weaponName: 'PPC',
          damage: 10,
          heat: 10,
          category: 'energy' as never,
          minRange: 3,
          shortRange: 6,
          mediumRange: 12,
          longRange: 18,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        attacks,
        6,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');
      session = resolveAllAttacks(session);
      session = advancePhase(session); // → PhysicalAttack
      session = advancePhase(session); // → Heat

      session = resolveHeatPhase(session);

      // Movement reducer already applied 1 heat. Heat phase adds movement(1)+weapons(20)=21.
      // Total before dissipation: 1 + 21 = 22. Dissipation: 15. Net: 22 - 15 = 7.
      const playerState = session.currentState.units['player-1'];
      expect(playerState.heat).toBe(7);
    });

    it('unit without heatSinks field defaults to 10', () => {
      // Default units have no heatSinks field → should default to 10
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      const attacks: IWeaponAttack[] = [
        {
          weaponId: 'ppc-1',
          weaponName: 'PPC',
          damage: 10,
          heat: 10,
          category: 'energy' as never,
          minRange: 3,
          shortRange: 6,
          mediumRange: 12,
          longRange: 18,
          isCluster: false,
        },
        {
          weaponId: 'ppc-2',
          weaponName: 'PPC',
          damage: 10,
          heat: 10,
          category: 'energy' as never,
          minRange: 3,
          shortRange: 6,
          mediumRange: 12,
          longRange: 18,
          isCluster: false,
        },
      ];

      session = declareAttack(
        session,
        'player-1',
        'opponent-1',
        attacks,
        6,
        RangeBracket.Short,
        FiringArc.Front,
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');
      session = resolveAllAttacks(session);
      session = advancePhase(session); // → PhysicalAttack
      session = advancePhase(session); // → Heat

      session = resolveHeatPhase(session);

      // Movement reducer applied 1 heat. Heat phase adds movement(1)+weapons(20)=21.
      // Total before dissipation: 1 + 21 = 22. Dissipation: 10 (default). Net: 22 - 10 = 12.
      const playerState = session.currentState.units['player-1'];
      expect(playerState.heat).toBe(12);
    });
  });

  describe('Task 1.9: injectable DiceRoller in hitLocation', () => {
    it('roll2d6 with custom roller produces deterministic results', () => {
      const { roll2d6, D6Roller } = require('../hitLocation');
      let callCount = 0;
      const fixedRoller = () => {
        callCount++;
        return callCount % 2 === 1 ? 3 : 4;
      };

      const result = roll2d6(fixedRoller);
      expect(result.total).toBe(7); // 3 + 4
      expect(result.dice).toEqual([3, 4]);
    });

    it('determineHitLocation with custom roller is deterministic', () => {
      const { determineHitLocation } = require('../hitLocation');
      const { FiringArc } = require('@/types/gameplay');

      // Fixed roller always returns 4 → 2d6 = 8 → front table = left_torso
      const fixedRoller = () => 4;
      const result = determineHitLocation(FiringArc.Front, fixedRoller);
      expect(result.location).toBe('left_torso');
      expect(result.roll.total).toBe(8);
    });
  });

  describe('backward compatibility: events without weaponAttacks', () => {
    it('resolveAttack falls back to damage=5 when weaponAttacks absent', () => {
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      // Manually create an attack event without weaponAttacks (legacy format)
      const { createAttackDeclaredEvent } = require('../gameEvents');
      const sequence = session.events.length;
      const event = createAttackDeclaredEvent(
        session.id,
        sequence,
        session.currentState.turn,
        'player-1',
        'opponent-1',
        ['old-weapon-1'],
        7,
        [],
        // no weaponAttacks parameter
      );

      const { resolveAttack } = require('../gameSession');
      const resolved = resolveAttack(session, event, alwaysHitRoller);

      const resolvedEvents = resolved.events.filter(
        (e: { type: string }) => e.type === GameEventType.AttackResolved,
      );
      expect(resolvedEvents.length).toBe(1);
      const payload = resolvedEvents[0].payload as IAttackResolvedPayload;
      expect(payload.damage).toBe(5); // fallback
    });
  });
});
