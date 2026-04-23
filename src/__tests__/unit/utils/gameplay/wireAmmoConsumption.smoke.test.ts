/**
 * Per-change smoke test for wire-ammo-consumption.
 *
 * Asserts:
 * - Ammo-consuming weapons decrement their bin on every firing
 * - Firing with an empty bin emits `AttackInvalid { reason: 'OutOfAmmo' }`
 *   and NO `AttackResolved` / `AmmoConsumed` event
 * - Energy weapons never touch bins and emit no `AmmoConsumed`
 * - Session-start bin init from `IGameUnit.ammoConstruction` seeds state
 * - `AttackResolved.ammoBinId` carries the bin for ammo weapons, null for
 *   energy weapons
 *
 * @spec openspec/changes/wire-ammo-consumption/tasks.md § 8
 */

import { describe, it, expect } from '@jest/globals';

import {
  FiringArc,
  GameEventType,
  GameSide,
  IAttackInvalidPayload,
  IAttackResolvedPayload,
  IAmmoConsumedPayload,
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
  replayToSequence,
  resolveAllAttacks,
  resolveAttack,
  startGame,
} from '@/utils/gameplay/gameSession';

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 20,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

function hunchbackWithBins(rounds: number): IGameUnit {
  return {
    id: 'hbk',
    name: 'Hunchback HBK-4G',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ammoConstruction: [
      {
        binId: 'bin-ac10-1',
        weaponType: 'AC10',
        location: 'rt',
        maxRounds: rounds,
        damagePerRound: 10,
        isExplosive: true,
      },
    ],
  };
}

const target: IGameUnit = {
  id: 'marauder',
  name: 'Marauder',
  side: GameSide.Opponent,
  unitRef: 'mad-3r',
  pilotRef: 'pilot-2',
  gunnery: 4,
  piloting: 5,
};

const ac10 = {
  weaponId: 'ac10-1',
  weaponName: 'AC10',
  damage: 10,
  heat: 3,
  category: WeaponCategory.BALLISTIC,
  minRange: 0,
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  isCluster: false,
};

const mediumLaser = {
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
};

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

function setupAttackPhase(attacker: IGameUnit) {
  let session = createGameSession(config, [attacker, target]);
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session = declareMovement(
    session,
    attacker.id,
    { q: 0, r: 0 },
    { q: 0, r: 0 },
    Facing.North,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, attacker.id);
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
  session = advancePhase(session);
  return session;
}

describe('wire-ammo-consumption — smoke test', () => {
  it('seeds ammoState from IGameUnit.ammoConstruction at session start', () => {
    const session = createGameSession(config, [hunchbackWithBins(10), target]);
    const hbkState = session.currentState.units['hbk'];
    expect(hbkState.ammoState).toBeDefined();
    expect(hbkState.ammoState!['bin-ac10-1']).toEqual({
      binId: 'bin-ac10-1',
      weaponType: 'AC10',
      location: 'rt',
      remainingRounds: 10,
      maxRounds: 10,
      isExplosive: true,
    });
  });

  it('AC10 decrements bin on each firing and emits AmmoConsumed', () => {
    let session = setupAttackPhase(hunchbackWithBins(10));
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      [ac10],
      4,
      RangeBracket.Short,
    );

    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 }, // attack roll — hit
      { dice: [3, 4], total: 7 }, // hit-location
    ]);
    session = resolveAllAttacks(session, roller);

    const consumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    expect(consumed).toHaveLength(1);
    const payload = consumed[0].payload as IAmmoConsumedPayload;
    expect(payload.binId).toBe('bin-ac10-1');
    expect(payload.roundsRemaining).toBe(9);

    // Reducer applies the event → unit state reflects 9 rounds
    expect(
      session.currentState.units['hbk'].ammoState!['bin-ac10-1']
        .remainingRounds,
    ).toBe(9);
  });

  it('AttackResolved.ammoBinId carries the consumed bin id for ammo weapons', () => {
    let session = setupAttackPhase(hunchbackWithBins(10));
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      [ac10],
      4,
      RangeBracket.Short,
    );
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [3, 4], total: 7 },
    ]);
    session = resolveAllAttacks(session, roller);

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    const payload = resolved!.payload as IAttackResolvedPayload;
    expect(payload.ammoBinId).toBe('bin-ac10-1');
  });

  it('firing with empty bin emits AttackInvalid and NO AttackResolved', () => {
    let session = setupAttackPhase(hunchbackWithBins(0)); // zero rounds
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      [ac10],
      4,
      RangeBracket.Short,
    );
    session = resolveAllAttacks(session);

    const invalid = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toHaveLength(1);
    const payload = invalid[0].payload as IAttackInvalidPayload;
    expect(payload.reason).toBe('OutOfAmmo');
    expect(payload.weaponId).toBe('ac10-1');
    expect(payload.attackerId).toBe('hbk');

    const resolved = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(0);

    const consumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    expect(consumed).toHaveLength(0);
  });

  it('energy weapon never touches bin state and emits no AmmoConsumed', () => {
    let session = setupAttackPhase(hunchbackWithBins(10));
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      [mediumLaser],
      4,
      RangeBracket.Short,
    );
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [3, 4], total: 7 },
    ]);
    session = resolveAllAttacks(session, roller);

    const consumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    expect(consumed).toHaveLength(0);
    expect(
      session.currentState.units['hbk'].ammoState!['bin-ac10-1']
        .remainingRounds,
    ).toBe(10);

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    const payload = resolved!.payload as IAttackResolvedPayload;
    // Energy weapons carry null ammoBinId — the field is present but null
    // to distinguish from ammo weapons where it's a bin id.
    expect(payload.ammoBinId).toBeNull();
  });

  it('same-hex attack now emits AttackInvalid { SameHex } (retrofitted)', () => {
    // Attacker and target at same hex. Per wire-firing-arc-resolution the
    // attack was previously invalidated with a warning only; with
    // AttackInvalid now available the resolver emits a proper event.
    let session = createGameSession(config, [hunchbackWithBins(10), target]);
    session = startGame(session, GameSide.Player);
    session = advancePhase(session);
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
      { q: 0, r: 0 },
      { q: 0, r: 0 },
      Facing.South,
      MovementType.Stationary,
      0,
      0,
    );
    session = lockMovement(session, 'marauder');
    session = advancePhase(session);

    session = declareAttack(
      session,
      'hbk',
      'marauder',
      [mediumLaser],
      4,
      RangeBracket.Short,
    );
    session = resolveAllAttacks(session);

    const invalid = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toHaveLength(1);
    const payload = invalid[0].payload as IAttackInvalidPayload;
    expect(payload.reason).toBe('SameHex');

    const resolved = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(0);
  });

  // Per tasks.md § 8.3: precisely 10 `AmmoConsumed` events with
  // `roundsRemaining` walking 9..0. We drive `resolveAttack` directly
  // against a single synthetic AttackDeclared event per iteration so
  // each resolve consumes exactly one round (the looser variant above
  // relied on `resolveAllAttacks` re-processing every declared event
  // per call, which made the per-shot sequence non-observable).
  it('fires AC10 10 times — exactly 10 AmmoConsumed events with remainingRounds 9..0', () => {
    let session = setupAttackPhase(hunchbackWithBins(10));
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 }, // hit
      { dice: [3, 4], total: 7 }, // location
    ]);

    for (let shot = 0; shot < 10; shot++) {
      session = declareAttack(
        session,
        'hbk',
        'marauder',
        [ac10],
        4,
        RangeBracket.Short,
      );
      // Find the newest AttackDeclared and resolve only it.
      const decls = session.events.filter(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      );
      const latest = decls[decls.length - 1];
      session = resolveAttack(session, latest, roller);
    }

    const consumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    expect(consumed).toHaveLength(10);
    const remainingSeq = consumed.map(
      (e: IGameEvent) => (e.payload as IAmmoConsumedPayload).roundsRemaining,
    );
    expect(remainingSeq).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

    const bin = session.currentState.units['hbk'].ammoState!['bin-ac10-1'];
    expect(bin.remainingRounds).toBe(0);

    // § 8.4/8.5: 11th firing emits AttackInvalid { OutOfAmmo } and no
    // AttackResolved / no AmmoConsumed for this attempt.
    session = declareAttack(
      session,
      'hbk',
      'marauder',
      [ac10],
      4,
      RangeBracket.Short,
    );
    const decls2 = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
    );
    const eleventh = decls2[decls2.length - 1];
    const beforeResolved = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    ).length;
    session = resolveAttack(session, eleventh, roller);
    const afterConsumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    const afterResolved = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    const invalid = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackInvalid,
    );
    expect(afterConsumed).toHaveLength(10); // unchanged
    expect(afterResolved).toHaveLength(beforeResolved); // unchanged
    expect(
      invalid.some(
        (e: IGameEvent) =>
          (e.payload as IAttackInvalidPayload).reason === 'OutOfAmmo',
      ),
    ).toBe(true);
  });

  // Per tasks.md § 3.6: cluster weapons (LRM-20) decrement their bin
  // by exactly 1 salvo per firing, not by the missile count (20).
  // `consumeAmmo` is called once per weapon firing with a default
  // `rounds = 1`; the resolver invokes it identically for single-shot
  // and cluster weapons, so the bin moves by 1 per fire regardless of
  // cluster roll.
  it('LRM-20 decrements bin by 1 salvo per firing (not 20)', () => {
    const lrmLauncher: IGameUnit = {
      id: 'arc',
      name: 'Archer ARC-2R',
      side: GameSide.Player,
      unitRef: 'arc-2r',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
      ammoConstruction: [
        {
          binId: 'bin-lrm20-1',
          weaponType: 'LRM20',
          location: 'lt',
          maxRounds: 6, // canonical — 1 ton of LRM-20 = 6 salvos
          damagePerRound: 20,
          isExplosive: true,
        },
      ],
    };
    const lrm20 = {
      weaponId: 'lrm20-1',
      weaponName: 'LRM20',
      damage: 12,
      heat: 6,
      category: WeaponCategory.MISSILE,
      minRange: 6,
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
      isCluster: true,
    };

    let session = setupAttackPhase(lrmLauncher);
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [3, 4], total: 7 },
    ]);
    session = declareAttack(
      session,
      'arc',
      'marauder',
      [lrm20],
      4,
      RangeBracket.Medium,
    );
    const decls = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
    );
    session = resolveAttack(session, decls[decls.length - 1], roller);

    const consumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    expect(consumed).toHaveLength(1);
    const payload = consumed[0].payload as IAmmoConsumedPayload;
    expect(payload.roundsConsumed).toBe(1);
    expect(payload.roundsRemaining).toBe(5);
    expect(
      session.currentState.units['arc'].ammoState!['bin-lrm20-1']
        .remainingRounds,
    ).toBe(5);
  });

  // Per tasks.md § 7.1/7.2/7.3 + § 8.7: replaying the event stream
  // from session creation SHALL yield identical bin state at every
  // prefix. `applyAmmoConsumed` stores `payload.roundsRemaining`
  // (absolute post-state), so the reducer is inherently idempotent:
  // replaying the same sequence reconstructs the same state without
  // re-firing any validation path (§ 7.3 — the original
  // `AttackInvalid { OutOfAmmo }` is a historical record and is not
  // retried; its reducer effect is zero on ammo state).
  it('replay fidelity — every prefix of the event stream reconstructs identical bin state', () => {
    let session = setupAttackPhase(hunchbackWithBins(3));
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [3, 4], total: 7 },
    ]);

    // Fire 4 times: 3 consume, 4th invalidates (OutOfAmmo).
    for (let shot = 0; shot < 4; shot++) {
      session = declareAttack(
        session,
        'hbk',
        'marauder',
        [ac10],
        4,
        RangeBracket.Short,
      );
      const decls = session.events.filter(
        (e: IGameEvent) => e.type === GameEventType.AttackDeclared,
      );
      session = resolveAttack(session, decls[decls.length - 1], roller);
    }

    // Walk every sequence number and confirm the replayed state's bin
    // matches what the live session would have held at that prefix.
    // We compare against a running expected value: the bin starts at 3,
    // decrements by 1 after each AmmoConsumed event, and never changes
    // for any other event type (including AttackInvalid).
    let expectedRounds = 3;
    for (const event of session.events) {
      if (event.type === GameEventType.AmmoConsumed) {
        const p = event.payload as IAmmoConsumedPayload;
        expectedRounds = p.roundsRemaining;
      }
      const replayed = replayToSequence(session, event.sequence);
      const replayedBin = replayed.units['hbk']?.ammoState?.['bin-ac10-1'];
      expect(replayedBin?.remainingRounds).toBe(expectedRounds);
    }

    // Terminal state: 3 consumptions (2, 1, 0) + 1 invalid (no change).
    const consumed = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AmmoConsumed,
    );
    const invalid = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.AttackInvalid,
    );
    expect(consumed).toHaveLength(3);
    expect(
      invalid.some(
        (e: IGameEvent) =>
          (e.payload as IAttackInvalidPayload).reason === 'OutOfAmmo',
      ),
    ).toBe(true);
    expect(
      session.currentState.units['hbk'].ammoState!['bin-ac10-1']
        .remainingRounds,
    ).toBe(0);
  });
});
