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
  describe('selected AMS mount replay data', () => {
    const lrm10Attack: IWeaponAttack[] = [
      {
        weaponId: 'lrm-10-1',
        weaponName: 'LRM-10',
        damage: 10,
        heat: 4,
        category: 'missile' as never,
        minRange: 0,
        shortRange: 7,
        mediumRange: 14,
        longRange: 21,
        isCluster: false,
      },
    ];

    function declareSelectedAMSLRMAttack(
      session: IGameSession,
      selectedAMSWeaponId: string,
      includeMountSnapshot: boolean,
    ): IGameSession {
      return declareAttack(
        session,
        'player-1',
        'opponent-1',
        lrm10Attack,
        3,
        RangeBracket.Short,
        undefined,
        undefined,
        false,
        [],
        null,
        { 'lrm-10-1': selectedAMSWeaponId },
        includeMountSnapshot
          ? {
              'lrm-10-1': {
                weaponId: selectedAMSWeaponId,
                weaponName: 'Anti-Missile System',
                heat: 1,
                ammoWeaponType: 'ams',
              },
            }
          : undefined,
      );
    }

    it('resolveAttack consumes the replayed selected defender AMS mount', () => {
      const units = createUnits({
        opponentAmmoConstruction: [
          {
            binId: 'target-ams-bin',
            weaponType: 'ams',
            location: 'ct',
            maxRounds: 2,
            damagePerRound: 1,
            isExplosive: true,
          },
        ],
      });
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      session = declareSelectedAMSLRMAttack(session, 'ams-1', true);
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');

      const rolls = [
        createDiceRoll(6, 6), // attack hits
        createDiceRoll(6, 6), // LRM cluster roll before AMS
        createDiceRoll(4, 3), // hit location
      ];
      let rollIndex = 0;
      session = resolveAllAttacks(session, () => rolls[rollIndex++]);

      const amsInterception = session.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      );
      expect(amsInterception).toBeDefined();
      expect(amsInterception!.payload as IAMSInterceptionPayload).toMatchObject(
        {
          defenderId: 'opponent-1',
          attackerId: 'player-1',
          incomingWeaponId: 'lrm-10-1',
          amsWeaponId: 'ams-1',
          resolution: 'cluster-table',
          incomingProjectiles: 10,
          projectilesIntercepted: 4,
          projectilesRemaining: 6,
          ammoConsumed: 1,
          roll: [6, 6],
          clusterRoll: 12,
          clusterModifier: -4,
          modifiedClusterRoll: 8,
          ammoBinId: 'target-ams-bin',
          ammoRemaining: 1,
        },
      );

      const defenderAmmoEvents = session.events.filter(
        (event) =>
          event.type === GameEventType.AmmoConsumed &&
          (event.payload as IAmmoConsumedPayload).unitId === 'opponent-1',
      );
      expect(defenderAmmoEvents).toHaveLength(1);
      expect(
        (defenderAmmoEvents[0].payload as IAmmoConsumedPayload).weaponType,
      ).toBe('ams');
      expect(
        session.currentState.units['opponent-1'].ammoState?.['target-ams-bin']
          .remainingRounds,
      ).toBe(1);
      expect(
        session.currentState.units['opponent-1'].weaponsFiredThisTurn,
      ).toEqual(['ams-1']);

      const resolved = session.events.find(
        (event) => event.type === GameEventType.AttackResolved,
      );
      expect((resolved!.payload as IAttackResolvedPayload).damage).toBe(6);
    });

    it('invalid selected AMS id does not fall back to automatic AMS side effects', () => {
      const units = createUnits({
        opponentAmmoConstruction: [
          {
            binId: 'target-ams-bin',
            weaponType: 'ams',
            location: 'ct',
            maxRounds: 2,
            damagePerRound: 1,
            isExplosive: true,
          },
        ],
      });
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

      session = declareSelectedAMSLRMAttack(session, 'missing-ams', false);
      session = lockAttack(session, 'player-1');
      session = lockAttack(session, 'opponent-1');

      const rolls = [
        createDiceRoll(6, 6), // attack hits
        createDiceRoll(4, 3), // hit location; no AMS cluster roll consumed
      ];
      let rollIndex = 0;
      session = resolveAllAttacks(session, () => rolls[rollIndex++]);

      expect(
        session.events.some(
          (event) => event.type === GameEventType.AMSInterception,
        ),
      ).toBe(false);
      expect(
        session.events.some(
          (event) =>
            event.type === GameEventType.AmmoConsumed &&
            (event.payload as IAmmoConsumedPayload).unitId === 'opponent-1',
        ),
      ).toBe(false);
      expect(
        session.currentState.units['opponent-1'].ammoState?.['target-ams-bin']
          .remainingRounds,
      ).toBe(2);
      expect(
        session.currentState.units['opponent-1'].weaponsFiredThisTurn,
      ).toEqual([]);

      const resolved = session.events.find(
        (event) => event.type === GameEventType.AttackResolved,
      );
      expect((resolved!.payload as IAttackResolvedPayload).damage).toBe(10);
    });
  });
});
