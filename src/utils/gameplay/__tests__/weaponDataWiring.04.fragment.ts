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
  IAMSInterceptionPayload,
  IAmmoConsumedPayload,
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

// Seed ammo bins on the player unit so ammo-consuming weapon tests can fire.
// Per wire-ammo-consumption, firing an ammo weapon with no matching bin
// emits AttackInvalid and no AttackResolved.
const TEST_AMMO_BINS = [
  {
    binId: 'bin-ac20-1',
    weaponType: 'AC/20',
    location: 'rt',
    maxRounds: 40, // plenty for test flows
    damagePerRound: 20,
    isExplosive: true,
  },
  {
    binId: 'bin-ac10-1',
    weaponType: 'AC/10',
    location: 'rt',
    maxRounds: 40,
    damagePerRound: 10,
    isExplosive: true,
  },
  {
    binId: 'bin-ac-20-1',
    weaponType: 'AC-20',
    location: 'rt',
    maxRounds: 40,
    damagePerRound: 20,
    isExplosive: true,
  },
  {
    binId: 'bin-lrm10-1',
    weaponType: 'LRM-10',
    location: 'ct',
    maxRounds: 40,
    damagePerRound: 1,
    isExplosive: true,
  },
];

function createUnits(options?: {
  playerHeatSinks?: number;
  opponentHeatSinks?: number;
  opponentAmmoConstruction?: IGameUnit['ammoConstruction'];
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
      ammoConstruction: TEST_AMMO_BINS,
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
      ammoConstruction: options?.opponentAmmoConstruction,
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
 * Avoids head location (roll 12) so catalog damage assertions stay focused on weapon data rather than fatal head-destruction side effects.
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

      // Per `wire-heat-generation-and-effects` task 13.1: HeatGenerated
      // now emits per-source (movement/firing/engine_hit) — assert the
      // firing event carries the AC/20(7) + ML(3) = 10 sum. Movement
      // event fires separately with amount 1.
      const firingEvent = heatGenEvents.find(
        (e) => (e.payload as IHeatPayload).source === 'firing',
      );
      expect(firingEvent).toBeDefined();
      expect((firingEvent!.payload as IHeatPayload).amount).toBe(10);
      const movementEvent = heatGenEvents.find(
        (e) => (e.payload as IHeatPayload).source === 'movement',
      );
      expect(movementEvent).toBeDefined();
      expect((movementEvent!.payload as IHeatPayload).amount).toBe(1);
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
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');
      session = resolveAllAttacks(session);
      session = advancePhase(session); // → PhysicalAttack
      session = advancePhase(session); // → Heat

      session = resolveHeatPhase(session);

      // Per `wire-heat-generation-and-effects`: movement heat is no
      // longer double-counted by the heat phase (the reducer tallied
      // +1 at movement time; the heat phase now emits a log-only
      // `source: 'movement'` event with `newTotal` unchanged). Firing
      // heat (20) accumulates during heat phase. Total before
      // dissipation: 1 + 20 = 21. Dissipation: 15. Net: 21 - 15 = 6.
      const playerState = session.currentState.units['player-1'];
      expect(playerState.heat).toBe(6);
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
      );
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');
      session = resolveAllAttacks(session);
      session = advancePhase(session); // → PhysicalAttack
      session = advancePhase(session); // → Heat

      session = resolveHeatPhase(session);

      // Per `wire-heat-generation-and-effects`: movement heat is no
      // longer double-counted. Movement reducer applied 1. Heat phase
      // adds firing(20). Total before dissipation: 1 + 20 = 21.
      // Default dissipation: 10. Net: 21 - 10 = 11.
      const playerState = session.currentState.units['player-1'];
      expect(playerState.heat).toBe(11);
    });
  });
});
