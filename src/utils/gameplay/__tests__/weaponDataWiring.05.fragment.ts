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

  describe('malformed events without weaponAttacks (wire-real-weapon-data)', () => {
    it('resolveAttack skips the weapon (no AttackResolved) when weaponAttacks is absent', () => {
      // Per wire-real-weapon-data: the silent `?? 5` damage fallback was a
      // rule-accuracy bug — every weapon with missing data used to fire as a
      // Medium Laser regardless of its actual stats. New behavior: log a
      // warning and skip the weapon so the issue is observable upstream.
      const { logger } = require('@/utils/logger');
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      const units = createUnits();
      let session = createGameSession(createConfig(), units);
      session = startGame(session, GameSide.Player);
      session = advanceToWeaponAttack(session);

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
      expect(resolvedEvents.length).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('weaponAttacks payload missing entry'),
      );
      warnSpy.mockRestore();
    });
  });
});
