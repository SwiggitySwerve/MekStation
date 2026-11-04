/**
 * Native names resolve to the catalog record of their Java identity
 * (follow-up 79, CAT-SWEEP ALIAS-MISMATCHES.md). Expected identity is the pinned
 * MegaMek 48fcb2f6 default lookup owner of each name.
 */
import { getEquipmentEntry } from '../equipmentBVResolver';

describe('native equipment names follow their Java identity', () => {
  it.each([
    // weapons/battleArmor/innerSphere/ISBAMGHeavy.java:55
    ['ISBAHeavyMG', 'isbaheavymachinegun-registry'],
    // weapons/srms/innerSphere/oneShot/ISSRM4OS.java:60
    ['ISSRM4OS', 'issrm4os-registry'],
    // weapons/srms/innerSphere/oneShot/ISSRM2IOS.java:61
    ['SRM 2 (I-OS)', 'issrm2ios-registry'],
    // weapons/srms/innerSphere/oneShot/ISSRM4IOS.java:61
    ['SRM 4 (I-OS)', 'issrm4ios-registry'],
  ])('%s resolves to %s', (name, id) => {
    expect(getEquipmentEntry(name)?.id).toBe(id);
  });

  it('keeps names outside the routes on their existing records', () => {
    expect(getEquipmentEntry('SRM 4')?.id).toBe('srm-4');
    expect(getEquipmentEntry('Clan SRM 4 (OS)')?.id).not.toBe(
      'issrm4os-registry',
    );
  });
});

describe('IS Streak SRM ammo follows its Java identity (follow-up 89)', () => {
  it.each([
    // equipment/AmmoType.java:10617, :10649, :10679 (IS items; same owner for every tech)
    ['IS Streak SRM 2 Ammo', 'is-streak-srm-2-ammo-registry'],
    ['IS Streak SRM 4 Ammo', 'is-streak-srm-4-ammo-registry'],
    ['IS Streak SRM 6 Ammo', 'is-streak-srm-6-ammo-registry'],
  ])('%s resolves to %s', (name, id) => {
    expect(getEquipmentEntry(name)?.id).toBe(id);
  });

  it('keeps the Clan Streak SRM ammo names on the Clan records', () => {
    expect(getEquipmentEntry('Clan Streak SRM 2 Ammo')?.id).toMatch(/^clan-/);
  });
});

describe('IS BattleArmor LRM/SRM names follow their Java identity (follow-up 92)', () => {
  const cases: [string, string[]][] = [
    // weapons/battleArmor/innerSphere/lrm/ISBALRM1.java
    ['isbalrm1-registry', ['IS BA LRM 1', 'ISBALRM1']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM1OS.java
    ['isbalrm1os-registry', ['IS BA LRM1 OS', 'ISBALRM1OS']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM2.java
    ['isbalrm2-registry', ['IS BA LRM 2', 'ISBALRM2']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM2OS.java
    ['isbalrm2os-registry', ['IS BA LRM2 OS', 'ISBALRM2OS']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM3.java
    ['isbalrm3-registry', ['IS BA LRM 3', 'IS BA LRM3', 'ISBALRM3']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM3OS.java
    ['isbalrm3os-registry', ['IS BA LRM3 OS', 'ISBALRM3OS']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM4.java
    ['isbalrm4-registry', ['IS BA LRM 4', 'ISBALRM4']],
    // weapons/battleArmor/innerSphere/lrm/ISBALRM4OS.java
    ['isbalrm4os-registry', ['IS BA LRM4 OS', 'ISBALRM4OS']],
    // weapons/battleArmor/innerSphere/srm/ISBASRM1.java
    ['isbasrm1-registry', ['IS BA SRM 1', 'ISBASRM1']],
    // weapons/battleArmor/innerSphere/srm/ISBASRM1OS.java
    ['isbasrm1os-registry', ['IS BA SRM1 OS', 'ISBASRM1OS']],
    // weapons/battleArmor/innerSphere/srm/ISBASRM3.java
    ['isbasrm3-registry', ['IS BA SRM 3', 'ISBASRM3']],
    // weapons/battleArmor/innerSphere/srm/ISBASRM5.java
    ['isbasrm5-registry', ['IS BA SRM 5', 'ISBASRM5']],
    // weapons/battleArmor/innerSphere/srm/ISBASRM5OS.java
    ['isbasrm5os-registry', ['IS BA SRM5 OS', 'ISBASRM5OS']],
  ];
  it.each(cases.flatMap(([id, names]) => names.map((name) => [name, id])))(
    '%s resolves to %s',
    (name, id) => {
      expect(getEquipmentEntry(name)?.id).toBe(id);
    },
  );
});
