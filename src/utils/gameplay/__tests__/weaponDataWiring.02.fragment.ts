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
});
