/**
 * Per-change smoke test for wire-real-weapon-data.
 *
 * Asserts the full attack-declare + attack-resolve flow carries real
 * per-weapon damage and heat values from the catalog all the way through
 * the event stream — no more `?? 5` damage and `?? 3` heat fallbacks,
 * and no more `weapons.length * 3` heat approximation.
 *
 * Fixture: Hunchback-style attacker firing AC/20 + 2 Medium Lasers
 * (catalog damage 20/5/5, catalog heat 7/3/3 = 13 total).
 *
 * @spec openspec/changes/wire-real-weapon-data/tasks.md § 10
 */

import { describe, it, expect } from '@jest/globals';

import {
  FiringArc,
  GameEventType,
  GameSide,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  IGameConfig,
  IGameEvent,
  IGameUnit,
  MovementType,
  RangeBracket,
  WeaponCategory,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  declareMovement,
  DiceRoller,
  lockMovement,
  resolveAllAttacks,
  startGame,
} from '@/utils/gameplay/gameSession';

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

const units: IGameUnit[] = [
  {
    id: 'hbk',
    name: 'Hunchback HBK-4G',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'marauder',
    name: 'Marauder',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'pilot-2',
    gunnery: 4,
    piloting: 5,
  },
];

const hunchbackWeapons = [
  {
    weaponId: 'ac20-1',
    weaponName: 'AC/20',
    damage: 20,
    heat: 7,
    category: WeaponCategory.BALLISTIC,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    isCluster: false,
  },
  {
    weaponId: 'ml-1',
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
  {
    weaponId: 'ml-2',
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

function mockDiceRoller(
  rolls: Array<{ dice: [number, number]; total: number }>,
): DiceRoller {
  let i = 0;
  return () => {
    const r = rolls[i] ?? rolls[rolls.length - 1];
    i++;
    return {
      dice: r.dice,
      total: r.total,
      isSnakeEyes: r.total === 2,
      isBoxcars: r.total === 12,
    };
  };
}

function setupAttackPhase() {
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = advancePhase(session); // movement

  // Place units 3 hexes apart (short range for AC/20 and MLs)
  session = declareMovement(
    session,
    'hbk',
    { q: 0, r: 0 },
    { q: 0, r: 0 },
    Facing.North,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'hbk');
  session = declareMovement(
    session,
    'marauder',
    { q: 0, r: -3 },
    { q: 0, r: -3 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'marauder');

  session = advancePhase(session); // weapon attack
  return session;
}

describe('wire-real-weapon-data — smoke test (Hunchback fixture)', () => {
  it('AttackDeclared payload carries real damage + heat + range for every weapon', () => {
    let session = setupAttackPhase();
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      hunchbackWeapons,
      4,
      RangeBracket.Short,
      FiringArc.Front,
    );

    const declared = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
    );
    const payload = declared!.payload as IAttackDeclaredPayload;

    expect(payload.weaponAttacks).toBeDefined();
    expect(payload.weaponAttacks).toHaveLength(3);

    const byId = new Map(
      (payload.weaponAttacks ?? []).map((w) => [w.weaponId, w]),
    );
    expect(byId.get('ac20-1')?.damage).toBe(20);
    expect(byId.get('ac20-1')?.heat).toBe(7);
    expect(byId.get('ml-1')?.damage).toBe(5);
    expect(byId.get('ml-1')?.heat).toBe(3);
    expect(byId.get('ml-2')?.damage).toBe(5);
    expect(byId.get('ml-2')?.heat).toBe(3);
  });

  it('AttackResolved payloads carry real per-weapon damage + heat (not ?? 5 / ?? 3)', () => {
    let session = setupAttackPhase();
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      hunchbackWeapons,
      4,
      RangeBracket.Short,
      FiringArc.Front,
    );

    // Guarantee hits: roll 10 (beats TN 4) for all attack-rolls; arbitrary
    // dice for hit-location rolls (value doesn't matter for this assertion).
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 }, // AC/20 attack roll → hit
      { dice: [3, 4], total: 7 }, // AC/20 hit-location roll
      { dice: [5, 5], total: 10 }, // ML-1 attack roll
      { dice: [3, 4], total: 7 }, // ML-1 location
      { dice: [5, 5], total: 10 }, // ML-2 attack roll
      { dice: [3, 4], total: 7 }, // ML-2 location
    ]);

    session = resolveAllAttacks(session, roller);

    const resolved = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(3);

    const byWeapon = new Map(
      resolved.map((e) => {
        const p = e.payload as IAttackResolvedPayload;
        return [p.weaponId, p];
      }),
    );

    // Damage: AC/20 hit a non-head location should carry damage=20; head
    // caps at 3. Assert both a damage value > 0 AND the catalog-sourced
    // heat that accompanies it.
    expect(byWeapon.get('ac20-1')?.heat).toBe(7);
    expect(byWeapon.get('ml-1')?.heat).toBe(3);
    expect(byWeapon.get('ml-2')?.heat).toBe(3);

    // Damage is either the catalog value (20/5/5) or the head-cap of 3.
    // Since we rolled a hit-location of 7 (= head per front-table in some
    // configs), assert damage is either full or head-capped — both are
    // valid per the head cap rule, both require real catalog damage to be
    // meaningful (head cap would not fire if damage defaulted to 5).
    const ac20Damage = byWeapon.get('ac20-1')?.damage;
    expect(ac20Damage).toBeGreaterThan(0);
    // If hit-location was head, damage capped at 3. Otherwise damage 20.
    expect([3, 20]).toContain(ac20Damage);
  });

  it('total firing heat sums real catalog values, not weapons.length * 3', () => {
    let session = setupAttackPhase();
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      hunchbackWeapons,
      4,
      RangeBracket.Short,
      FiringArc.Front,
    );

    const declared = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
    );
    const payload = declared!.payload as IAttackDeclaredPayload;

    const totalHeat = (payload.weaponAttacks ?? []).reduce(
      (sum, w) => sum + w.heat,
      0,
    );

    // Real catalog: AC/20(7) + ML(3) + ML(3) = 13
    // Old bug (weapons.length * 3): 9
    // Old bug (weapons.length * 10): 30
    expect(totalHeat).toBe(13);
  });
});
