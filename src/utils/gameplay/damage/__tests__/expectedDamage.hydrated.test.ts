/**
 * Damage previews for real hydrated missile launchers.
 *
 * Both hydration paths (runner `toAIWeapon`, adapter `extractWeapons`) put the
 * whole launcher's damage in `IWeapon.damage` (LRM 16 = 16, SRM 6 = 12). The
 * preview must therefore agree with the firing side: per-missile damage is
 * total / rack, and a Streak lock lands the whole total. The oracle below is
 * the firing side itself (`resolveSpecialProjectileHit` over every 2d6 roll),
 * so the previews are checked against what a real shot deals, not against the
 * preview formulas.
 *
 * Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
 * `Compute.calculateClusterHitTableAmount`, `MissileWeaponHandler.calcDamagePerHit`
 * (1 per LRM/MRM missile), `SRMHandler.calcDamagePerHit` (2), `StreakHandler.calcHits`
 * (whole rack on a lock).
 */
import type { IWeapon } from '@/simulation/ai/types';

import { createDemoWeapons } from '@/__fixtures__/gameplay/demoSession';
import { weaponStatusToPlanningWeapon } from '@/components/gameplay/pages/gameSession/GameSessionPage.weaponPlanning';
import { extractWeapons } from '@/engine/adapters/CompendiumAdapter.weapons';
import { resolveSpecialProjectileHit } from '@/simulation/runner/phases/weaponAttackFiringModeProjectiles';
import {
  buildWeaponLookupFromCatalogFiles,
  toAIWeapon,
} from '@/simulation/runner/UnitHydration';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import {
  damageForProjectiles,
  lookupClusterHits,
} from '@/utils/gameplay/clusterWeapons';

import {
  clusterHitStats,
  damageVariance,
  expectedDamage,
} from '../expectedDamage';

const lookup = buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);

// [catalog id, rack size, hydrated total damage, streak]
const LAUNCHERS: readonly (readonly [string, number, number, boolean])[] = [
  ...[5, 10, 15, 20].map((n) => [`lrm-${n}`, n, n, false] as const),
  ...[2, 4, 6].map((n) => [`srm-${n}`, n, 2 * n, false] as const),
  ...[10, 20, 30, 40].map((n) => [`mrm-${n}`, n, n, false] as const),
  ...[3, 6, 9, 12].map((n) => [`atm-${n}`, n, 2 * n, false] as const),
  ...[3, 5, 7, 9].map((n) => [`mml-${n}`, n, 2 * n, false] as const),
  ...[2, 4, 6].map((n) => [`streak-srm-${n}`, n, 2 * n, true] as const),
  ...[2, 4, 6].map((n) => [`clan-streak-srm-${n}`, n, 2 * n, true] as const),
];

// Native ProtoMek LRM racks. Their catalog entries still hydrate to damage 0 on
// this base, so they are hydrated through `toAIWeapon` with the catalog-shaped
// "1/missile" damage string the ProtoMek LRM data carries.
const PROTOMEK_LRM_RACKS = [
  1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19,
];

function hydrateProtoLrm(rack: number): IWeapon {
  const base = lookup('lrm-10');
  if (!base) throw new Error('lrm-10 missing from the weapon catalog');
  return toAIWeapon(
    { ...base, id: `lrm${rack}`, name: `LRM ${rack}`, damage: '1/missile' },
    0,
  );
}

/**
 * The runner adds MRM's -1 cluster column modifier to every roll
 * (`missileClusterModifier`), a situational-modifier concern the previews do
 * not model. MRM rows therefore use the pinned table without the modifier here,
 * and the gap against the runner is pinned in its own test below. For racks
 * above 20 (MRM 30/40) `lookupClusterHits` snaps to the 20 column, while the
 * pinned `Compute.clusterHitsTable` has its own 30 and 40 rows; that gap, like
 * ATM's built-in +2 cluster modifier (`ATMHandler.java:236-250`), is open.
 */
function isMrm(weapon: IWeapon): boolean {
  return /mrm/i.test(weapon.id);
}

/** Damage and landed missiles a real shot yields per 2d6 roll, via the firing side. */
function firedByRoll(weapon: IWeapon): { damage: number; hits: number }[] {
  const out: { damage: number; hits: number }[] = [];
  const rack = Number(
    /(\d+)(?!.*\d)/.exec(weapon.id.replace(/-\d+$/, ''))?.[1],
  );
  for (let roll = 2; roll <= 12; roll++) {
    if (isMrm(weapon)) {
      const hits = lookupClusterHits(roll, rack);
      out.push({
        damage: damageForProjectiles(weapon.damage, rack, hits),
        hits,
      });
      continue;
    }
    const first = Math.min(6, roll - 1);
    const dice = [first, roll - first];
    let n = 0;
    const result = resolveSpecialProjectileHit({
      baseWeapon: weapon,
      shotWeapon: weapon,
      selectedMode: undefined,
      d6Roller: () => dice[n++],
    });
    out.push({
      damage: result.weapon.damage,
      hits: result.projectileCount ?? 1,
    });
  }
  return out;
}

function firedStats(weapon: IWeapon, p: number): { mean: number; sd: number } {
  let mean = 0;
  let second = 0;
  firedByRoll(weapon).forEach(({ damage }, index) => {
    const w = (6 - Math.abs(index + 2 - 7)) / 36;
    mean += w * damage;
    second += w * damage * damage;
  });
  const expected = p * mean;
  return { mean: expected, sd: Math.sqrt(p * second - expected * expected) };
}

const PROBABILITIES = [0.1, 0.5, 0.72, 0.97];
const OPTS = { remainingShots: 10 };

function hydratedCases(): readonly (readonly [string, IWeapon, boolean])[] {
  const rows: (readonly [string, IWeapon, boolean])[] = [];
  for (const [id, , total, streak] of LAUNCHERS) {
    const stats = lookup(id);
    if (!stats) throw new Error(`${id} missing from the weapon catalog`);
    const runner = toAIWeapon(stats, 0);
    const adapter = extractWeapons([{ equipmentId: id }], 'unit-1', {})[0];
    expect([id, runner.damage]).toEqual([id, total]);
    rows.push([`${id} (runner)`, runner, streak]);
    if (adapter) {
      expect([id, adapter.damage]).toEqual([id, total]);
      rows.push([`${id} (adapter)`, adapter, streak]);
    }
  }
  for (const rack of PROTOMEK_LRM_RACKS) {
    const weapon = hydrateProtoLrm(rack);
    expect([rack, weapon.damage]).toEqual([rack, rack]);
    rows.push([`ProtoMek LRM ${rack} (runner)`, weapon, false]);
  }
  return rows;
}

describe('expectedDamage / damageVariance on hydrated missile launchers', () => {
  const cases = hydratedCases();

  it('exercises both hydration paths for every catalog launcher', () => {
    expect(cases.filter(([name]) => name.endsWith('(adapter)')).length).toBe(
      LAUNCHERS.length,
    );
    expect(cases.length).toBe(LAUNCHERS.length * 2 + PROTOMEK_LRM_RACKS.length);
  });

  it.each(cases)('%s: expected damage equals the firing side', (_n, weapon) => {
    for (const p of PROBABILITIES) {
      const fired = firedStats(weapon, p);
      expect(expectedDamage(weapon, p, OPTS)).toBeCloseTo(fired.mean, 10);
    }
  });

  it.each(cases)(
    '%s: standard deviation equals the firing side',
    (_n, weapon) => {
      for (const p of PROBABILITIES) {
        const fired = firedStats(weapon, p);
        expect(damageVariance(weapon, p, OPTS)).toBeCloseTo(fired.sd, 10);
      }
    },
  );

  it.each(cases)(
    '%s: cluster hit stats equal the missiles that land',
    (_n, weapon) => {
      let mean = 0;
      let second = 0;
      firedByRoll(weapon).forEach(({ hits }, index) => {
        const w = (6 - Math.abs(index + 2 - 7)) / 36;
        mean += w * hits;
        second += w * hits * hits;
      });
      const stats = clusterHitStats(weapon);
      expect(stats.mean).toBeCloseTo(mean, 10);
      expect(stats.stddev).toBeCloseTo(
        Math.sqrt(Math.max(0, second - mean * mean)),
        10,
      );
    },
  );

  it('MRM previews omit the -1 column modifier the runner applies (known gap)', () => {
    const stats = lookup('mrm-10');
    if (!stats) throw new Error('mrm-10 missing');
    const mrm10 = toAIWeapon(stats, 0);
    let mean = 0;
    for (let roll = 2; roll <= 12; roll++) {
      const first = Math.min(6, roll - 1);
      const dice = [first, roll - first];
      let n = 0;
      const fired = resolveSpecialProjectileHit({
        baseWeapon: mrm10,
        shotWeapon: mrm10,
        selectedMode: undefined,
        d6Roller: () => dice[n++],
      });
      mean += ((6 - Math.abs(roll - 7)) / 36) * fired.weapon.damage;
    }
    // Runner: 5.6667 damage per landed attack; preview: 6.3056 (pinned table).
    expect(0.5 * mean).toBeCloseTo(2.8333333333333335, 10);
    expect(expectedDamage(mrm10, 0.5, OPTS)).toBeCloseTo(
      3.1527777777777777,
      10,
    );
  });

  it('LRM 16 at p = 0.5 previews 5.2083, not 83.33 (ProtoMek probe case)', () => {
    const lrm16 = hydrateProtoLrm(16);
    expect(expectedDamage(lrm16, 0.5, OPTS)).toBeCloseTo(5.208333333333334, 10);
    expect(damageVariance(lrm16, 0.5, OPTS)).toBeCloseTo(5.552620752601623, 10);
  });

  it('LRM 20 hydrated from the catalog previews the pinned-table mean', () => {
    const stats = lookup('lrm-20');
    if (!stats) throw new Error('lrm-20 missing');
    const lrm20 = toAIWeapon(stats, 0);
    // E[hits] for the rack-20 column = 457/36 under 2d6.
    expect(expectedDamage(lrm20, 0.5, OPTS)).toBeCloseTo((0.5 * 457) / 36, 10);
  });

  it('Streak SRM 6 previews p x total and sqrt(p(1-p)) x total', () => {
    const stats = lookup('streak-srm-6');
    if (!stats) throw new Error('streak-srm-6 missing');
    const streak6 = toAIWeapon(stats, 0);
    expect(streak6.damage).toBe(12);
    expect(expectedDamage(streak6, 0.5, OPTS)).toBeCloseTo(6, 10);
    expect(damageVariance(streak6, 0.5, OPTS)).toBeCloseTo(6, 10);
    expect(expectedDamage(streak6, 0.72, OPTS)).toBeCloseTo(0.72 * 12, 10);
    expect(damageVariance(streak6, 0.72, OPTS)).toBeCloseTo(
      Math.sqrt(0.72 * 0.28) * 12,
      10,
    );
  });
});

// UAC, RAC and LB-X are not missiles and keep the legacy preview (a known
// open item: no firing-mode input). These figures pin that path unchanged.
describe('non-missile cluster rows keep the legacy preview', () => {
  it.each([
    ['uac-5', 7.9167, 8.4881],
    ['rac-5', 7.9167, 8.4881],
    ['uac-20', 126.9444, 135.8578],
    ['lb-10-x-ac', 5.0, 5.0],
  ])('%s at p = 0.5', (id, mean, sd) => {
    const stats = lookup(id);
    if (!stats) throw new Error(`${id} missing from the catalog`);
    const weapon = toAIWeapon(stats, 0);
    expect(expectedDamage(weapon, 0.5)).toBeCloseTo(mean, 4);
    expect(damageVariance(weapon, 0.5)).toBeCloseTo(sd, 4);
  });
});

describe('demo route planning weapons (IWeaponStatus -> IWeapon -> preview)', () => {
  // The demo fixture shows '1/missile' / '2/missile' text; the adapter must hand
  // the preview the launcher total, as hydration does.
  function demoPlanningWeapon(name: string): IWeapon {
    const status = createDemoWeapons()['unit-player-1'].find(
      (weapon) => weapon.name === name,
    );
    if (!status) throw new Error(`${name} missing from the demo weapons`);
    return weaponStatusToPlanningWeapon(status);
  }

  it.each([
    ['LRM 20', 20, 6.3472, 6.7929],
    ['SRM 6', 12, 4.0, 4.2557],
  ])('%s previews the launcher total at p = 0.5', (name, total, mean, sd) => {
    const weapon = demoPlanningWeapon(name);
    expect(expectedDamage(weapon, 0.5)).toBeCloseTo(mean, 4);
    expect(damageVariance(weapon, 0.5)).toBeCloseTo(sd, 4);
    expect(weapon.damage).toBe(total);
  });

  it('leaves flat-damage demo weapons unchanged', () => {
    expect(demoPlanningWeapon('AC/20').damage).toBe(20);
    expect(demoPlanningWeapon('Medium Laser').damage).toBe(5);
  });

  it.each([
    ['MML 9', '1-2/missile', 18],
    ['LRM 20', '1 / missile', 20],
    ['LRM 20', '20 clusters', 20],
  ])(
    '%s with %s matches hydration (resolveCatalogDamage)',
    (name, damage, total) => {
      const template = createDemoWeapons()['unit-player-1'][0];
      const weapon = weaponStatusToPlanningWeapon({
        ...template,
        id: 'weapon-9',
        name,
        damage,
      });
      expect(weapon.damage).toBe(total);
    },
  );
});
