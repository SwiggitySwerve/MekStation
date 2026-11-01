/**
 * Catalog missile launchers must hydrate to total damage = damage per missile x
 * rack, on both real routes (runner `toAIWeapon`, adapter `extractWeapons`),
 * straight from the catalog record. The catalog is the only owner of damage;
 * there is no parser-side derivation.
 *
 * 139 catalog launchers (151 before the native ProtoMek LRM identities landed)
 * used to carry a numeric `damage: 0` placeholder, no `ammoPerTon` and (28 LRMs
 * on this base) zero ranges, so they hydrated to no damage and could not fire.
 * The oracle here is independent of the production parser: rack from
 * the catalog display name, family from the catalog `subType`, damage per
 * missile from pinned MegaMek (48fcb2f64a1b3f2d575707ce5653dad64927b587,
 * megamek/common/weapons/):
 *   LRM (standard, Improved, Enhanced, Extended, Primitive, Streak, BA, OS, I-OS)
 *     1 - handlers/lrm/LRMHandler.java:489 falls to MissileWeaponHandler.java:318;
 *         lrm/StreakLRMHandler.java:73-81 returns 1; primitive/ISLRM10Primitive.java:106
 *         builds a plain LRMHandler.
 *   MRM (standard, BA, OS, I-OS)
 *     1 - handlers/mrm/MRMHandler.java:56 extends MissileWeaponHandler (:318).
 *   SRM (standard, Improved, Advanced, Primitive, BA, OS, I-OS)
 *     2 - handlers/srm/SRMHandler.java:78; AdvancedSRMHandler.java:48 extends it;
 *         primitive/ISSRM2Primitive.java builds an SRMHandler.
 *   Streak SRM (standard, prototype, OS, I-OS)
 *     2 - handlers/StreakHandler.java:80-89; handlers/prototype/PrototypeStreakHandler.java:49
 *         extends SRMHandler (handlers/srm/SRMHandler.java:78).
 *   ATM / iATM, standard ammunition
 *     2 - handlers/ATMHandler.java:87-88; handlers/CLIATMHandler.java:107-109.
 * Ammunition per ton and ranges come from the pinned runtime
 * (UnitHydrationWeapons.missileOracle.test-helpers.ts).
 */
import type { IWeapon } from '@/simulation/ai/types';

import { extractWeapons } from '@/engine/adapters/CompendiumAdapter.weapons';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import {
  buildWeaponLookupFromCatalogFiles,
  resolveCatalogDamage,
  toAIWeapon,
} from '../UnitHydration';
import { MISSILE_ORACLE } from './UnitHydrationWeapons.missileOracle.test-helpers';

interface ICatalogItem {
  readonly id: string;
  readonly name: string;
  readonly subType?: string;
  readonly category?: string;
  readonly damage: number | string;
}

const PER_MISSILE: Readonly<Record<string, number>> = {
  LRM: 1,
  MRM: 1,
  SRM: 2,
  'Streak SRM': 2,
  ATM: 2,
};

const lookup = buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);

function catalogItems(): ICatalogItem[] {
  const seen = new Set<string>();
  const items: ICatalogItem[] = [];
  for (const file of WEAPON_CATALOG_FILES) {
    for (const raw of file.items ?? []) {
      const item = raw as unknown as ICatalogItem;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/** LRM/SRM/MRM/ATM launchers (incl. Streak, iATM); MML and the LRT/SRT torpedoes are separate. */
function launchers(): Array<{ item: ICatalogItem; expected: number }> {
  const out: Array<{ item: ICatalogItem; expected: number }> = [];
  for (const item of catalogItems()) {
    const perMissile = PER_MISSILE[item.subType ?? ''];
    if (perMissile === undefined || item.category !== 'Missile') continue;
    if (/^(?:LRT|SRT)\b/.test(item.name)) continue;
    const rack = item.name.match(/(\d+)/);
    if (!rack) continue;
    out.push({ item, expected: perMissile * parseInt(rack[1], 10) });
  }
  return out;
}

function hydrate(id: string): IWeapon {
  const stats = lookup(id);
  if (!stats) throw new Error(`no catalog weapon ${id}`);
  return toAIWeapon(stats, 0);
}

describe('catalog missile launcher hydration', () => {
  const cases = launchers();

  it('covers the 190 LRM/SRM/MRM/ATM/Streak catalog launchers (194 with MML)', () => {
    expect(cases).toHaveLength(190);
  });

  it('has no launcher left at the placeholder damage 0', () => {
    const zero = cases.filter(({ item }) => item.damage === 0);
    expect(zero.map(({ item }) => item.id)).toEqual([]);
  });

  it.each(cases.map(({ item, expected }) => [item.id, expected] as const))(
    '%s hydrates to total damage %d on the runner route',
    (id, expected) => {
      expect(hydrate(id).damage).toBe(expected);
    },
  );

  it.each(cases.map(({ item, expected }) => [item.id, expected] as const))(
    '%s hydrates to total damage %d on the adapter route',
    (id, expected) => {
      const [weapon] = extractWeapons([{ equipmentId: id }], 'unit', {});
      expect(weapon.damage).toBe(expected);
    },
  );

  it.each([
    ['streaksrm6', 12],
    ['streak-srm-6', 12],
    ['streaksrm6-os', 12],
    ['streaksrm6-ios', 12],
    ['streaksrm6prototype', 12],
    ['streaklrm10', 10],
    ['iosstreaklrm10', 10],
    ['osstreaklrm20', 20],
    ['enhanced-lrm-10', 10],
    ['improved-lrm-20', 20],
    ['extended-lrm-20', 20],
    ['primitive-prototype-lrm-15', 15],
    ['lrm16', 16],
    ['lrm10-ios', 10],
    ['balrm5-os', 5],
    ['iatm12', 24],
    ['iatm-12', 24],
    ['advancedsrm6', 12],
    ['improved-srm-6', 12],
    ['primitive-prototype-srm-4', 8],
    ['srm6-ios', 12],
    ['basrm6-os', 12],
    ['mrm-10-os', 10],
    ['mrm-40-i-os', 40],
    ['bamrm5', 5],
  ])('anchor: %s is %d total damage', (id, total) => {
    expect(hydrate(id).damage).toBe(total);
  });

  it('leaves non-launcher zero-damage catalog rows at 0', () => {
    for (const id of ['ams', 'clan-ams', 'narc', 'cruisemissile120']) {
      expect(hydrate(id).damage).toBe(0);
    }
  });

  it('leaves the LRT/SRT torpedoes (ids lrtorpedoN, srmt1os) unchanged', () => {
    expect(hydrate('lrtorpedo10').damage).toBe(0);
    expect(hydrate('srmt1os').damage).toBe(0);
  });

  it('keeps MML at the SRM figure per missile (mode question, not fixed here)', () => {
    expect(hydrate('mml-9').damage).toBe(18);
  });
});

describe('catalog missile launcher ammunition and ranges (pinned MegaMek runtime)', () => {
  const rows = Object.entries(MISSILE_ORACLE);

  // The ProtoMech SRM records already carry the right damage and ranges; they keep no
  // ammoPerTon (unknown capacity), which missileAmmoReadiness.test.ts uses as its fixture.
  it('has an oracle row for every launcher except the three ProtoMech SRM racks', () => {
    const covered = new Set(Object.keys(MISSILE_ORACLE));
    const missing = launchers()
      .map(({ item }) => item.id)
      .filter((id) => !covered.has(id));
    expect(missing.sort()).toEqual(['clan-srm-1', 'clan-srm-3', 'clan-srm-5']);
  });

  it.each(rows.map(([id, row]) => [id, row[0], row] as const))(
    '%s (%s) hydrates the MegaMek ammunition per ton and ranges',
    (id, _megamekName, [, ammoPerTon, minimum, short, medium, long]) => {
      const weapon = hydrate(id);
      expect(weapon.ammoPerTon).toBe(ammoPerTon ?? -1);
      expect([weapon.minRange, weapon.shortRange, weapon.mediumRange]).toEqual([
        minimum,
        short,
        medium,
      ]);
      expect(weapon.longRange).toBe(long);
    },
  );

  it('leaves no launcher with a zero long range', () => {
    const zero = launchers()
      .map(({ item }) => hydrate(item.id))
      .filter((weapon) => weapon.longRange === 0);
    expect(zero.map((weapon) => weapon.id)).toEqual([]);
  });
});

describe('resolveCatalogDamage', () => {
  it('passes a non-zero number through and reads "N/missile" strings as before', () => {
    expect(resolveCatalogDamage(7, 'ac-5')).toBe(7);
    expect(resolveCatalogDamage('2/missile', 'srm-6')).toBe(12);
    expect(resolveCatalogDamage('1-2/missile', 'mml-5')).toBe(10);
  });

  it('does not derive a launcher total: a zero number stays zero (the catalog owns damage)', () => {
    expect(resolveCatalogDamage(0, 'streaksrm6-os')).toBe(0);
    expect(resolveCatalogDamage(0, 'ams')).toBe(0);
  });
});
