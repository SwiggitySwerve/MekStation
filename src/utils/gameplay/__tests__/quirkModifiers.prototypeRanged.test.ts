import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  resolveCriticalHits,
  rollCriticalHits,
} from '../criticalHitResolution';
import { buildDefaultComponentDamageState } from '../gameSessionAttackResolutionHelpers';
import { hydrateGameSessionFromEvents } from '../gameSessionCore';
import { replayToSequence } from '../gameSessionReplay';
import {
  getPrototypeCriticalHitModifier,
  hasQuirk,
  QUIRK_CATALOG,
  UNIT_QUIRK_IDS,
} from '../quirkModifiers';
import {
  criticalEvents,
  prototypeManifest,
  prototypeSession,
  runnerPrototypeHit,
  sessionPrototypeHit,
  sourcePrototypeQuirks,
} from './quirkModifiers.prototypeRanged.fixtures';

// @spec openspec/changes/establish-all-unit-data-parity/specs/quirk-combat-integration/spec.md
// MegaMek48fcb2f64 TWGameManager.java:23257-23258,23290-23308.
describe('native Prototype BattleMech ranged critical determination', () => {
  it('registers the native id without aliases or duplicated penalties', () => {
    expect(UNIT_QUIRK_IDS.PROTOTYPE).toBe('prototype');
    expect(QUIRK_CATALOG.prototype).toMatchObject({
      pipelines: ['crit'],
      isPositive: false,
    });
    expect(hasQuirk(['prototype_extra'], 'prototype')).toBe(false);
    for (const quirks of [['prototype'], ['prototype', 'prototype']]) {
      expect(getPrototypeCriticalHitModifier(quirks)).toBe(2);
    }
    for (const quirks of [[], ['PROTOTYPE'], ['prototype_extra']]) {
      expect(getPrototypeCriticalHitModifier(quirks)).toBe(0);
    }
  });

  it.each([
    undefined,
    UnitType.BATTLEMECH,
    UnitType.OMNIMECH,
    UnitType.INDUSTRIALMECH,
  ])('accepts the existing Mech family contract %s', (unitType) => {
    expect(getPrototypeCriticalHitModifier(['prototype'], unitType)).toBe(2);
  });
  it.each([
    UnitType.VEHICLE,
    UnitType.AEROSPACE,
    UnitType.BATTLE_ARMOR,
    UnitType.PROTOMECH,
    UnitType.INFANTRY,
    'unknown',
  ])('does not expand into %s', (unitType) => {
    expect(getPrototypeCriticalHitModifier(['prototype'], unitType)).toBe(0);
  });

  it.each([
    [5, 0],
    [6, 1],
    [7, 1],
    [8, 2],
    [9, 2],
    [10, 3],
    [12, 3],
  ])(
    'adds +2 before the public torso ladder: %i -> %i criticals',
    (roll, count) => {
      let index = 0;
      const dice = [Math.floor(roll / 2), Math.ceil(roll / 2)];
      expect(
        rollCriticalHits(
          'center_torso',
          () => dice[index++],
          getPrototypeCriticalHitModifier(['prototype']),
        ).criticalHits,
      ).toBe(count);
    },
  );

  it('does not turn a forced single critical into a table roll', () => {
    for (const quirks of [[], ['prototype']]) {
      const roller = jest.fn(() => 1);
      const result = resolveCriticalHits(
        'target',
        'center_torso',
        prototypeManifest(),
        buildDefaultComponentDamageState(),
        roller,
        1,
        undefined,
        { criticalHitModifier: getPrototypeCriticalHitModifier(quirks) },
      );
      expect(result.hits).toHaveLength(1);
      expect(roller).toHaveBeenCalledTimes(2);
    }
  });

  it('uses the actual frozen Icarus source key through the hydration owner', () => {
    expect(sourcePrototypeQuirks).toContain('prototype');
    expect(
      criticalEvents(
        sessionPrototypeHit(prototypeSession(sourcePrototypeQuirks), 6).events,
      ),
    ).toHaveLength(1);
  });

  it.each([
    [5, 0],
    [6, 1],
    [7, 1],
    [8, 2],
    [9, 2],
    [10, 3],
  ])('session and runner apply the native ladder at %i', (roll, count) => {
    const session = prototypeSession(['prototype']);
    expect(
      criticalEvents(sessionPrototypeHit(session, roll).events),
    ).toHaveLength(count);
    expect(
      criticalEvents(runnerPrototypeHit(session, roll).events),
    ).toHaveLength(count);
  });

  it('retains the source quirk and actual critical events through serialized hydration and replayToSequence', () => {
    const session = prototypeSession(sourcePrototypeQuirks);
    const last = session.events.at(-1);
    if (!last) throw new Error('Expected session events');
    const hydrated = hydrateGameSessionFromEvents(
      session.id,
      JSON.parse(JSON.stringify(session.events)),
    );
    for (const candidate of [
      session,
      hydrated,
      { ...session, currentState: replayToSequence(session, last.sequence) },
    ]) {
      expect(candidate.currentState.units.target.unitQuirks).toContain(
        'prototype',
      );
      const result = sessionPrototypeHit(candidate, 6);
      const replayed = hydrateGameSessionFromEvents(
        result.id,
        JSON.parse(JSON.stringify(result.events)),
      );
      expect(criticalEvents(replayed.events)).toHaveLength(1);
      expect(replayed.currentState).toEqual(result.currentState);
    }
  });

  it.each([
    [6, 0],
    [8, 1],
    [10, 2],
  ])(
    'Low Profile glancing -2 cancels Prototype +2 at %i without undoing half damage',
    (roll, count) => {
      const session = prototypeSession(['prototype', 'low_profile']);
      const result = sessionPrototypeHit(session, roll, true);
      const runner = runnerPrototypeHit(session, roll, true);
      expect(criticalEvents(result.events)).toHaveLength(count);
      expect(criticalEvents(runner.events)).toHaveLength(count);
      expect(result.currentState.units.target.structure.center_torso).toBe(29);
      expect(runner.state.units.target.structure.center_torso).toBe(29);
    },
  );

  it('keeps armored TAC forced-single handling unchanged', () => {
    for (const quirks of [[], ['prototype']]) {
      const session = prototypeSession(quirks, { armor: 20 });
      expect(
        criticalEvents(sessionPrototypeHit(session, 2, false, true).events),
      ).toHaveLength(1);
      expect(
        criticalEvents(runnerPrototypeHit(session, 2, false, true).events),
      ).toHaveLength(1);
    }
  });

  it.each([2, 5, 6, 7, 8, 9, 10, 11, 12])(
    'preserves outputs without Prototype at %i, including an attacker-only quirk',
    (roll) => {
      const baseline = prototypeSession([]);
      const unrelated = prototypeSession([], { attackerQuirks: ['prototype'] });
      expect(
        criticalEvents(sessionPrototypeHit(baseline, roll).events).map(
          (event) => event.payload,
        ),
      ).toEqual(
        criticalEvents(sessionPrototypeHit(unrelated, roll).events).map(
          (event) => event.payload,
        ),
      );
      expect(
        criticalEvents(runnerPrototypeHit(baseline, roll).events).map(
          (event) => event.payload,
        ),
      ).toEqual(
        criticalEvents(runnerPrototypeHit(unrelated, roll).events).map(
          (event) => event.payload,
        ),
      );
    },
  );
});
