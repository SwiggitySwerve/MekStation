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

describe('IS torpedo names follow their Java identity (follow-up 92)', () => {
  const cases: Array<[string, string[]]> = [
    // weapons/srms/innerSphere/torpedo/ISSRT2.java
    ['srt-2-registry', ['IS SRT 2', 'ISSRT2']],
    // weapons/srms/innerSphere/torpedo/ISSRT4.java
    ['srt-4-registry', ['IS SRT 4', 'ISSRT4']],
    // weapons/srms/innerSphere/torpedo/ISSRT6.java
    ['srt-6-registry', ['IS SRT 6', 'ISSRT6']],
    // weapons/lrms/innerSphere/torpedo/ISLRT10.java
    ['lrt-10-registry', ['ISLRTorpedo10']],
    // weapons/lrms/innerSphere/torpedo/ISLRT15.java
    ['lrt-15-registry', ['ISLRTorpedo15']],
    // weapons/lrms/innerSphere/torpedo/ISLRT20.java
    ['lrt-20-registry', ['ISLRTorpedo20']],
    // weapons/lrms/innerSphere/torpedo/ISLRT5.java
    ['lrt-5-registry', ['ISLRTorpedo5']],
    // weapons/lrms/innerSphere/torpedo/oneShot/ISLRT10IOS.java
    ['lrt-10-i-os-registry', ['LRT 10 (I-OS)']],
    // weapons/lrms/innerSphere/torpedo/oneShot/ISLRT15IOS.java
    ['lrt-15-i-os-registry', ['LRT 15 (I-OS)']],
    // weapons/lrms/innerSphere/torpedo/oneShot/ISLRT20IOS.java
    ['lrt-20-i-os-registry', ['LRT 20 (I-OS)']],
    // weapons/lrms/innerSphere/torpedo/oneShot/ISLRT5IOS.java
    ['lrt-5-i-os-registry', ['LRT 5 (I-OS)']],
    // weapons/srms/innerSphere/torpedo/oneShot/ISSRT2IOS.java
    ['issrt2ios-registry', ['SRT 2 (I-OS)']],
    // weapons/srms/innerSphere/torpedo/oneShot/ISSRT4IOS.java
    ['issrt4ios-registry', ['SRT 4 (I-OS)']],
    // weapons/srms/innerSphere/torpedo/oneShot/ISSRT6IOS.java
    ['issrt6ios-registry', ['SRT 6 (I-OS)']],
  ];
  it.each(cases.flatMap(([id, names]) => names.map((name) => [name, id])))(
    '%s resolves to %s',
    (name, id) => {
      expect(getEquipmentEntry(name)?.id).toBe(id);
    },
  );

  // Java's CLAN lookup owns a different item for these names (follow-up 93).
  it.each([
    ['LRT 10', 'lrtorpedo10'],
    ['LRT 10 (OS)', 'lrtorpedo10-os'],
    ['LRT 15', 'lrtorpedo15'],
    ['LRT 15 (OS)', 'lrtorpedo15-os'],
    ['LRT 20', 'lrtorpedo20'],
    ['LRT 20 (OS)', 'lrtorpedo20-os'],
    ['LRT 5', 'lrtorpedo5'],
    ['LRT 5 (OS)', 'lrtorpedo5-os'],
    ['SRT 2', 'srt2'],
    ['SRT 4', 'srt4'],
    ['SRT 4 (OS)', 'srt4-os'],
    ['SRT 6', 'srt6'],
    ['SRT 6 (OS)', 'srt6-os'],
  ])('keeps tech-dependent %s on %s', (name, id) => {
    expect(getEquipmentEntry(name)?.id).toBe(id);
  });
});

describe('MRM names follow their Java identity (follow-up 92)', () => {
  const cases: Array<[string, string[]]> = [
    // weapons/unofficial/innerSphere/mrm/ISMRM1.java
    ['mrm-1-registry', ['IS MRM 1', 'ISMRM1', 'MRM 1']],
    // weapons/unofficial/innerSphere/mrm/ISMRM2.java
    ['mrm-2-registry', ['IS MRM 2', 'ISMRM2', 'MRM 2']],
    // weapons/unofficial/innerSphere/mrm/ISMRM3.java
    ['mrm-3-registry', ['IS MRM 3', 'ISMRM3', 'MRM 3']],
    // weapons/unofficial/innerSphere/mrm/ISMRM4.java
    ['mrm-4-registry', ['IS MRM 4', 'ISMRM4', 'MRM 4']],
    // weapons/unofficial/innerSphere/mrm/ISMRM5.java
    ['mrm-5-registry', ['IS MRM 5', 'ISMRM5', 'MRM 5']],
    // weapons/unofficial/innerSphere/mrm/oneShot/ISMRM1OS.java
    ['mrm-1-os-registry', ['MRM 1 (OS)']],
    // weapons/unofficial/innerSphere/mrm/oneShot/ISMRM2OS.java
    ['mrm-2-os-registry', ['MRM 2 (OS)']],
    // weapons/unofficial/innerSphere/mrm/oneShot/ISMRM3OS.java
    ['mrm-3-os-registry', ['MRM 3 (OS)']],
    // weapons/unofficial/innerSphere/mrm/oneShot/ISMRM4OS.java
    ['mrm-4-os-registry', ['MRM 4 (OS)']],
    // weapons/unofficial/innerSphere/mrm/oneShot/ISMRM5OS.java
    ['mrm-5-os-registry', ['MRM 5 (OS)']],
  ];
  it.each(cases.flatMap(([id, names]) => names.map((name) => [name, id])))(
    '%s resolves to %s',
    (name, id) => {
      expect(getEquipmentEntry(name)?.id).toBe(id);
    },
  );

  // Exact catalog ids win: mrm-1..5 are the MRM ammo records, although Java's
  // weapon lookup names MRM-1..5 match them case-insensitively.
  it.each([1, 2, 3, 4, 5])('keeps exact ammo id mrm-%d', (rack) => {
    expect(getEquipmentEntry(`mrm-${rack}`)?.id).toBe(`mrm-${rack}`);
    expect(getEquipmentEntry(`MRM-${rack}`)?.id).toBe(`mrm-${rack}`);
  });
});

describe('Narc one-shot names follow their Java identity (follow-up 92)', () => {
  const cases: Array<[string, string[]]> = [
    // weapons/other/innerSphere/ISNarcIOS.java
    ['isnarcbeacon-i-os-registry', ['Narc (I-OS)']],
    // weapons/other/innerSphere/ISNarcOS.java
    ['isnarcbeacon-os-registry', ['Narc (OS)']],
  ];
  it.each(cases.flatMap(([id, names]) => names.map((name) => [name, id])))(
    '%s resolves to %s',
    (name, id) => {
      expect(getEquipmentEntry(name)?.id).toBe(id);
    },
  );

  // Left for follow-up 93 (tech-aware routing): Java's CLAN lookup owns a
  // different item, or an MTF pairs the name with such a display name.
  it.each([
    ['Heavy Machine Gun Array', 'hmga'],
    ['Light Machine Gun Array', 'lmga'],
    ['Machine Gun Array', 'mga'],
    ['ISHMGA', 'hmga'],
    ['ISLMGA', 'lmga'],
    ['ISMGA', 'mga'],
  ])('keeps tech-dependent %s on %s', (name, id) => {
    expect(getEquipmentEntry(name)?.id).toBe(id);
  });
});

describe('One-shot launchers and one-off names follow their Java identity (follow-up 92)', () => {
  const cases: Array<[string, string[]]> = [
    // weapons/lrms/innerSphere/oneShot/ISLRM5IOS.java
    ['lrm-5-i-os-registry', ['LRM 5 (I-OS)']],
    // weapons/lrms/innerSphere/oneShot/ISLRM10IOS.java
    ['lrm-10-i-os-registry', ['LRM 10 (I-OS)']],
    // weapons/lrms/innerSphere/oneShot/ISLRM15IOS.java
    ['lrm-15-i-os-registry', ['LRM 15 (I-OS)']],
    // weapons/lrms/innerSphere/oneShot/ISLRM20IOS.java
    ['lrm-20-i-os-registry', ['LRM 20 (I-OS)']],
    // weapons/lrms/clan/oneShot/CLLRM2OS.java
    ['cllrm2os-registry', ['LRM 2 (OS)']],
    // weapons/lrms/clan/oneShot/CLLRM3OS.java
    ['cllrm3os-registry', ['LRM 3 (OS)']],
    // weapons/lrms/clan/oneShot/CLLRM4OS.java
    ['cllrm4os-registry', ['LRM 4 (OS)']],
    // weapons/lrms/clan/oneShot/CLLRM5OS.java
    ['cllrm5-os-registry', ['Clan LRM 5 (OS)']],
    // weapons/srms/clan/oneShot/CLSRM2OS.java
    ['clsrm2-os-registry', ['Clan SRM 2 (OS)']],
    // weapons/srms/clan/oneShot/CLSRM4OS.java
    ['clsrm4-os-registry', ['Clan SRM 4 (OS)']],
    // weapons/srms/clan/oneShot/CLSRM6OS.java
    ['clsrm6-os-registry', ['Clan SRM 6 (OS)']],
    // weapons/srms/clan/oneShot/CLSRM1OS.java
    ['clsrm1os-registry', ['SRM 1 (OS)']],
    // weapons/srms/clan/oneShot/CLSRM3OS.java
    ['clsrm3os-registry', ['SRM 3 (OS)']],
    // weapons/srms/clan/oneShot/CLSRM5OS.java
    ['clsrm5os-registry', ['SRM 5 (OS)']],
    // weapons/srms/innerSphere/oneShot/ISSRM6IOS.java
    ['issrm6ios-registry', ['SRM 6 (I-OS)']],
    // weapons/srms/innerSphere/streak/oneShot/ISStreakSRM2IOS.java
    ['isstreaksrm2ios-registry', ['Streak SRM 2 (I-OS)']],
    // weapons/srms/innerSphere/streak/oneShot/ISStreakSRM4IOS.java
    ['isstreaksrm4ios-registry', ['Streak SRM 4 (I-OS)']],
    // weapons/srms/innerSphere/streak/oneShot/ISStreakSRM6IOS.java
    ['isstreaksrm6ios-registry', ['Streak SRM 6 (I-OS)']],
    // weapons/c3/ISC3RemoteSensorLauncher.java
    ['isc3remotesensorlauncher-registry', ['ISC3RemoteSensorLauncher']],
  ];
  it.each(cases.flatMap(([id, names]) => names.map((name) => [name, id])))(
    '%s resolves to %s',
    (name, id) => {
      expect(getEquipmentEntry(name)?.id).toBe(id);
    },
  );

  // Java's only owner of this name is the infantry support MG (InfantrySupportMGLightWeapon),
  // which deals less runner damage than balightmg; left unrouted (follow-up 92 slice 5).
  it('keeps Machine Gun (Light) on its current record', () => {
    expect(getEquipmentEntry('Machine Gun (Light)')?.id).toBe('balightmg');
  });
});

describe('Clan BattleArmor one-shot names follow their Java identity (follow-up 92)', () => {
  // weapons/battleArmor/clan/lrm/CLBALRM5OS.java, srm/CLBASRM2OS.java, srm/CLBASRM3OS.java
  it.each([
    ['CLBALRM5 (OS)', 'clbalrm5-os-registry', 11],
    ['CLBALRM5OS', 'clbalrm5-os-registry', 11],
    ['CLBASRM2 (OS)', 'clbasrm2-os-registry', 4],
    ['CLBASRM2OS', 'clbasrm2-os-registry', 4],
    ['Clan BA OS SRM-2', 'clbasrm2-os-registry', 4],
    ['Clan BA SRM 2 (OS)', 'clbasrm2-os-registry', 4],
    ['CLBASRM3 (OS)', 'clbasrm3-os-registry', 6],
    ['CLBASRM3OS', 'clbasrm3-os-registry', 6],
    ['Clan BA SRM 3 (OS)', 'clbasrm3-os-registry', 6],
    ['Clan BA OS SRM-3', 'clbasrm3-os-registry', 6],
  ] as const)('%s resolves to %s (BV %d)', (name, id, bv) => {
    const entry = getEquipmentEntry(name);
    expect(entry?.id).toBe(id);
    expect(entry?.battleValue).toBe(bv);
  });

  // CLBASRM3 resolves to basrm3; Java BV 30 (CLBASRM3.java:66), not CLBASRM2's 21.
  it('values CLBASRM3 at its Java BV', () => {
    expect(getEquipmentEntry('CLBASRM3')?.id).toBe('basrm3');
    expect(getEquipmentEntry('CLBASRM3')?.battleValue).toBe(30);
  });
});
