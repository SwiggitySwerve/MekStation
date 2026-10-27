import assert from 'node:assert/strict';
import { test } from 'node:test';

import { matchSource } from './matching.mjs';
import { availabilityFor, parseSources } from './sources.mjs';

const constants = {
  'interfaces/ITechnology.java':
    'int DATE_PS = 1950; int DATE_ES = 2100; int DATE_NONE = -1;',
};

test('inherits temporal rules but keeps constructor identities local', () => {
  const records = parseSources({
    ...constants,
    'weapons/BaseWeapon.java': `class BaseWeapon { public BaseWeapon() {
      name = "Base Weapon";
      techAdvancement.setTechBase(TechBase.CLAN).setClanAdvancement(DATE_NONE, 3057, 3079, DATE_NONE, DATE_NONE);
    } }`,
    'weapons/ChildWeapon.java': `class ChildWeapon extends BaseWeapon { public ChildWeapon() {
      super(); name = "Child Weapon";
    } }`,
  });
  const child = records.find((record) => record.key === 'ChildWeapon');
  assert.deepEqual(child.names, ['Child Weapon']);
  assert.deepEqual(availabilityFor(child, { techBase: 'INNER_SPHERE' }), {
    techBase: 'CLAN',
    introductionYear: 3057,
    extinctionYear: undefined,
    reintroductionYear: undefined,
  });
});

test('specific advancement overrides inheritance and preserves no-date markers', () => {
  const records = parseSources({
    ...constants,
    'weapons/Base.java': `class Base { public Base() {
      name = "Base"; techAdvancement.setTechBase(TechBase.IS).setISAdvancement(2500, 2510, 2520, 2800, 3050);
    } }`,
    'weapons/Child.java': `class Child extends Base { public Child() {
      name = "Child"; techAdvancement.setISAdvancement(DATE_NONE, 3070, 3080, DATE_NONE, DATE_NONE);
    } }`,
  });
  assert.deepEqual(
    availabilityFor(
      records.find((record) => record.key === 'Child'),
      { techBase: 'INNER_SPHERE' },
    ),
    {
      techBase: 'INNER_SPHERE',
      introductionYear: 3070,
      extinctionYear: undefined,
      reintroductionYear: undefined,
    },
  );
});

test('shared technology selects the catalog projection and general setters override earlier branches', () => {
  const [record] = parseSources({
    ...constants,
    'equipment/MiscType.java': `class MiscType {
    public static MiscType createShared() {
      misc.name = "Shared"; misc.techAdvancement.setTechBase(TechBase.ALL)
        .setISAdvancement(2500, 2510, 2520, 2800, 3050)
        .setAdvancement(DATE_PS, DATE_ES, DATE_ES, DATE_NONE, DATE_NONE)
        .setClanAdvancement(2820, 2825, 2830, DATE_NONE, DATE_NONE);
      return misc;
    }
  }`,
  });
  assert.equal(
    availabilityFor(record, { techBase: 'INNER_SPHERE' }).introductionYear,
    2100,
  );
  assert.equal(
    availabilityFor(record, { techBase: 'INNER_SPHERE' }).extinctionYear,
    undefined,
  );
  assert.equal(
    availabilityFor(record, { techBase: 'CLAN' }).introductionYear,
    2825,
  );
});

test('uses common then prototype dates when production is absent and never guesses missing dates', () => {
  const [record] = parseSources({
    ...constants,
    'equipment/AmmoType.java': `class AmmoType {
    private static AmmoType createAmmo() {
      ammo.name = "Ammo"; ammo.techAdvancement.setTechBase(TechBase.IS)
        .setISAdvancement(DATE_NONE, DATE_NONE, 3060, DATE_NONE, DATE_NONE);
      return ammo;
    }
  }`,
  });
  assert.equal(
    availabilityFor(record, { techBase: 'INNER_SPHERE' }).introductionYear,
    3060,
  );
  assert.equal(
    availabilityFor(
      { ...record, advancements: { IS: [2559, null, null, 2567, null] } },
      {},
    ).introductionYear,
    2559,
  );
  assert.equal(
    availabilityFor(
      { ...record, advancements: { IS: [null, null, null] } },
      {},
    ),
    null,
  );
});

test('ignores commented source and reads munition advancement constants', () => {
  const records = parseSources({
    ...constants,
    'equipment/AmmoType.java': `class AmmoType {
    /* private static AmmoType createWrong() { ammo.name = "Wrong"; } */
    private static final MunitionMutator SWARM_MUNITION_MUTATOR = new MunitionMutator("Swarm",
      new TechAdvancement(TechBase.IS).setISAdvancement(2615, 2621, 3058, 2833, 3053));
  }`,
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].key, 'SWARM_MUNITION_MUTATOR');
  assert.equal(availabilityFor(records[0], {}).extinctionYear, 2833);
});

test('corrects Clan IDs despite imported Inner Sphere tech base and does not match by substring', () => {
  const records = ['IS', 'CLAN'].map((tech) => ({
    key: tech,
    kind: 'ammunition',
    tech,
    names: ['LB 2-X AC Ammo'],
    advancements: {
      [tech === 'IS' ? 'IS' : 'Clan']: [null, tech === 'IS' ? 3058 : 2826],
    },
  }));
  assert.equal(
    matchSource(
      {
        id: 'clan-lb-2-x-ac',
        name: 'LB 2-X AC Ammo',
        techBase: 'INNER_SPHERE',
      },
      'ammunition/autocannon.json',
      records,
    ).source.tech,
    'CLAN',
  );
  assert.equal(
    matchSource(
      { id: 'ac-15', name: 'AC/15 Ammo', techBase: 'INNER_SPHERE' },
      'ammunition/autocannon.json',
      records,
    ).reason,
    'unmatched',
  );
});

test('leaves ambiguous names unresolved and rejects unsupported source dates', () => {
  const records = ['One', 'Two'].map((key) => ({
    key,
    kind: 'weapon',
    tech: 'IS',
    names: ['Shared Name'],
  }));
  assert.equal(
    matchSource(
      { id: 'shared-name', name: 'Shared Name', techBase: 'INNER_SPHERE' },
      'weapons/energy-laser.json',
      records,
    ).reason,
    'ambiguous',
  );
  assert.throws(
    () =>
      parseSources({
        'weapons/Unsupported.java': `class Unsupported {
    public Unsupported() { name = "Unsupported"; techAdvancement.setISAdvancement(UNKNOWN_DATE); }
  }`,
      }),
    /Unsupported date/,
  );
});

test('shared-tech BattleMech weapons are not replaced by same-name battle armor variants', () => {
  const records = [
    {
      key: 'ISSRM2',
      kind: 'weapon',
      tech: 'ALL',
      names: ['SRM 2'],
      weight: 1,
      slots: 1,
    },
    {
      key: 'ISBASRM2',
      kind: 'weapon',
      tech: 'IS',
      names: ['SRM 2'],
      weight: 0.2,
      slots: 1,
    },
  ];
  const result = matchSource(
    {
      id: 'srm-2',
      name: 'SRM 2',
      techBase: 'INNER_SPHERE',
      weight: 1,
      criticalSlots: 1,
    },
    'weapons/missile-srm.json',
    records,
  );
  assert.equal(result.source.key, 'ISSRM2');
});
