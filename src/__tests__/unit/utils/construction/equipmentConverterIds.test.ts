import {
  getEquipmentEntry,
  normalizeEquipmentId,
  resolveAmmoBV,
  resolveEquipmentBV,
} from '@/utils/construction/equipmentBV';

describe('converted vehicle and aerospace equipment identities', () => {
  it.each([
    ['is-ammo-srm-6', 'ammo-srm-6', 7],
    ['is-ammo-lrm-15', 'ammo-lrm-15', 17],
    ['is-ammo-ac-20', 'ac-20-ammo', 22],
    ['IS Ammo AC/20', 'ac-20-ammo', 22],
    ['ISLRM15 Ammo', 'ammo-lrm-15', 17],
    ['is-ultra-ac-20-ammo', 'uac-20-ammo', 35],
    ['isrotaryac5-ammo', 'rotaryac5', 31],
    ['is-gauss-ammo', 'gauss-ammo', 40],
    ['clan-gauss-ammo', 'gauss-ammo', 40],
    ['clplasmacannonammo', 'clan-plasma-cannon-ammo', 21],
    ['is-ammo-lrtorpedo-20', 'ammo-lrtorpedo-20', 23],
    ['clan-machine-gun-ammo-half', 'machine-gun-ammo-half', 0],
    ['ammo-mg-full-1', 'ammo-mg-full', 1],
    ['is-ammo-lrm-15-1', 'ammo-lrm-15', 17],
    ['is-ammo-mg-full', 'ammo-mg-full', 1],
    ['is-machine-gun-ammo-half', 'machine-gun-ammo-half', 0],
    ['is-light-machine-gun-ammo-full', 'light-machine-gun-ammo-full', 1],
    ['is-heavy-machine-gun-ammo-half', 'heavy-machine-gun-ammo-half', 0],
    ['is-ammo-ac-10-primitive', 'ammo-ac-10-primitive', 12],
    ['clarrowivammo', 'arrowivammo', 30],
    ['climpammosrm6', 'impammosrm6', 10],
  ])(
    'resolves ammunition %s without changing its variant',
    (id, canonical, bv) => {
      expect(normalizeEquipmentId(String(id))).toBe(canonical);
      expect(resolveAmmoBV(String(id))).toMatchObject({
        resolved: true,
        battleValue: bv,
      });
      expect(resolveEquipmentBV(String(id))).toMatchObject({
        resolved: true,
        battleValue: bv,
      });
    },
  );

  it.each([
    ['clermediumlaser:omni', 'clan-er-medium-laser'],
    ['ISERMediumLaser:OMNI', 'er-medium-laser'],
    ['is-ultra-ac-20-ammo:omni', 'uac-20-ammo'],
    ['clan-ammo-atm-12:omni', 'clan-ammo-atm-12'],
    ['clermediumpulselaser', 'clan-er-medium-pulse-laser'],
    ['machine-gunst', 'machine-gun'],
    ['r-isermediumlaser', 'er-medium-laser'],
    ['isarrowiv', 'arrow-iv-launcher'],
    ['clarrowiv', 'clan-arrow-iv-launcher'],
    ['is-mech-mortar-2', 'mech-mortar-2'],
    ['islongtomcannon', 'long-tom'],
    ['sv-chassis-mod-[tractor]', 'sv-chassis-mod-tractor'],
    ['rifle-cannon,-medium', 'rifle-cannon-medium'],
  ])('resolves internal name / mount spelling %s', (id, canonical) => {
    expect(normalizeEquipmentId(id)).toBe(canonical);
    expect(getEquipmentEntry(id)?.id).toBe(canonical);
  });

  it.each([
    ['is-mrm-20-ammo', 'mrm-20', 14],
    ['clan-streak-srm-6-ammo', 'clan-streak-srm-6', 15],
    ['clan-lb-10-x-ac-ammo', 'clan-lb-10-x-ac', 19],
  ])(
    'keeps ammo %s separate from the weapon sharing its catalog id',
    (id, canonical, bv) => {
      expect(getEquipmentEntry(String(id))).toMatchObject({
        id: canonical,
        battleValue: bv,
      });
      expect(resolveEquipmentBV(String(id)).battleValue).toBe(bv);
      expect(resolveAmmoBV(String(id))).toMatchObject({
        resolved: true,
        battleValue: bv,
      });
      expect(resolveEquipmentBV(String(canonical)).battleValue).toBeGreaterThan(
        Number(bv),
      );
    },
  );

  it.each([
    'clermediumlaserprototype',
    'clrocketlauncher15prototype',
    'is-ammo-lrm-15-artemis-capable',
    'is-ammo-srm-4-narc-capable',
    'clan-ammo-lrm-15',
    'is-streak-srm-6-ammo',
    'clan-ultra-ac-20-ammo:omni',
    'totally-unknown-ammo:omni',
  ])('does not substitute a different item for missing variant %s', (id) => {
    expect(getEquipmentEntry(id)).toBeUndefined();
    expect(resolveEquipmentBV(id).resolved).toBe(false);
  });
});
