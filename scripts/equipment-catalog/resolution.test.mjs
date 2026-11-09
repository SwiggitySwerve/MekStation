import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const option = (flag) => process.argv[process.argv.indexOf(flag) + 1];
// These identity corrections and the named residual are approved exceptions. All other
// previously resolved inputs, including consumer fallback results, are frozen.
export const APPROVED_JAVA_REROUTES = [
  // TEMPORARY C2-approved residual: loader ownTechSide loses the [IS] suffix.
  // Census: parity-2.1-b/b5/clan-caseii/implementation/cleared-conversion/
  // canonical-slotless-census.json: 0/9815 corpus paths, 0/9828 public JSON files.
  // PR-2, after C3 #3211, must delete this entry and make the case resolve caseii.
  {
    api: 'unitLoaderClan',
    name: 'CASE II [IS]',
    oldTarget: 'caseii',
    newTarget: 'clan-caseii',
    literalName: true,
    reason:
      'C2-approved known ownTechSide suffix residual; 0 affected corpus paths per canonical-slotless-census.json; remove in PR-2 after #3211',
  },
  // Pinned plain Clan CASE II; MiscType.java:4839-4845 at 48fcb2f64.
  ...[
    ['unitLoaderClan', 'CASE II'],
    ['unitLoaderClan', 'CASEII'],
    ['unitLoaderClan', 'caseii'],
    ['conversionClan', 'CASEII'],
    ['conversionClan', 'caseii'],
    ['unitLoaderIS', 'CLCASEII'],
    ['unitLoaderClan', 'CLCASEII'],
    ['unitLoaderMixed', 'CLCASEII'],
    ['normalizer', 'CLCASEII'],
    ['equipment', 'CLCASEII'],
    ['conversion', 'CLCASEII'],
    ['conversionIS', 'CLCASEII'],
    ['conversionClan', 'CLCASEII'],
    ['conversion', 'Clan CASE II'],
    ['conversionIS', 'Clan CASE II'],
    ['conversionClan', 'Clan CASE II'],
  ].map(([api, name]) => ({
    api,
    name,
    oldTarget: 'caseii',
    newTarget: 'clan-caseii',
    literalName: true,
    reason:
      'C2-approved Clan CASE II identity; pinned MiscType.java:4839-4845, 0.5 t versus ISCASEII 1.0 t at 4809-4815, MegaMek 48fcb2f64',
  })),
  ...['flamer-vehicle', 'flamer-vehiclest'].flatMap((name) =>
    ['flamer', 'clan-flamer'].map((oldTarget) => ({
      name,
      oldTarget,
      newTarget: 'vehicle-flamer',
      weapon: true,
      reason:
        'Opus G2-O1/G1-O2: ISVehicleFlamer.java:77 at pinned 48fcb2f64, separate BV-5 vehicle flamer',
    })),
  ),
  ...[
    ['MRM-1', 'mrm-1', null],
    ['MRM-2', 'mrm-2', null],
    ['MRM-3', 'mrm-3', null],
    ['MRM-4', 'mrm-4', null],
    ['MRM-5', 'mrm-5', null],
  ].flatMap(([name, oldTarget, newTarget]) =>
    ['unitLoaderAmmoIS', 'unitLoaderAmmoClan'].map((api) => ({
      api,
      name,
      oldTarget,
      newTarget,
      literalName: true,
      reason:
        'Opus G2-O5 exact Java source identity; ISMRM1..5.java:57-63 and AmmoType.java:15093-15236 at48fcb2f64',
    })),
  ),
  ...[
    ['Coolant Pod', 'coolant-pod', 'coolant-pod-registry'],
    ['Coolant Pod:OMNI', 'coolant-pod', 'coolant-pod-registry'],
    ['MRM-1', 'mrm-1', 'mrm-1-registry'],
    ['MRM-2', 'mrm-2', 'mrm-2-registry'],
    ['MRM-3', 'mrm-3', 'mrm-3-registry'],
    ['MRM-4', 'mrm-4', 'mrm-4-registry'],
    ['MRM-5', 'mrm-5', 'mrm-5-registry'],
  ].flatMap(([name, oldTarget, newTarget]) =>
    ['unitLoaderIS', 'unitLoaderClan', 'unitLoaderMixed'].map((api) => ({
      api,
      name,
      oldTarget,
      newTarget,
      literalName: true,
      reason:
        'Opus G2-O5 exact Java source identity; ISMRM1..5.java:57-63 and AmmoType.java:15093-15236 at48fcb2f64',
    })),
  ),
  ...[
    ['CLRotaryAC10', 'rotaryac10'],
    ['CLRotaryAC20', 'rotaryac20'],
  ].map(([name, oldTarget]) => ({
    name,
    oldTarget,
    newTarget: null,
    weapon: true,
    reason:
      'Opus G2-O5 WeaponType aliases cannot use an AmmoType bin; pin48fcb2f64',
  })),
  ...[
    [
      '(R) IS Streak SRM 2 Ammo:50',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
      false,
    ],
    [
      '(R) IS Streak SRM 4 Ammo:75',
      'clan-streak-srm-4',
      'is-streak-srm-4-ammo-registry',
      false,
    ],
    [
      'IS LB 2-X AC Ammo:OMNI',
      'lb-2-x-ammo',
      'is-lb-2-x-ac-ammo-registry',
      false,
    ],
    [
      'IS LB 2-X Cluster Ammo:OMNI',
      'clan-lb-2-x-cluster',
      'is-lb-2-x-cluster-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 2 Ammo:100',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 2 Ammo:50',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 2 Ammo:OMNI',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 4 Ammo:25',
      'clan-streak-srm-4',
      'is-streak-srm-4-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 4 Ammo:OMNI',
      'clan-streak-srm-4',
      'is-streak-srm-4-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 6 Ammo:15',
      'clan-streak-srm-6',
      'is-streak-srm-6-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 6 Ammo:60',
      'clan-streak-srm-6',
      'is-streak-srm-6-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 6 Ammo:75',
      'clan-streak-srm-6',
      'is-streak-srm-6-ammo-registry',
      false,
    ],
    [
      'IS Streak SRM 6 Ammo:OMNI',
      'clan-streak-srm-6',
      'is-streak-srm-6-ammo-registry',
      false,
    ],
    ['ISBALRM2OS:Body', 'balrm2os', 'isbalrm2os-registry', true],
    ['ISBALRM3:Body', 'balrm3', 'isbalrm3-registry', true],
    ['ISBASRM1:RA', 'basrm1', 'isbasrm1-registry', true],
    ['ISBASRM1OS:LA', 'basrm1os', 'isbasrm1os-registry', true],
    ['ISBASRM1OS:RA', 'basrm1os', 'isbasrm1os-registry', true],
    ['ISBASRM3:Body', 'basrm3', 'isbasrm3-registry', true],
    ['ISBASRM5:Body', 'basrm5', 'isbasrm5-registry', true],
    ['ISBASRM5OS:Body', 'basrm5os', 'isbasrm5os-registry', true],
  ].map(([name, oldTarget, newTarget, weapon]) => ({
    name,
    oldTarget,
    newTarget,
    weapon,
    literalName: true,
    reason:
      'Opus G2-O4 exact qualified EquipmentType; pin48fcb2f64 AmmoType.java and native IS BA LRM/SRM registrations',
  })),

  ...['c3-remote-sensor-launcher'].map((name) => ({
    name,
    oldTarget: 'c3-master',
    newTarget: 'isc3remotesensorlauncher-registry',
    weapon: true,
    reason:
      'Opus G2-O2: pinned 48fcb2f64 ISC3RemoteSensorLauncher.java:69-80, separate BV-30 MissileWeapon',
  })),
  {
    name: 'IS LB 2-X AC Ammo',
    oldTarget: 'lb-2-x-ammo',
    newTarget: 'is-lb-2-x-ac-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB2XAmmo, BV 5; CAT-Q1 HANDBACK shared Clan records note; main #2600 native identity is retained as the before target',
  },
  {
    name: 'IS LB 5-X AC Ammo',
    oldTarget: 'lb-5-x-ammo',
    newTarget: 'is-lb-5-x-ac-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB5XAmmo, BV 10; CAT-Q1 HANDBACK shared Clan records note',
  },
  {
    name: 'IS LB 2-X Cluster Ammo',
    oldTarget: 'clan-lb-2-x-cluster',
    newTarget: 'is-lb-2-x-cluster-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB2XClusterAmmo, BV 5; CAT-Q1 HANDBACK shared Clan records note',
  },
  {
    name: 'IS LB 5-X Cluster Ammo',
    oldTarget: 'clan-lb-5-x-cluster',
    newTarget: 'is-lb-5-x-cluster-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB5XClusterAmmo, BV 10; CAT-Q1 HANDBACK shared Clan records note',
  },
  {
    name: 'Sniper',
    oldTarget: 'sniper-cannon',
    newTarget: 'issniper-registry',
    reason:
      'L-EQ3/java-registry.json[ISSniper] at pinned 48fcb2f6; weapons/artillery/Sniper.java, BV 85; CAT-Q1 HANDBACK Helepolis/Orion note',
    weapon: true,
  },
  // Follow-up 79 alias identity fixes: each native name's Java default lookup
  // owner is the same for every tech (L-EQ3 java-registry.json.lookups.json).
  ...[
    [
      'ISBAHeavyMG',
      'baheavymg',
      'isbaheavymachinegun-registry',
      'weapons/battleArmor/innerSphere/ISBAMGHeavy.java:55',
    ],
    [
      'ISSRM4OS',
      'srm-4',
      'issrm4os-registry',
      'weapons/srms/innerSphere/oneShot/ISSRM4OS.java:60',
    ],
    [
      'SRM 2 (I-OS)',
      'srm2-ios',
      'issrm2ios-registry',
      'weapons/srms/innerSphere/oneShot/ISSRM2IOS.java:61',
    ],
    [
      'SRM 4 (I-OS)',
      'srm4-ios',
      'issrm4ios-registry',
      'weapons/srms/innerSphere/oneShot/ISSRM4IOS.java:61',
    ],
  ].map(([name, oldTarget, newTarget, source]) => ({
    name,
    oldTarget,
    newTarget,
    reason: `Follow-up 79; pinned 48fcb2f6 ${source}`,
    weapon: true,
  })),
  // EquipmentNameMapper's tech-tag form; Java's CLAN lookup is the same item.
  ...[
    ['SRM 2 (I-OS) (Clan)', 'srm2-ios', 'issrm2ios-registry'],
    ['SRM 4 (I-OS) (Clan)', 'srm4-ios', 'issrm4ios-registry'],
  ].map(([name, oldTarget, newTarget]) => ({
    name,
    oldTarget,
    newTarget,
    reason: 'Follow-up 79; mapper tag form of the route above',
    tagForm: true,
  })),
  // Follow-up 89: IS Streak SRM ammo resolved to the generic or Clan records.
  ...[
    [
      'IS Streak SRM 2 Ammo',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
      ':10617',
    ],
    [
      'IS Streak SRM 4 Ammo',
      'clan-streak-srm-4',
      'is-streak-srm-4-ammo-registry',
      ':10649',
    ],
    [
      'IS Streak SRM 6 Ammo',
      'clan-streak-srm-6',
      'is-streak-srm-6-ammo-registry',
      ':10679',
    ],
  ].map(([name, oldTarget, newTarget, line]) => ({
    name,
    oldTarget,
    newTarget,
    reason: `Follow-up 89; pinned 48fcb2f6 equipment/AmmoType.java${line}`,
  })),
  {
    name: 'IS Streak SRM 2 Ammo',
    // Numeric targets are typed `#<json>` since cc0397c9e.
    oldTarget: '#100',
    newTarget: '#50',
    reason:
      'Follow-up 89; printed shots per ton follow the IS record (AmmoType.java:10628 shots = 50)',
    tagForm: true,
  },
  // Follow-up 92 slice 1: IS BattleArmor LRM/SRM resolved to the generic BA records.
  ...[
    [
      'isbalrm1-registry',
      'balrm1',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM1.java:64',
      ['IS BA LRM 1', 'ISBALRM1'],
    ],
    [
      'isbalrm2-registry',
      'balrm2',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM2.java:64',
      ['IS BA LRM 2', 'ISBALRM2'],
    ],
    [
      'isbalrm3-registry',
      'balrm3',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM3.java:64',
      ['IS BA LRM 3', 'IS BA LRM3', 'ISBALRM3'],
    ],
    [
      'isbalrm4-registry',
      'balrm4',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM4.java:64',
      ['IS BA LRM 4', 'ISBALRM4'],
    ],
    [
      'isbalrm1os-registry',
      'balrm1os',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM1OS.java:64',
      ['IS BA LRM1 OS', 'ISBALRM1OS'],
    ],
    [
      'isbalrm2os-registry',
      'balrm2os',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM2OS.java:64',
      ['IS BA LRM2 OS', 'ISBALRM2OS'],
    ],
    [
      'isbalrm3os-registry',
      'balrm3os',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM3OS.java:64',
      ['IS BA LRM3 OS', 'ISBALRM3OS'],
    ],
    [
      'isbalrm4os-registry',
      'balrm4os',
      'weapons/battleArmor/innerSphere/lrm/ISBALRM4OS.java:64',
      ['IS BA LRM4 OS', 'ISBALRM4OS'],
    ],
    [
      'isbasrm1-registry',
      'basrm1',
      'weapons/battleArmor/innerSphere/srm/ISBASRM1.java:56',
      ['IS BA SRM 1', 'ISBASRM1'],
    ],
    [
      'isbasrm3-registry',
      'basrm3',
      'weapons/battleArmor/innerSphere/srm/ISBASRM3.java:56',
      ['IS BA SRM 3', 'ISBASRM3'],
    ],
    [
      'isbasrm5-registry',
      'basrm5',
      'weapons/battleArmor/innerSphere/srm/ISBASRM5.java:56',
      ['IS BA SRM 5', 'ISBASRM5'],
    ],
    [
      'isbasrm1os-registry',
      'basrm1os',
      'weapons/battleArmor/innerSphere/srm/ISBASRM1OS.java:56',
      ['IS BA SRM1 OS', 'ISBASRM1OS'],
    ],
    [
      'isbasrm5os-registry',
      'basrm5os',
      'weapons/battleArmor/innerSphere/srm/ISBASRM5OS.java:56',
      ['IS BA SRM5 OS', 'ISBASRM5OS'],
    ],
  ].flatMap(([newTarget, oldTarget, source, names]) =>
    names.map((name) => ({
      name,
      oldTarget,
      newTarget,
      reason: `Follow-up 92 slice 1; pinned 48fcb2f6 ${source}`,
      weapon: true,
    })),
  ),
  // Follow-up 92 slice 2: IS torpedo names resolved to the legacy torpedo records.
  ...[
    [
      'srt-2-registry',
      'srt2',
      'weapons/srms/innerSphere/torpedo/ISSRT2.java:56',
      ['IS SRT 2', 'ISSRT2'],
    ],
    [
      'srt-4-registry',
      'srt4',
      'weapons/srms/innerSphere/torpedo/ISSRT4.java:56',
      ['IS SRT 4', 'ISSRT4'],
    ],
    [
      'srt-6-registry',
      'srt6',
      'weapons/srms/innerSphere/torpedo/ISSRT6.java:56',
      ['IS SRT 6', 'ISSRT6'],
    ],
    [
      'lrt-10-registry',
      'lrtorpedo10',
      'weapons/lrms/innerSphere/torpedo/ISLRT10.java:57',
      ['ISLRTorpedo10'],
    ],
    [
      'lrt-15-registry',
      'lrtorpedo15',
      'weapons/lrms/innerSphere/torpedo/ISLRT15.java:57',
      ['ISLRTorpedo15'],
    ],
    [
      'lrt-20-registry',
      'lrtorpedo20',
      'weapons/lrms/innerSphere/torpedo/ISLRT20.java:57',
      ['ISLRTorpedo20'],
    ],
    [
      'lrt-5-registry',
      'lrtorpedo5',
      'weapons/lrms/innerSphere/torpedo/ISLRT5.java:57',
      ['ISLRTorpedo5'],
    ],
    [
      'lrt-10-i-os-registry',
      'lrtorpedo10-ios',
      'weapons/lrms/innerSphere/torpedo/oneShot/ISLRT10IOS.java:57',
      ['LRT 10 (I-OS)'],
    ],
    [
      'lrt-15-i-os-registry',
      'lrtorpedo15-ios',
      'weapons/lrms/innerSphere/torpedo/oneShot/ISLRT15IOS.java:57',
      ['LRT 15 (I-OS)'],
    ],
    [
      'lrt-20-i-os-registry',
      'lrtorpedo20-ios',
      'weapons/lrms/innerSphere/torpedo/oneShot/ISLRT20IOS.java:57',
      ['LRT 20 (I-OS)'],
    ],
    [
      'lrt-5-i-os-registry',
      'lrtorpedo5-ios',
      'weapons/lrms/innerSphere/torpedo/oneShot/ISLRT5IOS.java:57',
      ['LRT 5 (I-OS)'],
    ],
    [
      'issrt2ios-registry',
      'srt2-ios',
      'weapons/srms/innerSphere/torpedo/oneShot/ISSRT2IOS.java:57',
      ['SRT 2 (I-OS)'],
    ],
    [
      'issrt4ios-registry',
      'srt4-ios',
      'weapons/srms/innerSphere/torpedo/oneShot/ISSRT4IOS.java:57',
      ['SRT 4 (I-OS)'],
    ],
    [
      'issrt6ios-registry',
      'srt6-ios',
      'weapons/srms/innerSphere/torpedo/oneShot/ISSRT6IOS.java:57',
      ['SRT 6 (I-OS)'],
    ],
  ].flatMap(([newTarget, oldTarget, source, names]) =>
    names.map((name) => ({
      name,
      oldTarget,
      newTarget,
      reason: `Follow-up 92 slice 2; pinned 48fcb2f6 ${source}`,
      weapon: true,
    })),
  ),
  // EquipmentNameMapper's tech-tag form; Java's CLAN lookup is the same item.
  ...[
    ['LRT 10 (I-OS) (Clan)', 'lrtorpedo10-ios', 'lrt-10-i-os-registry'],
    ['LRT 15 (I-OS) (Clan)', 'lrtorpedo15-ios', 'lrt-15-i-os-registry'],
    ['LRT 20 (I-OS) (Clan)', 'lrtorpedo20-ios', 'lrt-20-i-os-registry'],
    ['LRT 5 (I-OS) (Clan)', 'lrtorpedo5-ios', 'lrt-5-i-os-registry'],
    ['SRT 2 (I-OS) (Clan)', 'srt2-ios', 'issrt2ios-registry'],
    ['SRT 4 (I-OS) (Clan)', 'srt4-ios', 'issrt4ios-registry'],
    ['SRT 6 (I-OS) (Clan)', 'srt6-ios', 'issrt6ios-registry'],
  ].map(([name, oldTarget, newTarget]) => ({
    name,
    oldTarget,
    newTarget,
    reason: 'Follow-up 92 slice 2; mapper tag form of the route above',
    tagForm: true,
  })),
  // Follow-up 92 slice 3: unofficial IS MRM names resolved to the BattleArmor MRM records.
  ...[
    [
      'mrm-1-registry',
      'bamrm1',
      'weapons/unofficial/innerSphere/mrm/ISMRM1.java:56',
      ['IS MRM 1', 'ISMRM1', 'MRM 1'],
    ],
    [
      'mrm-2-registry',
      'bamrm2',
      'weapons/unofficial/innerSphere/mrm/ISMRM2.java:56',
      ['IS MRM 2', 'ISMRM2', 'MRM 2'],
    ],
    [
      'mrm-3-registry',
      'bamrm3',
      'weapons/unofficial/innerSphere/mrm/ISMRM3.java:56',
      ['IS MRM 3', 'ISMRM3', 'MRM 3'],
    ],
    [
      'mrm-4-registry',
      'bamrm4',
      'weapons/unofficial/innerSphere/mrm/ISMRM4.java:56',
      ['IS MRM 4', 'ISMRM4', 'MRM 4'],
    ],
    [
      'mrm-5-registry',
      'bamrm5',
      'weapons/unofficial/innerSphere/mrm/ISMRM5.java:56',
      ['IS MRM 5', 'ISMRM5', 'MRM 5'],
    ],
    [
      'mrm-1-os-registry',
      'bamrm1os',
      'weapons/unofficial/innerSphere/mrm/oneShot/ISMRM1OS.java:56',
      ['MRM 1 (OS)'],
    ],
    [
      'mrm-2-os-registry',
      'bamrm2os',
      'weapons/unofficial/innerSphere/mrm/oneShot/ISMRM2OS.java:56',
      ['MRM 2 (OS)'],
    ],
    [
      'mrm-3-os-registry',
      'bamrm3os',
      'weapons/unofficial/innerSphere/mrm/oneShot/ISMRM3OS.java:56',
      ['MRM 3 (OS)'],
    ],
    [
      'mrm-4-os-registry',
      'bamrm4os',
      'weapons/unofficial/innerSphere/mrm/oneShot/ISMRM4OS.java:56',
      ['MRM 4 (OS)'],
    ],
    [
      'mrm-5-os-registry',
      'bamrm5os',
      'weapons/unofficial/innerSphere/mrm/oneShot/ISMRM5OS.java:56',
      ['MRM 5 (OS)'],
    ],
  ].flatMap(([newTarget, oldTarget, source, names]) =>
    names.map((name) => ({
      name,
      oldTarget,
      newTarget,
      reason: `Follow-up 92 slice 3; pinned 48fcb2f6 ${source}`,
      weapon: true,
    })),
  ),
  // Follow-up 92 slice 4: IS Narc one-shot names resolved to the generic Narc records.
  ...[
    [
      'isnarcbeacon-i-os-registry',
      'narcbeacon-i-os',
      'weapons/other/innerSphere/ISNarcIOS.java:57',
      ['Narc (I-OS)'],
    ],
    [
      'isnarcbeacon-os-registry',
      'narcbeacon-os',
      'weapons/other/innerSphere/ISNarcOS.java:57',
      ['Narc (OS)'],
    ],
  ].flatMap(([newTarget, oldTarget, source, names]) =>
    names.map((name) => ({
      name,
      oldTarget,
      newTarget,
      reason: `Follow-up 92 slice 4; pinned 48fcb2f6 ${source}`,
      weapon: true,
    })),
  ),
  // EquipmentNameMapper's tech-tag form; Java's CLAN lookup is the same item.
  ...[
    ['Narc (I-OS) (Clan)', 'narcbeacon-i-os', 'isnarcbeacon-i-os-registry'],
    ['Narc (OS) (Clan)', 'narcbeacon-os', 'isnarcbeacon-os-registry'],
  ].map(([name, oldTarget, newTarget]) => ({
    name,
    oldTarget,
    newTarget,
    reason: 'Follow-up 92 slice 4; mapper tag form of the route above',
    tagForm: true,
  })),
  // Follow-up 92 slice 5: one-shot launchers and one-off names resolved to stand-in records.
  ...[
    [
      'lrm-5-i-os-registry',
      'lrm5-ios',
      'weapons/lrms/innerSphere/oneShot/ISLRM5IOS.java:56',
      ['LRM 5 (I-OS)'],
    ],
    [
      'lrm-10-i-os-registry',
      'lrm10-ios',
      'weapons/lrms/innerSphere/oneShot/ISLRM10IOS.java:56',
      ['LRM 10 (I-OS)'],
    ],
    [
      'lrm-15-i-os-registry',
      'lrm15-ios',
      'weapons/lrms/innerSphere/oneShot/ISLRM15IOS.java:56',
      ['LRM 15 (I-OS)'],
    ],
    [
      'lrm-20-i-os-registry',
      'lrm20-ios',
      'weapons/lrms/innerSphere/oneShot/ISLRM20IOS.java:56',
      ['LRM 20 (I-OS)'],
    ],
    [
      'cllrm2os-registry',
      'balrm2os',
      'weapons/lrms/clan/oneShot/CLLRM2OS.java:57',
      ['LRM 2 (OS)'],
    ],
    [
      'cllrm3os-registry',
      'balrm3os',
      'weapons/lrms/clan/oneShot/CLLRM3OS.java:57',
      ['LRM 3 (OS)'],
    ],
    [
      'cllrm4os-registry',
      'balrm4os',
      'weapons/lrms/clan/oneShot/CLLRM4OS.java:57',
      ['LRM 4 (OS)'],
    ],
    [
      'cllrm5-os-registry',
      'balrm5-os',
      'weapons/lrms/clan/oneShot/CLLRM5OS.java:56',
      ['Clan LRM 5 (OS)'],
    ],
    [
      'clsrm2-os-registry',
      'basrm2-os',
      'weapons/srms/clan/oneShot/CLSRM2OS.java:63',
      ['Clan SRM 2 (OS)'],
    ],
    [
      'clsrm4-os-registry',
      'basrm4-os',
      'weapons/srms/clan/oneShot/CLSRM4OS.java:63',
      ['Clan SRM 4 (OS)'],
    ],
    [
      'clsrm6-os-registry',
      'basrm6-os',
      'weapons/srms/clan/oneShot/CLSRM6OS.java:63',
      ['Clan SRM 6 (OS)'],
    ],
    [
      'clsrm1os-registry',
      'basrm1os',
      'weapons/srms/clan/oneShot/CLSRM1OS.java:64',
      ['SRM 1 (OS)'],
    ],
    [
      'clsrm3os-registry',
      'basrm3-os',
      'weapons/srms/clan/oneShot/CLSRM3OS.java:64',
      ['SRM 3 (OS)'],
    ],
    [
      'clsrm5os-registry',
      'basrm5os',
      'weapons/srms/clan/oneShot/CLSRM5OS.java:64',
      ['SRM 5 (OS)'],
    ],
    [
      'issrm6ios-registry',
      'srm6-ios',
      'weapons/srms/innerSphere/oneShot/ISSRM6IOS.java:57',
      ['SRM 6 (I-OS)'],
    ],
    [
      'isstreaksrm2ios-registry',
      'streaksrm2-ios',
      'weapons/srms/innerSphere/streak/oneShot/ISStreakSRM2IOS.java:58',
      ['Streak SRM 2 (I-OS)'],
    ],
    [
      'isstreaksrm4ios-registry',
      'streaksrm4-ios',
      'weapons/srms/innerSphere/streak/oneShot/ISStreakSRM4IOS.java:57',
      ['Streak SRM 4 (I-OS)'],
    ],
    [
      'isstreaksrm6ios-registry',
      'streaksrm6-ios',
      'weapons/srms/innerSphere/streak/oneShot/ISStreakSRM6IOS.java:57',
      ['Streak SRM 6 (I-OS)'],
    ],
    [
      'isc3remotesensorlauncher-registry',
      'c3-master',
      'weapons/c3/ISC3RemoteSensorLauncher.java:70',
      ['ISC3RemoteSensorLauncher'],
    ],
  ].flatMap(([newTarget, oldTarget, source, names]) =>
    names.map((name) => ({
      name,
      oldTarget,
      newTarget,
      reason: `Follow-up 92 slice 5; pinned 48fcb2f6 ${source}`,
      weapon: true,
    })),
  ),
  // EquipmentNameMapper's tech-tag form; Java's CLAN lookup is the same item.
  ...[
    ['LRM 10 (I-OS) (Clan)', 'lrm10-ios', 'lrm-10-i-os-registry'],
    ['LRM 15 (I-OS) (Clan)', 'lrm15-ios', 'lrm-15-i-os-registry'],
    ['LRM 2 (OS) (Clan)', 'balrm2os', 'cllrm2os-registry'],
    ['LRM 20 (I-OS) (Clan)', 'lrm20-ios', 'lrm-20-i-os-registry'],
    ['LRM 3 (OS) (Clan)', 'balrm3os', 'cllrm3os-registry'],
    ['LRM 4 (OS) (Clan)', 'balrm4os', 'cllrm4os-registry'],
    ['LRM 5 (I-OS) (Clan)', 'lrm5-ios', 'lrm-5-i-os-registry'],
    ['SRM 1 (OS) (Clan)', 'basrm1os', 'clsrm1os-registry'],
    ['SRM 3 (OS) (Clan)', 'basrm3-os', 'clsrm3os-registry'],
    ['SRM 5 (OS) (Clan)', 'basrm5os', 'clsrm5os-registry'],
    ['SRM 6 (I-OS) (Clan)', 'srm6-ios', 'issrm6ios-registry'],
    [
      'Streak SRM 2 (I-OS) (Clan)',
      'streaksrm2-ios',
      'isstreaksrm2ios-registry',
    ],
    [
      'Streak SRM 4 (I-OS) (Clan)',
      'streaksrm4-ios',
      'isstreaksrm4ios-registry',
    ],
    [
      'Streak SRM 6 (I-OS) (Clan)',
      'streaksrm6-ios',
      'isstreaksrm6ios-registry',
    ],
  ].map(([name, oldTarget, newTarget]) => ({
    name,
    oldTarget,
    newTarget,
    reason: 'Follow-up 92 slice 5; mapper tag form of the route above',
    tagForm: true,
  })),
  // Follow-up 93: torpedo list ids and Java names, routed by the unit's tech base
  // (java-registry.json.lookups.json LRT/SRT: IS item vs CLLRTn/CLSRTn).
  ...[
    ['LRT 10', 'lrtorpedo10', 'lrt-10-registry'],
    ['LRT 15', 'lrtorpedo15', 'lrt-15-registry'],
    ['LRT 20', 'lrtorpedo20', 'lrt-20-registry'],
    ['LRT 5', 'lrtorpedo5', 'lrt-5-registry'],
    ['SRT 2', 'srt2', 'srt-2-registry'],
    ['SRT 4', 'srt4', 'srt-4-registry'],
    ['SRT 6', 'srt6', 'srt-6-registry'],
    ['lrt-10', 'clan-lrm-10', 'lrtorpedo10'],
    ['lrt-10', 'lrm-10', 'lrt-10-registry'],
    ['lrt-15', 'clan-lrm-15', 'lrtorpedo15'],
    ['lrt-15', 'lrm-15', 'lrt-15-registry'],
    ['lrt-20', 'clan-lrm-20', 'lrtorpedo20'],
    ['lrt-20', 'lrm-20', 'lrt-20-registry'],
    ['lrt-5', 'clan-lrm-5', 'lrtorpedo5'],
    ['lrt-5', 'lrm-5', 'lrt-5-registry'],
    ['srt-2', 'clan-srm-2', 'srt2'],
    ['srt-2', 'srm-2', 'srt-2-registry'],
    ['srt-4', 'clan-srm-4', 'srt4'],
    ['srt-4', 'srm-4', 'srt-4-registry'],
    ['srt-6', 'clan-srm-6', 'srt6'],
    ['srt-6', 'srm-6', 'srt-6-registry'],
  ].map(([name, oldTarget, newTarget]) => ({
    name,
    oldTarget,
    newTarget,
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93: one-shot list ids and Java names (SRM/Streak SRM n (OS)), routed by
  // the unit's tech base to the IS or Clan I-OS/OS item. A name with both targets
  // in the guard's inputs is approved per loader API.
  ...[
    ['SRM 2 (OS)', 'basrm2-os', 'issrm2os-registry', 'unitLoaderIS'],
    ['SRM 2 (OS)', 'basrm2-os', 'issrm2os-registry', 'unitLoaderMixed'],
    ['SRM 2 (OS)', 'basrm2-os', 'clsrm2-os-registry', 'unitLoaderClan'],
    ['SRM 4 (OS)', 'basrm4-os', 'issrm4os-registry', 'unitLoaderIS'],
    ['SRM 4 (OS)', 'basrm4-os', 'issrm4os-registry', 'unitLoaderMixed'],
    ['SRM 4 (OS)', 'basrm4-os', 'clsrm4-os-registry', 'unitLoaderClan'],
    ['SRM 6 (OS)', 'basrm6-os', 'issrm6os-registry', 'unitLoaderIS'],
    ['SRM 6 (OS)', 'basrm6-os', 'issrm6os-registry', 'unitLoaderMixed'],
    ['SRM 6 (OS)', 'basrm6-os', 'clsrm6-os-registry', 'unitLoaderClan'],
    [
      'Streak SRM 2 (OS)',
      'streaksrm2-os',
      'isstreaksrm2os-registry',
      'unitLoaderIS',
    ],
    [
      'Streak SRM 2 (OS)',
      'streaksrm2-os',
      'isstreaksrm2os-registry',
      'unitLoaderMixed',
    ],
    [
      'Streak SRM 2 (OS)',
      'streaksrm2-os',
      'clstreaksrm2-os-registry',
      'unitLoaderClan',
    ],
    [
      'Streak SRM 4 (OS)',
      'streaksrm4-os',
      'isstreaksrm4os-registry',
      'unitLoaderIS',
    ],
    [
      'Streak SRM 4 (OS)',
      'streaksrm4-os',
      'isstreaksrm4os-registry',
      'unitLoaderMixed',
    ],
    [
      'Streak SRM 4 (OS)',
      'streaksrm4-os',
      'clstreaksrm4-os-registry',
      'unitLoaderClan',
    ],
    [
      'Streak SRM 6 (OS)',
      'streaksrm6-os',
      'isstreaksrm6os-registry',
      'unitLoaderIS',
    ],
    [
      'Streak SRM 6 (OS)',
      'streaksrm6-os',
      'isstreaksrm6os-registry',
      'unitLoaderMixed',
    ],
    [
      'Streak SRM 6 (OS)',
      'streaksrm6-os',
      'clstreaksrm6-os-registry',
      'unitLoaderClan',
    ],
    ['narc-i-os', 'clan-narc', 'clnarcbeacon-i-os-registry'],
    ['narc-i-os', 'narc', 'isnarcbeacon-i-os-registry'],
    ['srm-2-i-os', 'clan-srm-2', 'clsrm2-ios-registry'],
    ['srm-2-i-os', 'srm-2', 'issrm2ios-registry'],
    ['srm-2-os', 'clan-srm-2', 'clsrm2-os-registry'],
    ['srm-2-os', 'srm-2', 'issrm2os-registry'],
    ['srm-4-i-os', 'clan-srm-4', 'clsrm4-ios-registry'],
    ['srm-4-i-os', 'srm-4', 'issrm4ios-registry'],
    ['srm-6-i-os', 'clan-srm-6', 'clsrm6-ios-registry'],
    ['srm-6-i-os', 'srm-6', 'issrm6ios-registry'],
    ['srm-6-os', 'clan-srm-6', 'clsrm6-os-registry'],
    ['srm-6-os', 'srm-6', 'issrm6os-registry'],
    ['streak-srm-2-i-os', 'clan-streak-srm-2', 'clstreaksrm2-ios-registry'],
    ['streak-srm-2-i-os', 'streak-srm-2', 'isstreaksrm2ios-registry'],
    ['streak-srm-2-os', 'clan-streak-srm-2', 'clstreaksrm2-os-registry'],
    ['streak-srm-2-os', 'streak-srm-2', 'isstreaksrm2os-registry'],
    ['streak-srm-4-i-os', 'clan-streak-srm-4', 'clstreaksrm4-ios-registry'],
    ['streak-srm-4-i-os', 'streak-srm-4', 'isstreaksrm4ios-registry'],
    ['streak-srm-4-os', 'clan-streak-srm-4', 'clstreaksrm4-os-registry'],
    ['streak-srm-4-os', 'streak-srm-4', 'isstreaksrm4os-registry'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93: prototype list slugs routed to the Java prototype their crit token names.
  ...[
    ['primitive-prototype-ppc', 'ppc', 'primitive-prototype-ppc-registry'],
    [
      'prototype-er-medium-laser',
      'clan-er-medium-laser',
      'clermediumlaserprototype-registry',
    ],
    [
      'prototype-er-medium-laser',
      'er-medium-laser',
      'clermediumlaserprototype-registry',
    ],
    [
      'prototype-er-small-laser',
      'clan-er-small-laser',
      'clersmalllaserprototype-registry',
    ],
    [
      'prototype-er-small-laser',
      'er-small-laser',
      'clersmalllaserprototype-registry',
    ],
    [
      'prototype-rocket-launcher-20',
      'rl20',
      'rocketlauncher20prototype-registry',
    ],
    ['prototype-streak-srm-4', 'clan-streak-srm-4', 'streaksrm4prototype'],
    ['prototype-streak-srm-4', 'streak-srm-4', 'streaksrm4prototype'],
    ['prototype-streak-srm-6', 'clan-streak-srm-6', 'streaksrm6prototype'],
    ['prototype-streak-srm-6', 'streak-srm-6', 'streaksrm6prototype'],
    [
      'prototype-ultra-autocannon-10',
      'clan-uac-10',
      'clultraac10prototype-registry',
    ],
    [
      'prototype-ultra-autocannon-10',
      'uac-10',
      'clultraac10prototype-registry',
    ],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93: duplicate-record crit names routed to the official record; Clan HMG list id by tech.
  ...[
    ['CLNarcBeacon', 'narcbeacon', 'clan-narc'],
    ['CLiATM12', 'iatm12', 'iatm-12'],
    ['CLiATM3', 'iatm3', 'iatm-3'],
    ['CLiATM6', 'iatm6', 'iatm-6'],
    ['CLiATM9', 'iatm9', 'iatm-9'],
    ['Heavy Machine Gun', 'heavy-machine-gun', 'clheavymg-registry'],
    ['ISImprovedNarc', 'improvednarc', 'inarc'],
    ['clnarcbeacon', 'narcbeacon', 'clan-narc'],
    ['heavy-machine-gun', 'heavy-machine-gun', 'clheavymg-registry'],
    ['isimprovednarc', 'improvednarc', 'inarc'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93: MG arrays routed by tech (list id, display name and IS internal name together).
  ...[
    ['Heavy Machine Gun Array', 'hmga', 'ishmga-registry'],
    ['ISHMGA', 'hmga', 'ishmga-registry'],
    ['ISLMGA', 'lmga', 'islmga-registry'],
    ['ISMGA', 'mga', 'ismga-registry'],
    ['Light Machine Gun Array', 'lmga', 'islmga-registry'],
    ['Machine Gun Array', 'mga', 'ismga-registry'],
    ['heavy-machine-gun-array', 'hmga', 'ishmga-registry'],
    ['islmga', 'lmga', 'islmga-registry'],
    ['ismga', 'mga', 'ismga-registry'],
    ['light-machine-gun-array', 'lmga', 'islmga-registry'],
    ['machine-gun-array', 'mga', 'ismga-registry'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93 for VEH-WEIGHT: CL-prefixed native names keep their Clan item on IS and mixed units (pinned Java EquipmentType lookup is by name).
  ...[
    ['CLAMS', 'ams', 'clan-ams'],
    ['CLActiveProbe', 'active-probe', 'clan-active-probe'],
    ['CLActiveProbe(Clan)', 'active-probe', 'clan-active-probe'],
    ['CLActiveProbe:OMNI', 'active-probe', 'clan-active-probe'],
    ['CLAnti-MissileSystem(Clan)', 'ams', 'clan-ams'],
    ['CLAntiMissileSystem', 'ams', 'clan-ams'],
    ['CLAntiMissileSystem:OMNI', 'ams', 'clan-ams'],
    ['CLArrowIV', 'arrow-iv-launcher', 'clan-arrow-iv-launcher'],
    ['CLArrowIVSystem', 'arrow-iv-launcher', 'clan-arrow-iv-launcher'],
    ['CLERLargeLaser', 'er-large-laser', 'clan-er-large-laser'],
    ['CLERLargeLaser(Clan)', 'er-large-laser', 'clan-er-large-laser'],
    ['CLERLargeLaser:OMNI', 'er-large-laser', 'clan-er-large-laser'],
    ['CLERMediumLaser', 'er-medium-laser', 'clan-er-medium-laser'],
    ['CLERMediumLaser(Clan)', 'er-medium-laser', 'clan-er-medium-laser'],
    ['CLERMediumLaser:OMNI', 'er-medium-laser', 'clan-er-medium-laser'],
    ['CLERPPC', 'er-ppc', 'clan-er-ppc'],
    ['CLERPPC(Clan)', 'er-ppc', 'clan-er-ppc'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason:
      'Follow-up 93; a native name with its own Clan prefix keeps its Clan item (ownTechSide), unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93 for VEH-WEIGHT (continued): CL- and IS-prefixed native names keep their own side on every unit (pinned Java EquipmentType lookup is by name).
  ...[
    ['CLERPPC:OMNI', 'er-ppc', 'clan-er-ppc'],
    ['CLERSmallLaser', 'er-small-laser', 'clan-er-small-laser'],
    ['CLERSmallLaser(Clan)', 'er-small-laser', 'clan-er-small-laser'],
    ['CLERSmallLaser:OMNI', 'er-small-laser', 'clan-er-small-laser'],
    ['CLFlamer', 'flamer', 'clan-flamer'],
    ['CLFlamer(Clan)', 'flamer', 'clan-flamer'],
    ['CLGaussRifle', 'gauss-rifle', 'clan-gauss-rifle'],
    ['CLGaussRifle(Clan)', 'gauss-rifle', 'clan-gauss-rifle'],
    ['CLGaussRifle:OMNI', 'gauss-rifle', 'clan-gauss-rifle'],
    ['CLLB10-XAC(Clan)', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['CLLB2-XAC(Clan)', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['CLLB20-XAC(Clan)', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['CLLB5-XAC(Clan)', 'lb-5-x-ac', 'clan-lb-5-x-ac'],
    ['CLLBXAC10', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['CLLBXAC10:OMNI', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['CLLBXAC2', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['CLLBXAC20', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['CLLBXAC20:OMNI', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['CLLBXAC2:OMNI', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['CLLBXAC5', 'lb-5-x-ac', 'clan-lb-5-x-ac'],
    ['CLLRM10', 'lrm-10', 'clan-lrm-10'],
    ['CLLRM10(Clan)', 'lrm-10', 'clan-lrm-10'],
    ['CLLRM10:OMNI', 'lrm-10', 'clan-lrm-10'],
    ['CLLRM15', 'lrm-15', 'clan-lrm-15'],
    ['CLLRM15(Clan)', 'lrm-15', 'clan-lrm-15'],
    ['CLLRM15:OMNI', 'lrm-15', 'clan-lrm-15'],
    ['CLLRM20', 'lrm-20', 'clan-lrm-20'],
    ['CLLRM20(Clan)', 'lrm-20', 'clan-lrm-20'],
    ['CLLRM20:OMNI', 'lrm-20', 'clan-lrm-20'],
    ['CLLRM5', 'lrm-5', 'clan-lrm-5'],
    ['CLLRM5(Clan)', 'lrm-5', 'clan-lrm-5'],
    ['CLLRM5:OMNI', 'lrm-5', 'clan-lrm-5'],
    ['CLLargePulseLaser', 'large-pulse-laser', 'clan-large-pulse-laser'],
    ['CLLargePulseLaser(Clan)', 'large-pulse-laser', 'clan-large-pulse-laser'],
    ['CLLargePulseLaser:OMNI', 'large-pulse-laser', 'clan-large-pulse-laser'],
    ['CLLaserAnti-MissileSystem(Clan)', 'laser-ams', 'clan-laser-ams'],
    ['CLLaserAntiMissileSystem', 'laser-ams', 'clan-laser-ams'],
    ['CLLightActiveProbe', 'light-active-probe', 'clan-light-active-probe'],
    [
      'CLLightActiveProbe(Clan)',
      'light-active-probe',
      'clan-light-active-probe',
    ],
    [
      'CLLightActiveProbe:OMNI',
      'light-active-probe',
      'clan-light-active-probe',
    ],
    ['CLLightMG', 'light-machine-gun', 'clan-light-machine-gun'],
    ['CLLightMG:OMNI', 'light-machine-gun', 'clan-light-machine-gun'],
    ['CLLightTAG', 'light-tag', 'clan-light-tag'],
    ['CLLightTAG(Clan)', 'light-tag', 'clan-light-tag'],
    ['CLLightTAG:OMNI', 'light-tag', 'clan-light-tag'],
    ['CLMASC', 'masc', 'clan-masc'],
    ['CLMASC(Clan)', 'masc', 'clan-masc'],
    ['CLMG', 'machine-gun', 'clan-machine-gun'],
    ['CLMG:OMNI', 'machine-gun', 'clan-machine-gun'],
    ['CLMachineGun', 'machine-gun', 'clan-machine-gun'],
    ['CLMachineGun(Clan)', 'machine-gun', 'clan-machine-gun'],
    ['CLMediumPulseLaser', 'medium-pulse-laser', 'clan-medium-pulse-laser'],
    [
      'CLMediumPulseLaser(Clan)',
      'medium-pulse-laser',
      'clan-medium-pulse-laser',
    ],
    [
      'CLMediumPulseLaser:OMNI',
      'medium-pulse-laser',
      'clan-medium-pulse-laser',
    ],
    ['CLNARCMissileBeacon(Clan)', 'narc', 'clan-narc'],
    ['CLRotaryAC2', 'rac-2', 'clan-rac-2'],
    ['CLRotaryAC5', 'rac-5', 'clan-rac-5'],
    ['CLRotaryAC5:OMNI', 'rac-5', 'clan-rac-5'],
    ['CLSRM2', 'srm-2', 'clan-srm-2'],
    ['CLSRM2(Clan)', 'srm-2', 'clan-srm-2'],
    ['CLSRM2:OMNI', 'srm-2', 'clan-srm-2'],
    ['CLSRM4', 'srm-4', 'clan-srm-4'],
    ['CLSRM4(Clan)', 'srm-4', 'clan-srm-4'],
    ['CLSRM4:OMNI', 'srm-4', 'clan-srm-4'],
    ['CLSRM6', 'srm-6', 'clan-srm-6'],
    ['CLSRM6(Clan)', 'srm-6', 'clan-srm-6'],
    ['CLSRM6:OMNI', 'srm-6', 'clan-srm-6'],
    ['CLSmallPulseLaser', 'small-pulse-laser', 'clan-small-pulse-laser'],
    ['CLSmallPulseLaser(Clan)', 'small-pulse-laser', 'clan-small-pulse-laser'],
    ['CLSmallPulseLaser:OMNI', 'small-pulse-laser', 'clan-small-pulse-laser'],
    ['CLStreakSRM2', 'streak-srm-2', 'clan-streak-srm-2'],
    ['CLStreakSRM2(Clan)', 'streak-srm-2', 'clan-streak-srm-2'],
    ['CLStreakSRM2:OMNI', 'streak-srm-2', 'clan-streak-srm-2'],
    ['CLStreakSRM4', 'streak-srm-4', 'clan-streak-srm-4'],
    ['CLStreakSRM4(Clan)', 'streak-srm-4', 'clan-streak-srm-4'],
    ['CLStreakSRM4:OMNI', 'streak-srm-4', 'clan-streak-srm-4'],
    ['CLStreakSRM6', 'streak-srm-6', 'clan-streak-srm-6'],
    ['CLStreakSRM6(Clan)', 'streak-srm-6', 'clan-streak-srm-6'],
    ['CLStreakSRM6:OMNI', 'streak-srm-6', 'clan-streak-srm-6'],
    ['CLTAG', 'tag', 'clan-tag'],
    ['CLTAG(Clan)', 'tag', 'clan-tag'],
    ['CLTAG:OMNI', 'tag', 'clan-tag'],
    [
      'CLTargetingComputer(Clan)',
      'targeting-computer',
      'clan-targeting-computer',
    ],
    ['CLUltraAC/10(Clan)', 'uac-10', 'clan-uac-10'],
    ['CLUltraAC/2(Clan)', 'uac-2', 'clan-uac-2'],
    ['CLUltraAC/20(Clan)', 'uac-20', 'clan-uac-20'],
    ['CLUltraAC/5(Clan)', 'uac-5', 'clan-uac-5'],
    ['CLUltraAC10', 'uac-10', 'clan-uac-10'],
    ['CLUltraAC10:OMNI', 'uac-10', 'clan-uac-10'],
    ['CLUltraAC2', 'uac-2', 'clan-uac-2'],
    ['CLUltraAC20', 'uac-20', 'clan-uac-20'],
    ['CLUltraAC20:OMNI', 'uac-20', 'clan-uac-20'],
    ['CLUltraAC5', 'uac-5', 'clan-uac-5'],
    ['Clan Active Probe (Clan)', 'active-probe', 'clan-active-probe'],
    ['Clan Anti-Missile System (Clan)', 'ams', 'clan-ams'],
    ['Clan ER Large Laser (Clan)', 'er-large-laser', 'clan-er-large-laser'],
    ['Clan ER Medium Laser (Clan)', 'er-medium-laser', 'clan-er-medium-laser'],
    ['Clan ER PPC', 'er-ppc', 'clan-er-ppc'],
    ['Clan ER PPC (Clan)', 'er-ppc', 'clan-er-ppc'],
    ['Clan ER Small Laser (Clan)', 'er-small-laser', 'clan-er-small-laser'],
    ['Clan Flamer (Clan)', 'flamer', 'clan-flamer'],
    ['Clan Gauss Rifle (Clan)', 'gauss-rifle', 'clan-gauss-rifle'],
    ['Clan LB 10-X AC (Clan)', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['Clan LB 2-X AC (Clan)', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['Clan LB 20-X AC (Clan)', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['Clan LB 5-X AC (Clan)', 'lb-5-x-ac', 'clan-lb-5-x-ac'],
    ['Clan LRM 10 (Clan)', 'lrm-10', 'clan-lrm-10'],
    ['Clan LRM 15 (Clan)', 'lrm-15', 'clan-lrm-15'],
    ['Clan LRM 20 (Clan)', 'lrm-20', 'clan-lrm-20'],
    ['Clan LRM 5 (Clan)', 'lrm-5', 'clan-lrm-5'],
    [
      'Clan Large Pulse Laser (Clan)',
      'large-pulse-laser',
      'clan-large-pulse-laser',
    ],
    ['Clan Laser Anti-Missile System (Clan)', 'laser-ams', 'clan-laser-ams'],
    [
      'Clan Light Active Probe (Clan)',
      'light-active-probe',
      'clan-light-active-probe',
    ],
    ['Clan Light Machine Gun', 'light-machine-gun', 'clan-light-machine-gun'],
    ['Clan Light TAG', 'light-tag', 'clan-light-tag'],
    ['Clan Light TAG (Clan)', 'light-tag', 'clan-light-tag'],
    ['Clan MASC (Clan)', 'masc', 'clan-masc'],
    ['Clan Machine Gun (Clan)', 'machine-gun', 'clan-machine-gun'],
    [
      'Clan Medium Pulse Laser (Clan)',
      'medium-pulse-laser',
      'clan-medium-pulse-laser',
    ],
    ['Clan NARC Missile Beacon (Clan)', 'narc', 'clan-narc'],
    ['Clan SRM 2 (Clan)', 'srm-2', 'clan-srm-2'],
    ['Clan SRM 4 (Clan)', 'srm-4', 'clan-srm-4'],
    ['Clan SRM 6 (Clan)', 'srm-6', 'clan-srm-6'],
    [
      'Clan Small Pulse Laser (Clan)',
      'small-pulse-laser',
      'clan-small-pulse-laser',
    ],
    ['Clan Streak SRM 2 (Clan)', 'streak-srm-2', 'clan-streak-srm-2'],
    ['Clan Streak SRM 4 (Clan)', 'streak-srm-4', 'clan-streak-srm-4'],
    ['Clan Streak SRM 6 (Clan)', 'streak-srm-6', 'clan-streak-srm-6'],
    ['Clan TAG (Clan)', 'tag', 'clan-tag'],
    [
      'Clan Targeting Computer (Clan)',
      'targeting-computer',
      'clan-targeting-computer',
    ],
    ['Clan Ultra AC/10 (Clan)', 'uac-10', 'clan-uac-10'],
    ['Clan Ultra AC/2 (Clan)', 'uac-2', 'clan-uac-2'],
    ['Clan Ultra AC/20 (Clan)', 'uac-20', 'clan-uac-20'],
    ['Clan Ultra AC/5 (Clan)', 'uac-5', 'clan-uac-5'],
    ['IS AMS', 'clan-ams', 'ams'],
    ['IS Active Probe', 'clan-active-probe', 'active-probe'],
    ['IS Anti-Missile System', 'clan-ams', 'ams'],
    ['IS ER Large Laser', 'clan-er-large-laser', 'er-large-laser'],
    ['IS ER Medium Laser', 'clan-er-medium-laser', 'er-medium-laser'],
    ['IS ER PPC', 'clan-er-ppc', 'er-ppc'],
    ['IS ER Small Laser', 'clan-er-small-laser', 'er-small-laser'],
    ['IS Flamer', 'clan-flamer', 'flamer'],
    ['IS Gauss Rifle', 'clan-gauss-rifle', 'gauss-rifle'],
    ['IS LB 10-X AC', 'clan-lb-10-x-ac', 'lb-10-x-ac'],
    ['IS LB 2-X AC', 'clan-lb-2-x-ac', 'lb-2-x-ac'],
    ['IS LB 20-X AC', 'clan-lb-20-x-ac', 'lb-20-x-ac'],
    ['IS LB 5-X AC', 'clan-lb-5-x-ac', 'lb-5-x-ac'],
    ['IS LRM 10', 'clan-lrm-10', 'lrm-10'],
    ['IS LRM 15', 'clan-lrm-15', 'lrm-15'],
    ['IS LRM 20', 'clan-lrm-20', 'lrm-20'],
    ['IS LRM 5', 'clan-lrm-5', 'lrm-5'],
    ['IS Large Pulse Laser', 'clan-large-pulse-laser', 'large-pulse-laser'],
    ['IS Laser Anti-Missile System', 'clan-laser-ams', 'laser-ams'],
    ['IS Light Active Probe', 'clan-light-active-probe', 'light-active-probe'],
    ['IS Light Machine Gun', 'clan-light-machine-gun', 'light-machine-gun'],
    ['IS MASC', 'clan-masc', 'masc'],
    ['IS Machine Gun', 'clan-machine-gun', 'machine-gun'],
    ['IS Medium Pulse Laser', 'clan-medium-pulse-laser', 'medium-pulse-laser'],
    ['IS NARC Missile Beacon', 'clan-narc', 'narc'],
    ['IS Narc Missile Beacon', 'clan-narc', 'narc'],
    ['IS Rotary AC/2', 'clan-rac-2', 'rac-2'],
    ['IS Rotary AC/5', 'clan-rac-5', 'rac-5'],
    ['IS SRM 2', 'clan-srm-2', 'srm-2'],
    ['IS SRM 4', 'clan-srm-4', 'srm-4'],
    ['IS SRM 6', 'clan-srm-6', 'srm-6'],
    ['IS Small Pulse Laser', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['IS Streak SRM 2', 'clan-streak-srm-2', 'streak-srm-2'],
    ['IS Streak SRM 4', 'clan-streak-srm-4', 'streak-srm-4'],
    ['IS Streak SRM 6', 'clan-streak-srm-6', 'streak-srm-6'],
    ['IS TAG', 'clan-tag', 'tag'],
    ['IS Targeting Computer', 'clan-targeting-computer', 'targeting-computer'],
    ['IS Ultra AC/10', 'clan-uac-10', 'uac-10'],
    ['IS Ultra AC/2', 'clan-uac-2', 'uac-2'],
    ['IS Ultra AC/20', 'clan-uac-20', 'uac-20'],
    ['IS Ultra AC/5', 'clan-uac-5', 'uac-5'],
    ['ISAMS', 'clan-ams', 'ams'],
    ['ISActiveProbe', 'clan-active-probe', 'active-probe'],
    ['ISAnti-MissileSystem', 'clan-ams', 'ams'],
    ['ISAntiMissileSystem', 'clan-ams', 'ams'],
    ['ISAntiMissileSystem(ST)', 'clan-ams', 'ams'],
    ['ISAntiMissileSystem:OMNI', 'clan-ams', 'ams'],
    ['ISERLargeLaser', 'clan-er-large-laser', 'er-large-laser'],
    ['ISERLargeLaser:OMNI', 'clan-er-large-laser', 'er-large-laser'],
    ['ISERMediumLaser', 'clan-er-medium-laser', 'er-medium-laser'],
    ['ISERMediumLaser(ST)', 'clan-er-medium-laser', 'er-medium-laser'],
    ['ISERMediumLaser:OMNI', 'clan-er-medium-laser', 'er-medium-laser'],
    ['ISERPPC', 'clan-er-ppc', 'er-ppc'],
    ['ISERPPC:OMNI', 'clan-er-ppc', 'er-ppc'],
    ['ISERSmallLaser', 'clan-er-small-laser', 'er-small-laser'],
    ['ISERSmallLaser(ST)', 'clan-er-small-laser', 'er-small-laser'],
    ['ISERSmallLaser:OMNI', 'clan-er-small-laser', 'er-small-laser'],
    ['ISFlamer', 'clan-flamer', 'flamer'],
    ['ISGaussRifle', 'clan-gauss-rifle', 'gauss-rifle'],
    ['ISGaussRifle:OMNI', 'clan-gauss-rifle', 'gauss-rifle'],
    ['ISLB10-XAC', 'clan-lb-10-x-ac', 'lb-10-x-ac'],
    ['ISLB2-XAC', 'clan-lb-2-x-ac', 'lb-2-x-ac'],
    ['ISLB20-XAC', 'clan-lb-20-x-ac', 'lb-20-x-ac'],
    ['ISLB5-XAC', 'clan-lb-5-x-ac', 'lb-5-x-ac'],
    ['ISLBXAC10', 'clan-lb-10-x-ac', 'lb-10-x-ac'],
    ['ISLBXAC10:OMNI', 'clan-lb-10-x-ac', 'lb-10-x-ac'],
    ['ISLBXAC2', 'clan-lb-2-x-ac', 'lb-2-x-ac'],
    ['ISLBXAC20', 'clan-lb-20-x-ac', 'lb-20-x-ac'],
    ['ISLBXAC20:OMNI', 'clan-lb-20-x-ac', 'lb-20-x-ac'],
    ['ISLBXAC2:OMNI', 'clan-lb-2-x-ac', 'lb-2-x-ac'],
    ['ISLBXAC5', 'clan-lb-5-x-ac', 'lb-5-x-ac'],
    ['ISLRM10', 'clan-lrm-10', 'lrm-10'],
    ['ISLRM15', 'clan-lrm-15', 'lrm-15'],
    ['ISLRM20', 'clan-lrm-20', 'lrm-20'],
    ['ISLRM5', 'clan-lrm-5', 'lrm-5'],
    ['ISLargePulseLaser', 'clan-large-pulse-laser', 'large-pulse-laser'],
    ['ISLargePulseLaser:OMNI', 'clan-large-pulse-laser', 'large-pulse-laser'],
    ['ISLaserAnti-MissileSystem', 'clan-laser-ams', 'laser-ams'],
    ['ISLaserAntiMissileSystem', 'clan-laser-ams', 'laser-ams'],
    ['ISLightActiveProbe', 'clan-light-active-probe', 'light-active-probe'],
    ['ISLightMachineGun', 'clan-light-machine-gun', 'light-machine-gun'],
    ['ISLightTAG', 'clan-light-tag', 'light-tag'],
    ['ISMASC', 'clan-masc', 'masc'],
    ['ISMachine Gun', 'clan-machine-gun', 'machine-gun'],
    ['ISMachineGun', 'clan-machine-gun', 'machine-gun'],
    ['ISMediumPulseLaser', 'clan-medium-pulse-laser', 'medium-pulse-laser'],
    [
      'ISMediumPulseLaser:OMNI',
      'clan-medium-pulse-laser',
      'medium-pulse-laser',
    ],
    ['ISNARCMissileBeacon', 'clan-narc', 'narc'],
    ['ISNarc', 'clan-narc', 'narc'],
    ['ISRAC2', 'clan-rac-2', 'rac-2'],
    ['ISRAC5', 'clan-rac-5', 'rac-5'],
    ['ISRotaryAC/2', 'clan-rac-2', 'rac-2'],
    ['ISRotaryAC/5', 'clan-rac-5', 'rac-5'],
    ['ISRotaryAC2:OMNI', 'clan-rac-2', 'rac-2'],
    ['ISRotaryAC5:OMNI', 'clan-rac-5', 'rac-5'],
    ['ISSRM2', 'clan-srm-2', 'srm-2'],
    ['ISSRM4', 'clan-srm-4', 'srm-4'],
    ['ISSRM6', 'clan-srm-6', 'srm-6'],
    ['ISSmall Pulse Laser', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['ISSmallPulseLaser', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['ISSmallPulseLaser(ST)', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['ISSmallPulseLaser:OMNI', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['ISStreakSRM2', 'clan-streak-srm-2', 'streak-srm-2'],
    ['ISStreakSRM2:OMNI', 'clan-streak-srm-2', 'streak-srm-2'],
    ['ISStreakSRM4', 'clan-streak-srm-4', 'streak-srm-4'],
    ['ISStreakSRM4:OMNI', 'clan-streak-srm-4', 'streak-srm-4'],
    ['ISStreakSRM6', 'clan-streak-srm-6', 'streak-srm-6'],
    ['ISStreakSRM6:OMNI', 'clan-streak-srm-6', 'streak-srm-6'],
    ['ISTAG', 'clan-tag', 'tag'],
    ['ISTAG:OMNI', 'clan-tag', 'tag'],
    ['ISTargetingComputer', 'clan-targeting-computer', 'targeting-computer'],
    ['ISUltraAC/10', 'clan-uac-10', 'uac-10'],
    ['ISUltraAC/2', 'clan-uac-2', 'uac-2'],
    ['ISUltraAC/20', 'clan-uac-20', 'uac-20'],
    ['ISUltraAC/5', 'clan-uac-5', 'uac-5'],
    ['ISUltraAC10', 'clan-uac-10', 'uac-10'],
    ['ISUltraAC10:OMNI', 'clan-uac-10', 'uac-10'],
    ['ISUltraAC2', 'clan-uac-2', 'uac-2'],
    ['ISUltraAC20', 'clan-uac-20', 'uac-20'],
    ['ISUltraAC20:OMNI', 'clan-uac-20', 'uac-20'],
    ['ISUltraAC2:OMNI', 'clan-uac-2', 'uac-2'],
    ['ISUltraAC5', 'clan-uac-5', 'uac-5'],
    ['ISUltraAC5:OMNI', 'clan-uac-5', 'uac-5'],
    ['clan-active-probe', 'active-probe', 'clan-active-probe'],
    ['clan-ams', 'ams', 'clan-ams'],
    ['clan-anti-missile-system', 'ams', 'clan-ams'],
    ['clan-arrow-iv', 'arrow-iv-launcher', 'clan-arrow-iv-launcher'],
    ['clan-arrow-iv-launcher', 'arrow-iv-launcher', 'clan-arrow-iv-launcher'],
    ['clan-er-flamer', 'er-flamer', 'clan-er-flamer'],
    ['clan-er-large-laser', 'er-large-laser', 'clan-er-large-laser'],
    ['clan-er-medium-laser', 'er-medium-laser', 'clan-er-medium-laser'],
    ['clan-er-ppc', 'er-ppc', 'clan-er-ppc'],
    ['clan-er-small-laser', 'er-small-laser', 'clan-er-small-laser'],
    [
      'clan-extended-range-large-laser',
      'er-large-laser',
      'clan-er-large-laser',
    ],
    [
      'clan-extended-range-medium-laser',
      'er-medium-laser',
      'clan-er-medium-laser',
    ],
    [
      'clan-extended-range-small-laser',
      'er-small-laser',
      'clan-er-small-laser',
    ],
    ['clan-flamer', 'flamer', 'clan-flamer'],
    ['clan-gauss-rifle', 'gauss-rifle', 'clan-gauss-rifle'],
    ['clan-large-pulse-laser', 'large-pulse-laser', 'clan-large-pulse-laser'],
    ['clan-laser-ams', 'laser-ams', 'clan-laser-ams'],
    ['clan-lb-10-x-ac', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['clan-lb-2-x-ac', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['clan-lb-20-x-ac', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['clan-lb-5-x-ac', 'lb-5-x-ac', 'clan-lb-5-x-ac'],
    [
      'clan-light-active-probe',
      'light-active-probe',
      'clan-light-active-probe',
    ],
    ['clan-light-machine-gun', 'light-machine-gun', 'clan-light-machine-gun'],
    ['clan-light-tag', 'light-tag', 'clan-light-tag'],
    ['clan-lrm-10', 'lrm-10', 'clan-lrm-10'],
    ['clan-lrm-15', 'lrm-15', 'clan-lrm-15'],
    ['clan-lrm-20', 'lrm-20', 'clan-lrm-20'],
    ['clan-lrm-5', 'lrm-5', 'clan-lrm-5'],
    ['clan-lrt-10', 'lrm-10', 'clan-lrm-10'],
    ['clan-lrt-15', 'lrm-15', 'clan-lrm-15'],
    ['clan-lrt-20', 'lrm-20', 'clan-lrm-20'],
    ['clan-lrt-5', 'lrm-5', 'clan-lrm-5'],
    ['clan-machine-gun', 'machine-gun', 'clan-machine-gun'],
    ['clan-masc', 'masc', 'clan-masc'],
    ['clan-mech-mortar-1', 'mech-mortar-1', 'clan-mech-mortar-1'],
    ['clan-mech-mortar-2', 'mech-mortar-2', 'clan-mech-mortar-2'],
    ['clan-mech-mortar-4', 'mech-mortar-4', 'clan-mech-mortar-4'],
    ['clan-mech-mortar-8', 'mech-mortar-8', 'clan-mech-mortar-8'],
    [
      'clan-medium-pulse-laser',
      'medium-pulse-laser',
      'clan-medium-pulse-laser',
    ],
    ['clan-narc', 'narc', 'clan-narc'],
    ['clan-rac-2', 'rac-2', 'clan-rac-2'],
    ['clan-rac-5', 'rac-5', 'clan-rac-5'],
    ['clan-rotary-ac-2', 'rac-2', 'clan-rac-2'],
    ['clan-rotary-ac-5', 'rac-5', 'clan-rac-5'],
    ['clan-small-pulse-laser', 'small-pulse-laser', 'clan-small-pulse-laser'],
    ['clan-srm-2', 'srm-2', 'clan-srm-2'],
    ['clan-srm-4', 'srm-4', 'clan-srm-4'],
    ['clan-srm-6', 'srm-6', 'clan-srm-6'],
    ['clan-srt-2', 'srm-2', 'clan-srm-2'],
    ['clan-srt-4', 'srm-4', 'clan-srm-4'],
    ['clan-srt-6', 'srm-6', 'clan-srm-6'],
    ['clan-streak-srm-2', 'streak-srm-2', 'clan-streak-srm-2'],
    ['clan-streak-srm-4', 'streak-srm-4', 'clan-streak-srm-4'],
    ['clan-streak-srm-6', 'streak-srm-6', 'clan-streak-srm-6'],
    ['clan-tag', 'tag', 'clan-tag'],
    [
      'clan-targeting-computer',
      'targeting-computer',
      'clan-targeting-computer',
    ],
    ['clan-uac-10', 'uac-10', 'clan-uac-10'],
    ['clan-uac-2', 'uac-2', 'clan-uac-2'],
    ['clan-uac-20', 'uac-20', 'clan-uac-20'],
    ['clan-uac-5', 'uac-5', 'clan-uac-5'],
    ['clan-ultra-ac-10', 'uac-10', 'clan-uac-10'],
    ['clan-ultra-ac-2', 'uac-2', 'clan-uac-2'],
    ['clan-ultra-ac-20', 'uac-20', 'clan-uac-20'],
    ['clan-ultra-ac-5', 'uac-5', 'clan-uac-5'],
    ['clerppc:omni', 'er-ppc', 'clan-er-ppc'],
    ['clersmalllaser', 'er-small-laser', 'clan-er-small-laser'],
    ['clersmalllaser:omni', 'er-small-laser', 'clan-er-small-laser'],
    ['clflamer', 'flamer', 'clan-flamer'],
    ['clgaussrifle', 'gauss-rifle', 'clan-gauss-rifle'],
    ['clgaussrifle:omni', 'gauss-rifle', 'clan-gauss-rifle'],
    ['cllargepulselaser', 'large-pulse-laser', 'clan-large-pulse-laser'],
    ['cllargepulselaser:omni', 'large-pulse-laser', 'clan-large-pulse-laser'],
    ['cllaserantimissilesystem', 'laser-ams', 'clan-laser-ams'],
    ['cllbxac10', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['cllbxac10:omni', 'lb-10-x-ac', 'clan-lb-10-x-ac'],
    ['cllbxac2', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['cllbxac20', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['cllbxac20:omni', 'lb-20-x-ac', 'clan-lb-20-x-ac'],
    ['cllbxac2:omni', 'lb-2-x-ac', 'clan-lb-2-x-ac'],
    ['cllbxac5', 'lb-5-x-ac', 'clan-lb-5-x-ac'],
    ['cllightactiveprobe', 'light-active-probe', 'clan-light-active-probe'],
    [
      'cllightactiveprobe:omni',
      'light-active-probe',
      'clan-light-active-probe',
    ],
    ['cllightmg', 'light-machine-gun', 'clan-light-machine-gun'],
    ['cllightmg:omni', 'light-machine-gun', 'clan-light-machine-gun'],
    ['cllighttag', 'light-tag', 'clan-light-tag'],
    ['cllighttag:omni', 'light-tag', 'clan-light-tag'],
    ['cllrm10', 'lrm-10', 'clan-lrm-10'],
    ['cllrm10:omni', 'lrm-10', 'clan-lrm-10'],
    ['cllrm15', 'lrm-15', 'clan-lrm-15'],
    ['cllrm15:omni', 'lrm-15', 'clan-lrm-15'],
    ['cllrm20', 'lrm-20', 'clan-lrm-20'],
    ['cllrm20:omni', 'lrm-20', 'clan-lrm-20'],
    ['cllrm5', 'lrm-5', 'clan-lrm-5'],
    ['cllrm5:omni', 'lrm-5', 'clan-lrm-5'],
    ['clmediumpulselaser', 'medium-pulse-laser', 'clan-medium-pulse-laser'],
    [
      'clmediumpulselaser:omni',
      'medium-pulse-laser',
      'clan-medium-pulse-laser',
    ],
    ['clmg', 'machine-gun', 'clan-machine-gun'],
    ['clmg:omni', 'machine-gun', 'clan-machine-gun'],
    ['clrotaryac2', 'rac-2', 'clan-rac-2'],
    ['clrotaryac5', 'rac-5', 'clan-rac-5'],
    ['clrotaryac5:omni', 'rac-5', 'clan-rac-5'],
    ['clsmallpulselaser', 'small-pulse-laser', 'clan-small-pulse-laser'],
    ['clsmallpulselaser:omni', 'small-pulse-laser', 'clan-small-pulse-laser'],
    ['clsrm2', 'srm-2', 'clan-srm-2'],
    ['clsrm2:omni', 'srm-2', 'clan-srm-2'],
    ['clsrm4', 'srm-4', 'clan-srm-4'],
    ['clsrm4:omni', 'srm-4', 'clan-srm-4'],
    ['clsrm6', 'srm-6', 'clan-srm-6'],
    ['clsrm6:omni', 'srm-6', 'clan-srm-6'],
    ['clstreaksrm2', 'streak-srm-2', 'clan-streak-srm-2'],
    ['clstreaksrm2:omni', 'streak-srm-2', 'clan-streak-srm-2'],
    ['clstreaksrm4', 'streak-srm-4', 'clan-streak-srm-4'],
    ['clstreaksrm4:omni', 'streak-srm-4', 'clan-streak-srm-4'],
    ['clstreaksrm6', 'streak-srm-6', 'clan-streak-srm-6'],
    ['clstreaksrm6:omni', 'streak-srm-6', 'clan-streak-srm-6'],
    ['cltag', 'tag', 'clan-tag'],
    ['cltag:omni', 'tag', 'clan-tag'],
    ['cltargeting-computer', 'targeting-computer', 'clan-targeting-computer'],
    [
      'cltargeting-computer:omni',
      'targeting-computer',
      'clan-targeting-computer',
    ],
    ['clultraac10', 'uac-10', 'clan-uac-10'],
    ['clultraac10:omni', 'uac-10', 'clan-uac-10'],
    ['clultraac2', 'uac-2', 'clan-uac-2'],
    ['clultraac20', 'uac-20', 'clan-uac-20'],
    ['clultraac20:omni', 'uac-20', 'clan-uac-20'],
    ['clultraac5', 'uac-5', 'clan-uac-5'],
    ['is-mech-mortar-1', 'clan-mech-mortar-1', 'mech-mortar-1'],
    ['is-mech-mortar-2', 'clan-mech-mortar-2', 'mech-mortar-2'],
    ['is-mech-mortar-8', 'clan-mech-mortar-8', 'mech-mortar-8'],
    ['isantimissilesystem', 'clan-ams', 'ams'],
    ['isantimissilesystem:omni', 'clan-ams', 'ams'],
    ['isantimissilesystemst', 'clan-ams', 'ams'],
    ['iserlargelaser', 'clan-er-large-laser', 'er-large-laser'],
    ['iserlargelaser:omni', 'clan-er-large-laser', 'er-large-laser'],
    ['isermediumlaser', 'clan-er-medium-laser', 'er-medium-laser'],
    ['isermediumlaser:omni', 'clan-er-medium-laser', 'er-medium-laser'],
    ['isermediumlaserst', 'clan-er-medium-laser', 'er-medium-laser'],
    ['iserppc', 'clan-er-ppc', 'er-ppc'],
    ['iserppc:omni', 'clan-er-ppc', 'er-ppc'],
    ['isersmalllaser', 'clan-er-small-laser', 'er-small-laser'],
    ['isersmalllaser:omni', 'clan-er-small-laser', 'er-small-laser'],
    ['isersmalllaserst', 'clan-er-small-laser', 'er-small-laser'],
    ['isgaussrifle', 'clan-gauss-rifle', 'gauss-rifle'],
    ['isgaussrifle:omni', 'clan-gauss-rifle', 'gauss-rifle'],
    ['islargepulselaser', 'clan-large-pulse-laser', 'large-pulse-laser'],
    ['islargepulselaser:omni', 'clan-large-pulse-laser', 'large-pulse-laser'],
    ['islaserantimissilesystem', 'clan-laser-ams', 'laser-ams'],
    ['islbxac10', 'clan-lb-10-x-ac', 'lb-10-x-ac'],
    ['islbxac10:omni', 'clan-lb-10-x-ac', 'lb-10-x-ac'],
    ['islbxac2', 'clan-lb-2-x-ac', 'lb-2-x-ac'],
    ['islbxac20', 'clan-lb-20-x-ac', 'lb-20-x-ac'],
    ['islbxac20:omni', 'clan-lb-20-x-ac', 'lb-20-x-ac'],
    ['islbxac2:omni', 'clan-lb-2-x-ac', 'lb-2-x-ac'],
    ['islbxac5', 'clan-lb-5-x-ac', 'lb-5-x-ac'],
    ['ismachine-gun', 'clan-machine-gun', 'machine-gun'],
    ['ismediumpulselaser', 'clan-medium-pulse-laser', 'medium-pulse-laser'],
    [
      'ismediumpulselaser:omni',
      'clan-medium-pulse-laser',
      'medium-pulse-laser',
    ],
    ['isrotaryac2:omni', 'clan-rac-2', 'rac-2'],
    ['isrotaryac5:omni', 'clan-rac-5', 'rac-5'],
    ['issmallpulselaser', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['issmallpulselaser:omni', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['issmallpulselaserst', 'clan-small-pulse-laser', 'small-pulse-laser'],
    ['isstreaksrm2', 'clan-streak-srm-2', 'streak-srm-2'],
    ['isstreaksrm2:omni', 'clan-streak-srm-2', 'streak-srm-2'],
    ['isstreaksrm4', 'clan-streak-srm-4', 'streak-srm-4'],
    ['isstreaksrm4:omni', 'clan-streak-srm-4', 'streak-srm-4'],
    ['isstreaksrm6', 'clan-streak-srm-6', 'streak-srm-6'],
    ['isstreaksrm6:omni', 'clan-streak-srm-6', 'streak-srm-6'],
    ['istag', 'clan-tag', 'tag'],
    ['istag:omni', 'clan-tag', 'tag'],
    ['istargeting-computer', 'clan-targeting-computer', 'targeting-computer'],
    [
      'istargeting-computer:omni',
      'clan-targeting-computer',
      'targeting-computer',
    ],
    ['isultraac10', 'clan-uac-10', 'uac-10'],
    ['isultraac10:omni', 'clan-uac-10', 'uac-10'],
    ['isultraac2', 'clan-uac-2', 'uac-2'],
    ['isultraac20', 'clan-uac-20', 'uac-20'],
    ['isultraac20:omni', 'clan-uac-20', 'uac-20'],
    ['isultraac2:omni', 'clan-uac-2', 'uac-2'],
    ['isultraac5', 'clan-uac-5', 'uac-5'],
    ['isultraac5:omni', 'clan-uac-5', 'uac-5'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason:
      'Follow-up 93; a native name with its own Clan prefix keeps its Clan item (ownTechSide), unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93: slot-less (vehicle) ammo bins take the BV owner's pinned AmmoType record, e.g. Clan Ammo LRM-20 BV 27 not IS 23.
  ...[
    ['CL Rotary AC/2 Ammo', 'rotaryac2', 'clrotaryac2-ammo-registry'],
    ['CL Rotary AC/5 Ammo', 'rotaryac5', 'clrotaryac5-ammo-registry'],
    ['CLIATM3 Ammo', 'clan-ammo-iatm-3', 'clan-ammo-iatm-3-registry'],
    [
      'CLLBXAC10 CL Ammo',
      'lb-10-x-cluster-ammo',
      'clan-lb-10-x-cluster-ammo-registry',
    ],
    [
      'CLLBXAC20 CL Ammo',
      'lb-20-x-cluster-ammo',
      'clan-lb-20-x-cluster-ammo-registry',
    ],
    [
      'CLLRM10 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM10 (Clan) Artemis-capable Ammo',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    ['CLLRM10 Ammo', 'ammo-lrm-10', 'clan-ammo-lrm-10-registry'],
    [
      'CLLRM10 Ammo (Clan) Artemis V-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM10 Ammo (Clan) Artemis-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'CLLRM10 Ammo - (Clan) Artemis V-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM10 Ammo - (Clan) Artemis-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'CLLRM12 Ammo',
      'clan-ammo-protomech-lrm-12',
      'clan-ammo-protomech-lrm-12-registry',
    ],
    [
      'CLLRM15 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM15 (Clan) Artemis-capable Ammo',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    ['CLLRM15 Ammo', 'ammo-lrm-15', 'clan-ammo-lrm-15-registry'],
    [
      'CLLRM15 Ammo (Clan) Artemis V-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM15 Ammo (Clan) Artemis-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'CLLRM15 Ammo - (Clan) Artemis V-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM15 Ammo - (Clan) Artemis-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'CLLRM2 Ammo',
      'clan-ammo-protomech-lrm-2',
      'clan-ammo-protomech-lrm-2-registry',
    ],
    [
      'CLLRM20 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM20 (Clan) Artemis-capable Ammo',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    ['CLLRM20 Ammo', 'ammo-lrm-20', 'clan-ammo-lrm-20-registry'],
    [
      'CLLRM20 Ammo (Clan) Artemis V-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM20 Ammo (Clan) Artemis-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'CLLRM20 Ammo - (Clan) Artemis V-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'CLLRM20 Ammo - (Clan) Artemis-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'CLLRM3 Ammo',
      'clan-ammo-protomech-lrm-3',
      'clan-ammo-protomech-lrm-3-registry',
    ],
    [
      'CLLRM4 Ammo',
      'clan-ammo-protomech-lrm-4',
      'clan-ammo-protomech-lrm-4-registry',
    ],
    ['CLLRM5 Ammo', 'ammo-lrm-5', 'clan-ammo-lrm-5-registry'],
    [
      'CLLRM6 Ammo',
      'clan-ammo-protomech-lrm-6',
      'clan-ammo-protomech-lrm-6-registry',
    ],
    [
      'CLLightMG Ammo',
      'light-mg-ammo',
      'clan-light-machine-gun-ammo-proto-registry',
    ],
    ['CLRotaryAC2 Ammo', 'rotaryac2', 'clrotaryac2-ammo-registry'],
    ['CLRotaryAC5 Ammo', 'rotaryac5', 'clrotaryac5-ammo-registry'],
    ['CLSRM1 Ammo', 'clan-ammo-srm-1', 'clan-ammo-srm-1-registry'],
    ['CLSRM2 Ammo', 'ammo-srm-2', 'clan-ammo-srm-2-registry'],
    ['CLSRM3 Ammo', 'clan-ammo-srm-3', 'clan-ammo-srm-3-registry'],
    [
      'CLSRM4 (Clan) Artemis-capable Ammo',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    ['CLSRM4 Ammo', 'ammo-srm-4', 'clan-ammo-srm-4-registry'],
    [
      'CLSRM4 Ammo (Clan) Artemis-capable',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    [
      'CLSRM4 Ammo - (Clan) Artemis-capable',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    ['CLSRM5 Ammo', 'clan-ammo-srm-5', 'clan-ammo-srm-5-registry'],
    [
      'CLSRM6 (Clan) Artemis-capable Ammo',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    ['CLSRM6 Ammo', 'ammo-srm-6', 'clan-ammo-srm-6-registry'],
    [
      'CLSRM6 Ammo (Clan) Artemis-capable',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    [
      'CLSRM6 Ammo - (Clan) Artemis-capable',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    [
      'CLStreakLRM5 Ammo',
      'clan-streak-lrm-5',
      'clan-streak-lrm-5-ammo-registry',
    ],
    [
      'CLStreakSRM1 Ammo',
      'clan-streak-srm-1',
      'clan-streak-srm-1-ammo-registry',
    ],
    [
      'CLStreakSRM3 Ammo',
      'clan-streak-srm-3',
      'clan-streak-srm-3-ammo-registry',
    ],
    [
      'CLStreakSRM5 Ammo',
      'clan-streak-srm-5',
      'clan-streak-srm-5-ammo-registry',
    ],
    ['CLUltraAC10 Ammo', 'uac-10-ammo', 'clan-ultra-ac-10-ammo-registry'],
    ['CLUltraAC2 Ammo', 'uac-2-ammo', 'clan-ultra-ac-2-ammo-registry'],
    ['CLUltraAC20 Ammo', 'uac-20-ammo', 'clan-ultra-ac-20-ammo-registry'],
    ['CLUltraAC5 Ammo', 'uac-5-ammo', 'clan-ultra-ac-5-ammo-registry'],
    [
      'Clan (Clan) Artemis V-capable Ammo LRM-10',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'Clan (Clan) Artemis V-capable Ammo LRM-15',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'Clan (Clan) Artemis V-capable Ammo LRM-20',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'Clan (Clan) Artemis-capable Ammo LRM-10',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'Clan (Clan) Artemis-capable Ammo LRM-15',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'Clan (Clan) Artemis-capable Ammo LRM-20',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'Clan (Clan) Artemis-capable Ammo SRM-4',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    [
      'Clan (Clan) Artemis-capable Ammo SRM-6',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    [
      'Clan AP Gauss Rifle Ammo',
      'apgaussrifle',
      'clapgaussrifle-ammo-registry',
    ],
    ['Clan Ammo LRM-10', 'ammo-lrm-10', 'clan-ammo-lrm-10-registry'],
    [
      'Clan Ammo LRM-10 (Clan) Artemis V-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'Clan Ammo LRM-10 (Clan) Artemis-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo LRM-10 - (Clan) Artemis V-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'Clan Ammo LRM-10 - (Clan) Artemis-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo LRM-12',
      'clan-ammo-protomech-lrm-12',
      'clan-ammo-protomech-lrm-12-registry',
    ],
    ['Clan Ammo LRM-15', 'ammo-lrm-15', 'clan-ammo-lrm-15-registry'],
    [
      'Clan Ammo LRM-15 (Clan) Artemis V-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'Clan Ammo LRM-15 (Clan) Artemis-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo LRM-15 - (Clan) Artemis V-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'Clan Ammo LRM-15 - (Clan) Artemis-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo LRM-2',
      'clan-ammo-protomech-lrm-2',
      'clan-ammo-protomech-lrm-2-registry',
    ],
    ['Clan Ammo LRM-20', 'ammo-lrm-20', 'clan-ammo-lrm-20-registry'],
    [
      'Clan Ammo LRM-20 (Clan) Artemis V-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'Clan Ammo LRM-20 (Clan) Artemis-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo LRM-20 - (Clan) Artemis V-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'Clan Ammo LRM-20 - (Clan) Artemis-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo LRM-3',
      'clan-ammo-protomech-lrm-3',
      'clan-ammo-protomech-lrm-3-registry',
    ],
    [
      'Clan Ammo LRM-4',
      'clan-ammo-protomech-lrm-4',
      'clan-ammo-protomech-lrm-4-registry',
    ],
    ['Clan Ammo LRM-5', 'ammo-lrm-5', 'clan-ammo-lrm-5-registry'],
    [
      'Clan Ammo LRM-6',
      'clan-ammo-protomech-lrm-6',
      'clan-ammo-protomech-lrm-6-registry',
    ],
    ['Clan Ammo SRM-2', 'ammo-srm-2', 'clan-ammo-srm-2-registry'],
    ['Clan Ammo SRM-4', 'ammo-srm-4', 'clan-ammo-srm-4-registry'],
    [
      'Clan Ammo SRM-4 (Clan) Artemis-capable',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo SRM-4 - (Clan) Artemis-capable',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    ['Clan Ammo SRM-6', 'ammo-srm-6', 'clan-ammo-srm-6-registry'],
    [
      'Clan Ammo SRM-6 (Clan) Artemis-capable',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    [
      'Clan Ammo SRM-6 - (Clan) Artemis-capable',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    ['Clan Ammo Ultra AC/10', 'uac-10-ammo', 'clan-ultra-ac-10-ammo-registry'],
    ['Clan Ammo Ultra AC/2', 'uac-2-ammo', 'clan-ultra-ac-2-ammo-registry'],
    ['Clan Ammo Ultra AC/20', 'uac-20-ammo', 'clan-ultra-ac-20-ammo-registry'],
    ['Clan Ammo Ultra AC/5', 'uac-5-ammo', 'clan-ultra-ac-5-ammo-registry'],
    [
      'Clan LB 10-X Cluster Ammo',
      'lb-10-x-cluster-ammo',
      'clan-lb-10-x-cluster-ammo-registry',
    ],
    [
      'Clan LB 20-X Cluster Ammo',
      'lb-20-x-cluster-ammo',
      'clan-lb-20-x-cluster-ammo-registry',
    ],
    [
      'Clan LRM 10 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 10 (Clan) Artemis-capable Ammo',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    ['Clan LRM 10 Ammo', 'ammo-lrm-10', 'clan-ammo-lrm-10-registry'],
    [
      'Clan LRM 10 Ammo (Clan) Artemis V-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 10 Ammo (Clan) Artemis-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'Clan LRM 10 Ammo - (Clan) Artemis V-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 10 Ammo - (Clan) Artemis-capable',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'Clan LRM 12 Ammo',
      'clan-ammo-protomech-lrm-12',
      'clan-ammo-protomech-lrm-12-registry',
    ],
    [
      'Clan LRM 15 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 15 (Clan) Artemis-capable Ammo',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    ['Clan LRM 15 Ammo', 'ammo-lrm-15', 'clan-ammo-lrm-15-registry'],
    [
      'Clan LRM 15 Ammo (Clan) Artemis V-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 15 Ammo (Clan) Artemis-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'Clan LRM 15 Ammo - (Clan) Artemis V-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 15 Ammo - (Clan) Artemis-capable',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'Clan LRM 2 Ammo',
      'clan-ammo-protomech-lrm-2',
      'clan-ammo-protomech-lrm-2-registry',
    ],
    [
      'Clan LRM 20 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 20 (Clan) Artemis-capable Ammo',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    ['Clan LRM 20 Ammo', 'ammo-lrm-20', 'clan-ammo-lrm-20-registry'],
    [
      'Clan LRM 20 Ammo (Clan) Artemis V-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 20 Ammo (Clan) Artemis-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'Clan LRM 20 Ammo - (Clan) Artemis V-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'Clan LRM 20 Ammo - (Clan) Artemis-capable',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'Clan LRM 3 Ammo',
      'clan-ammo-protomech-lrm-3',
      'clan-ammo-protomech-lrm-3-registry',
    ],
    [
      'Clan LRM 4 Ammo',
      'clan-ammo-protomech-lrm-4',
      'clan-ammo-protomech-lrm-4-registry',
    ],
    ['Clan LRM 5 Ammo', 'ammo-lrm-5', 'clan-ammo-lrm-5-registry'],
    [
      'Clan LRM 6 Ammo',
      'clan-ammo-protomech-lrm-6',
      'clan-ammo-protomech-lrm-6-registry',
    ],
    ['Clan SRM 1 Ammo', 'clan-ammo-srm-1', 'clan-ammo-srm-1-registry'],
    ['Clan SRM 2 Ammo', 'ammo-srm-2', 'clan-ammo-srm-2-registry'],
    ['Clan SRM 3 Ammo', 'clan-ammo-srm-3', 'clan-ammo-srm-3-registry'],
    [
      'Clan SRM 4 (Clan) Artemis-capable Ammo',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    ['Clan SRM 4 Ammo', 'ammo-srm-4', 'clan-ammo-srm-4-registry'],
    [
      'Clan SRM 4 Ammo (Clan) Artemis-capable',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    [
      'Clan SRM 4 Ammo - (Clan) Artemis-capable',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    ['Clan SRM 5 Ammo', 'clan-ammo-srm-5', 'clan-ammo-srm-5-registry'],
    [
      'Clan SRM 6 (Clan) Artemis-capable Ammo',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    ['Clan SRM 6 Ammo', 'ammo-srm-6', 'clan-ammo-srm-6-registry'],
    [
      'Clan SRM 6 Ammo (Clan) Artemis-capable',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    [
      'Clan SRM 6 Ammo - (Clan) Artemis-capable',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    ['Clan Ultra AC/10 Ammo', 'uac-10-ammo', 'clan-ultra-ac-10-ammo-registry'],
    ['Clan Ultra AC/2 Ammo', 'uac-2-ammo', 'clan-ultra-ac-2-ammo-registry'],
    ['Clan Ultra AC/20 Ammo', 'uac-20-ammo', 'clan-ultra-ac-20-ammo-registry'],
    ['Clan Ultra AC/5 Ammo', 'uac-5-ammo', 'clan-ultra-ac-5-ammo-registry'],
    ['Clan iATM-3 Ammo', 'clan-ammo-iatm-3', 'clan-ammo-iatm-3-registry'],
    [
      'Enhanced LRM 20 Artemis-capable Ammo',
      'enhancedlrm20',
      'isenhancedlrm20-ammo-artemis-capable-registry',
    ],
    ['HeavyNGauss Ammo', 'ammo-heavy-n-gauss', 'ammo-heavy-n-gauss-registry'],
    [
      'IS Ammo LRM-10 - Artemis-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-10 - Narc-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'IS Ammo LRM-10 Artemis-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-10 Narc-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'IS Ammo LRM-15 - Artemis-capable',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-15 Artemis-capable',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-20 - Artemis-capable',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-20 Artemis-capable',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-5 - Artemis-capable',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'IS Ammo LRM-5 Artemis-capable',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'IS Ammo SRM-2 - Narc-capable',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'IS Ammo SRM-2 Narc-capable',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'IS Ammo SRM-4 - Artemis-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'IS Ammo SRM-4 - Narc-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'IS Ammo SRM-4 Artemis-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'IS Ammo SRM-4 Narc-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'IS Ammo SRM-6 - Artemis-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'IS Ammo SRM-6 - Narc-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'IS Ammo SRM-6 Artemis-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'IS Ammo SRM-6 Narc-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'IS Artemis-capable Ammo LRM-10',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'IS Artemis-capable Ammo LRM-15',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'IS Artemis-capable Ammo LRM-20',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'IS Artemis-capable Ammo LRM-5',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'IS Artemis-capable Ammo SRM-4',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'IS Artemis-capable Ammo SRM-6',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'IS LRM 10 Ammo - Artemis-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'IS LRM 10 Ammo - Narc-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'IS LRM 10 Ammo Artemis-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'IS LRM 10 Ammo Narc-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'IS LRM 10 Artemis-capable Ammo',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'IS LRM 10 Narc-capable Ammo',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'IS LRM 15 Ammo - Artemis-capable',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'IS LRM 15 Ammo Artemis-capable',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'IS LRM 15 Artemis-capable Ammo',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'IS LRM 20 Ammo - Artemis-capable',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'IS LRM 20 Ammo Artemis-capable',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'IS LRM 20 Artemis-capable Ammo',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'IS LRM 5 Ammo - Artemis-capable',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'IS LRM 5 Ammo Artemis-capable',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'IS LRM 5 Artemis-capable Ammo',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'IS Narc-capable Ammo LRM-10',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'IS Narc-capable Ammo SRM-2',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'IS Narc-capable Ammo SRM-4',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'IS Narc-capable Ammo SRM-6',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'IS SRM 2 Ammo - Narc-capable',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'IS SRM 2 Ammo Narc-capable',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'IS SRM 2 Narc-capable Ammo',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'IS SRM 4 Ammo - Artemis-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'IS SRM 4 Ammo - Narc-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'IS SRM 4 Ammo Artemis-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'IS SRM 4 Ammo Narc-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'IS SRM 4 Artemis-capable Ammo',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'IS SRM 4 Narc-capable Ammo',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'IS SRM 6 Ammo - Artemis-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'IS SRM 6 Ammo - Narc-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'IS SRM 6 Ammo Artemis-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'IS SRM 6 Ammo Narc-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'IS SRM 6 Artemis-capable Ammo',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'IS SRM 6 Narc-capable Ammo',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'ISEnhancedLRM20 Ammo - Artemis-capable',
      'enhancedlrm20',
      'isenhancedlrm20-ammo-artemis-capable-registry',
    ],
    [
      'ISEnhancedLRM20 Ammo Artemis-capable',
      'enhancedlrm20',
      'isenhancedlrm20-ammo-artemis-capable-registry',
    ],
    [
      'ISEnhancedLRM20 Artemis-capable Ammo',
      'enhancedlrm20',
      'isenhancedlrm20-ammo-artemis-capable-registry',
    ],
    ['ISLBXAC2 Ammo', 'lb-2-x-ammo', 'is-lb-2-x-ac-ammo-registry'],
    ['ISLBXAC5 Ammo', 'lb-5-x-ammo', 'is-lb-5-x-ac-ammo-registry'],
    [
      'ISLRM10 Ammo - Artemis-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'ISLRM10 Ammo - Narc-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'ISLRM10 Ammo Artemis-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'ISLRM10 Ammo Narc-capable',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'ISLRM10 Artemis-capable Ammo',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'ISLRM10 Narc-capable Ammo',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'ISLRM15 Ammo - Artemis-capable',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'ISLRM15 Ammo Artemis-capable',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'ISLRM15 Artemis-capable Ammo',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'ISLRM20 Ammo - Artemis-capable',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'ISLRM20 Ammo Artemis-capable',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'ISLRM20 Artemis-capable Ammo',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'ISLRM5 Ammo - Artemis-capable',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'ISLRM5 Ammo Artemis-capable',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'ISLRM5 Artemis-capable Ammo',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    [
      'ISSRM2 Ammo - Narc-capable',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'ISSRM2 Ammo Narc-capable',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'ISSRM2 Narc-capable Ammo',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'ISSRM4 Ammo - Artemis-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'ISSRM4 Ammo - Narc-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'ISSRM4 Ammo Artemis-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'ISSRM4 Ammo Narc-capable',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'ISSRM4 Artemis-capable Ammo',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'ISSRM4 Narc-capable Ammo',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'ISSRM6 Ammo - Artemis-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'ISSRM6 Ammo - Narc-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'ISSRM6 Ammo Artemis-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'ISSRM6 Ammo Narc-capable',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'ISSRM6 Artemis-capable Ammo',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'ISSRM6 Narc-capable Ammo',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    [
      'LRM 10 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-v-capable-registry',
    ],
    [
      'LRM 10 (Clan) Artemis-capable Ammo',
      'ammo-lrm-10',
      'clan-ammo-lrm-10-clan-artemis-capable-registry',
    ],
    [
      'LRM 10 Artemis-capable Ammo',
      'ammo-lrm-10',
      'is-ammo-lrm-10-artemis-capable-registry',
    ],
    [
      'LRM 10 Narc-capable Ammo',
      'ammo-lrm-10',
      'is-ammo-lrm-10-narc-capable-registry',
    ],
    [
      'LRM 15 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-v-capable-registry',
    ],
    [
      'LRM 15 (Clan) Artemis-capable Ammo',
      'ammo-lrm-15',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
    ],
    [
      'LRM 15 Artemis-capable Ammo',
      'ammo-lrm-15',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    [
      'LRM 20 (Clan) Artemis V-capable Ammo',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-v-capable-registry',
    ],
    [
      'LRM 20 (Clan) Artemis-capable Ammo',
      'ammo-lrm-20',
      'clan-ammo-lrm-20-clan-artemis-capable-registry',
    ],
    [
      'LRM 20 Artemis-capable Ammo',
      'ammo-lrm-20',
      'is-ammo-lrm-20-artemis-capable-registry',
    ],
    [
      'LRM 5 Artemis-capable Ammo',
      'ammo-lrm-5',
      'is-ammo-lrm-5-artemis-capable-registry',
    ],
    ['LightNGauss Ammo', 'ammo-light-n-gauss', 'ammo-light-n-gauss-registry'],
    [
      'MediumNGauss Ammo',
      'ammo-medium-n-gauss',
      'ammo-medium-n-gauss-registry',
    ],
    ['NAC10 Ammo', 'ammo-nac-10', 'ammo-nac-10-registry'],
    ['NAC20 Ammo', 'ammo-nac-20', 'ammo-nac-20-registry'],
    ['NAC25 Ammo', 'ammo-nac-25', 'ammo-nac-25-registry'],
    ['NAC30 Ammo', 'ammo-nac-30', 'ammo-nac-30-registry'],
    ['NAC35 Ammo', 'ammo-nac-35', 'ammo-nac-35-registry'],
    ['NAC40 Ammo', 'ammo-nac-40', 'ammo-nac-40-registry'],
    [
      'SRM 2 Narc-capable Ammo',
      'ammo-srm-2',
      'is-ammo-srm-2-narc-capable-registry',
    ],
    [
      'SRM 4 (Clan) Artemis-capable Ammo',
      'ammo-srm-4',
      'clan-ammo-srm-4-clan-artemis-capable-registry',
    ],
    [
      'SRM 4 Artemis-capable Ammo',
      'ammo-srm-4',
      'is-ammo-srm-4-artemis-capable-registry',
    ],
    [
      'SRM 4 Narc-capable Ammo',
      'ammo-srm-4',
      'is-ammo-srm-4-narc-capable-registry',
    ],
    [
      'SRM 6 (Clan) Artemis-capable Ammo',
      'ammo-srm-6',
      'clan-ammo-srm-6-clan-artemis-capable-registry',
    ],
    [
      'SRM 6 Artemis-capable Ammo',
      'ammo-srm-6',
      'is-ammo-srm-6-artemis-capable-registry',
    ],
    [
      'SRM 6 Narc-capable Ammo',
      'ammo-srm-6',
      'is-ammo-srm-6-narc-capable-registry',
    ],
    ['clan-ammo-lrm-10', 'ammo-lrm-10', 'clan-ammo-lrm-10-registry'],
    ['clan-ammo-lrm-15', 'ammo-lrm-15', 'clan-ammo-lrm-15-registry'],
    ['clan-ammo-lrm-20', 'ammo-lrm-20', 'clan-ammo-lrm-20-registry'],
    ['clan-ammo-lrm-5', 'ammo-lrm-5', 'clan-ammo-lrm-5-registry'],
    ['clan-ammo-srm-2', 'ammo-srm-2', 'clan-ammo-srm-2-registry'],
    ['clan-ammo-srm-4', 'ammo-srm-4', 'clan-ammo-srm-4-registry'],
    ['clan-ammo-srm-6', 'ammo-srm-6', 'clan-ammo-srm-6-registry'],
    [
      'clan-lb-10-x-cluster-ammo',
      'lb-10-x-cluster-ammo',
      'clan-lb-10-x-cluster-ammo-registry',
    ],
    [
      'clan-lb-20-x-cluster-ammo',
      'lb-20-x-cluster-ammo',
      'clan-lb-20-x-cluster-ammo-registry',
    ],
    ['clan-ultra-ac-10-ammo', 'uac-10-ammo', 'clan-ultra-ac-10-ammo-registry'],
    ['clan-ultra-ac-2-ammo', 'uac-2-ammo', 'clan-ultra-ac-2-ammo-registry'],
    ['clan-ultra-ac-20-ammo', 'uac-20-ammo', 'clan-ultra-ac-20-ammo-registry'],
    ['clan-ultra-ac-5-ammo', 'uac-5-ammo', 'clan-ultra-ac-5-ammo-registry'],
    ['clrotaryac2-ammo', 'rotaryac2', 'clrotaryac2-ammo-registry'],
    ['clrotaryac5-ammo', 'rotaryac5', 'clrotaryac5-ammo-registry'],
    [
      'is-streak-srm-2-ammo',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
    ],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason:
      'Follow-up 93; a slot-less ammo bin takes the BV owner pinned AmmoType record (resolveSlotlessAmmo), unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93 / FU-101 class B: list ids and crit tokens of one mount reach the pinned Java item (ISSniper/ISThumper artillery, AC/10 Primitive, CLWERPPC, CLHeavyFlamer).
  ...[
    ['ISSniper', 'sniper-cannon', 'issniper-registry'],
    ['ISThumper', 'thumper-cannon', 'isthumper-registry'],
    ['ac-10p', 'ac-10', 'autocannon-10-primitive-registry'],
    ['enhanced-ppc', 'enhanced-er-ppc', 'clwerppc-registry'],
    ['heavy-flamer', 'heavy-flamer', 'clheavyflamer-registry'],
    ['issniper', 'sniper-cannon', 'issniper-registry'],
    ['isthumper', 'thumper-cannon', 'isthumper-registry'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // FU-101 mortar slice: on Clan units mech-mortar-8 reaches Java's Clan Mech Mortar-8 (5 t, 3 slots) instead of the stale 10 t record.
  ...[
    ['mech-mortar-8', 'clan-mech-mortar-8', 'clan-mech-mortar-8-registry'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // FU-101: the TSEMP One-Shot list slug loads Java's ISTSEMPOneShot (4 t, 3 slots), not the TSEMP Cannon.
  ...[['tsemp-one-shot', 'tsemp-cannon', 'tsemp-one-shot-registry']].map(
    ([name, oldTarget, newTarget, api]) => ({
      name,
      oldTarget,
      newTarget,
      ...(api ? { api } : {}),
      reason:
        'Follow-up 93; registry-routing.json techRoutes, unit loader only',
      loaderOnly: true,
    }),
  ),
  // VEH-WEIGHT #2744: the Clan armored motive system token loads Java's CLArmoredMotiveSystem (10%), not the IS record.
  ...[
    [
      'CLArmoredMotiveSystem',
      'armoredmotivesystem',
      'clarmoredmotivesystem-registry',
    ],
    [
      'clarmoredmotivesystem',
      'armoredmotivesystem',
      'clarmoredmotivesystem-registry',
    ],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 93 / VEH-WEIGHT residual: the list id islongtom (ISLongTom) is MegaMek 48fcb2f6's 30 t Long Tom artillery (LongTom.java:58,71), not the 20 t Long Tom Cannon; a loader-only techRoute sends it to islongtom-registry. BV already scores it at 368.
  ...[
    ['ISLongTom', 'long-tom', 'islongtom-registry'],
    ['islongtom', 'long-tom', 'islongtom-registry'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // Follow-up 102 / 113: MegaMek 48fcb2f6 CLRocketLauncher10Prototype / 15Prototype are the prototype rocket launchers (PrototypeRL15.java:54-57,77-83; introduced 2095), not production RL/10 / RL/15 (3064). Loader-only techRoutes send the list slug and the crit token to the registry records together; tons and slots are unchanged and BV already scores the prototypes.
  ...[
    [
      'CLRocketLauncher10Prototype',
      'rl10',
      'clrocketlauncher10prototype-registry',
    ],
    [
      'CLRocketLauncher15Prototype',
      'rl15',
      'clrocketlauncher15prototype-registry',
    ],
    [
      'clrocketlauncher10prototype',
      'rl10',
      'clrocketlauncher10prototype-registry',
    ],
    [
      'clrocketlauncher15prototype',
      'rl15',
      'clrocketlauncher15prototype-registry',
    ],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
  // VEH-WEIGHT identity: decorated IS machine gun array list ids (the BLK (ST) suffix islmgast / ismgast and the islmga:omni pod marker) are MegaMek 48fcb2f6 ISLMGA / ISMGA at 0.5 t (ISLightMGA.java:69,82; ISMGA.java:70,83), not the 0.25 t Clan arrays. Loader-only techRoutes send them to the existing IS registry records.
  ...[
    ['ISLMGA:OMNI', 'lmga', 'islmga-registry'],
    ['islmga:omni', 'lmga', 'islmga-registry'],
    ['islmgast', 'lmga', 'islmga-registry'],
    ['ismgast', 'mga', 'ismga-registry'],
  ].map(([name, oldTarget, newTarget, api]) => ({
    name,
    oldTarget,
    newTarget,
    ...(api ? { api } : {}),
    reason: 'Follow-up 93; registry-routing.json techRoutes, unit loader only',
    loaderOnly: true,
  })),
];
async function capture(root, inputs) {
  process.chdir(root);
  const require = createRequire(resolve(root, 'package.json'));
  require('tsx/cjs');
  globalThis.fetch = async (input) => {
    const file = resolve(
      root,
      'public',
      '.' + new URL(String(input), 'http://local').pathname,
    );
    return { ok: true, status: 200, json: async () => read(file) };
  };
  const bv = require(resolve(root, 'src/utils/construction/equipmentBV'));
  const catalogsLoader = require(
    resolve(root, 'src/utils/construction/equipmentBV/catalogLoader'),
  );
  const { TechBase } = require(resolve(root, 'src/types/enums/TechBase'));
  const catalogs = require(
    resolve(root, 'src/utils/construction/equipmentBVCatalogData'),
  );
  const { getEquipmentRegistry } = require(
    resolve(root, 'src/services/equipment/EquipmentRegistry'),
  );
  const { getEquipmentLoader } = require(
    resolve(root, 'src/services/equipment/EquipmentLoaderService'),
  );
  const { EquipmentNameMapper } = require(
    resolve(root, 'src/services/equipment/EquipmentNameMapper'),
  );
  const { EquipmentNameResolver } = require(
    resolve(root, 'src/services/conversion/EquipmentNameResolver'),
  );
  const conversion = new EquipmentNameResolver();
  const aliases = require(resolve(root, 'src/services/equipment/aliases'));
  const patterns = require(
    resolve(root, 'src/utils/construction/equipmentBV/normalizationPatterns'),
  );
  const { getWeaponData } = require(
    resolve(root, 'src/engine/adapters/CompendiumAdapter.weaponData'),
  );
  const hydration = require(
    resolve(root, 'src/simulation/runner/UnitHydrationCatalogLookup'),
  );
  const { catalogWeaponStatsForEquipmentEntry } = require(
    resolve(root, 'src/simulation/runner/UnitHydrationArtemis'),
  );
  const printing = require(
    resolve(root, 'src/services/printing/recordsheet/equipmentUtils'),
  );
  const { getEquipmentLookupService } = require(
    resolve(root, 'src/services/equipment/EquipmentLookupService'),
  );
  const { restoreCriticalSlotEquipment } = require(
    resolve(root, 'src/services/units/unitLoaderService/criticalSlotEquipment'),
  );
  const { resolveEquipmentId } = require(
    resolve(root, 'src/services/units/unitLoaderService/equipmentResolution'),
  );
  const registry = getEquipmentRegistry();
  assert.equal(await registry.initialize(), 'ready');
  await getEquipmentLookupService().initialize();
  const loader = getEquipmentLoader(),
    mapper = new EquipmentNameMapper();
  // Probe the corpus names, every baseline name and (below) catalog names.
  const probes = resolve(here, 'resolution-inputs.json');
  const names = new Set([
    ...(inputs.names ?? []),
    ...Object.keys(inputs.resolved ?? {}),
    ...(existsSync(probes) ? read(probes).names : []),
  ]);
  for (const name of Object.keys(conversion.getMappings())) names.add(name);
  const generatedAliases = new Map();
  const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [kind, items] of [
    ['weapon', loader.getAllWeapons()],
    ['ammo', loader.getAllAmmunition()],
    ['electronics', loader.getAllElectronics()],
    ['misc', loader.getAllMiscEquipment()],
  ])
    for (const item of items) {
      names.add(item.id);
      names.add(item.name);
      names.add(normalize(item.name));
      if (kind === 'weapon')
        aliases.addCommonWeaponAliases(
          item.id,
          item.name,
          item,
          generatedAliases,
          normalize,
        );
      if (kind === 'ammo')
        aliases.addAmmunitionAliases(item, generatedAliases, normalize);
      if (kind === 'misc')
        aliases.addMiscEquipmentAliases(item, generatedAliases);
    }
  aliases.addStaticAliasMappings(generatedAliases);
  for (const name of [
    ...generatedAliases.keys(),
    ...Object.keys(catalogs.NAME_MAPPINGS_DATA),
    ...Object.keys(patterns.DIRECT_ALIAS_MAP),
    ...Object.keys(patterns.ABBREVIATION_MAP),
  ])
    names.add(name);
  const weapons = hydration.buildWeaponLookupFromCatalogFiles(
    catalogs.WEAPON_CATALOG_FILES,
  );
  const ammo = hydration.buildAmmoLookupFromCatalogFiles(
    catalogs.AMMUNITION_CATALOG_FILES,
  );
  const apis = {
    unitLoaderIS: (name) =>
      resolveEquipmentId(name, TechBase.INNER_SPHERE, 'inner_sphere', undefined)
        .equipmentDef?.id,
    unitLoaderClan: (name) =>
      resolveEquipmentId(name, TechBase.CLAN, 'clan', undefined).equipmentDef
        ?.id,
    unitLoaderMixed: (name) =>
      resolveEquipmentId(name, TechBase.INNER_SPHERE, 'mixed', [name])
        .equipmentDef?.id,
    unitLoaderAmmoIS: (name) =>
      restoreCriticalSlotEquipment(
        [],
        [],
        TechBase.INNER_SPHERE,
        'inner_sphere',
        { RIGHT_TORSO: [name] },
      )[0]?.equipmentId,
    unitLoaderAmmoClan: (name) =>
      restoreCriticalSlotEquipment([], [], TechBase.CLAN, 'clan', {
        RIGHT_TORSO: [name],
      })[0]?.equipmentId,
    normalizer: (name) => {
      const id = bv.normalizeEquipmentId(name);
      return catalogsLoader.loadCatalogForEquipmentId(name).has(id) ? id : null;
    },
    equipment: (name) => bv.getEquipmentEntry(name)?.id,
    ammunition: (name) => bv.getAmmunitionEntry(name)?.id,
    physicalAmmo: (name) => bv.getAmmunitionWeightEntry(name)?.id,
    registry: (name) => registry.lookup(name).equipment?.id,
    mapper: (name) => mapper.mapName(name).equipmentId,
    mapperIS: (name) => mapper.mapName(name, TechBase.INNER_SPHERE).equipmentId,
    mapperClan: (name) => mapper.mapName(name, TechBase.CLAN).equipmentId,
    conversion: (name) => conversion.resolve(name, name).equipmentId,
    conversionIS: (name) =>
      conversion.resolve(name, name, TechBase.INNER_SPHERE).equipmentId,
    conversionClan: (name) =>
      conversion.resolve(name, name, TechBase.CLAN).equipmentId,
    compendium: (name) => getWeaponData(name)?.id,
    hydrationWeapon: (name) => weapons(name)?.id,
    hydrationAmmo: (name) => ammo(name)?.id,
    hydrationEquipment: (name) =>
      catalogWeaponStatsForEquipmentEntry({ id: name }, weapons)?.id,
    printingWeapon: (name) =>
      printing.lookupWeapon(loader.getAllWeapons(), name)?.id,
    printingWeaponExact: (name) =>
      printing.lookupWeapon(loader.getAllWeapons(), name, undefined, false)?.id,
    printingWeaponId: (name) =>
      printing.lookupWeapon(loader.getAllWeapons(), name, name)?.id,
    printingAmmo: (name) =>
      printing.lookupAmmoShots(
        loader
          .getAllAmmunition()
          .map((item) => ({ ...item, shotsPerTon: item.id })),
        name,
        name,
      ),
    printingAmmoShots: (name) =>
      printing.lookupAmmoShots(loader.getAllAmmunition(), name, name),
  };
  const ordered = [...names]
    .filter((name) => typeof name === 'string' && name.trim())
    .sort();
  // Lookups run API by API as before; the snapshot keeps only resolved
  // entries, keyed by name, as { target: [indexes into apis] }. Object keys
  // are strings, so a non-string target (printingAmmoShots' shot counts) is
  // stored as `#<json>`; a 15 -> "15" type change then shows as a shift.
  const results = Object.values(apis).map((lookup) =>
    ordered.map((name) => lookup(name) ?? null),
  );
  const targetKey = (target) =>
    typeof target === 'string' ? target : `#${JSON.stringify(target)}`;
  const resolved = {};
  ordered.forEach((name, i) => {
    const row = {};
    results.forEach((rows, k) => {
      if (rows[i] !== null) (row[targetKey(rows[i])] ??= []).push(k);
    });
    if (Object.keys(row).length) resolved[name] = row;
  });
  const generated = ['weapons', 'ammunition', 'miscellaneous'].flatMap(
    (kind) => {
      const file = resolve(
        root,
        `public/data/equipment/official/${kind}/java-registry.json`,
      );
      return existsSync(file)
        ? read(file).items.map((item) => ({ kind, id: item.id }))
        : [];
    },
  );
  const generatedIds = new Set(generated.map((item) => item.id));
  const provenanceFile = resolve(
    root,
    'scripts/equipment-catalog/provenance.json',
  );
  const identities = new Map(
    existsSync(provenanceFile)
      ? read(provenanceFile).identities.map((row) => [row.id, row.internalName])
      : [],
  );
  const directFailures = [],
    fallbackLeaks = [];
  for (const { kind, id } of generated) {
    const ownApis = [
      'normalizer',
      'equipment',
      'registry',
      'mapper',
      'conversion',
      ...(kind === 'weapons'
        ? [
            'compendium',
            'hydrationWeapon',
            'hydrationEquipment',
            'printingWeaponId',
          ]
        : kind === 'ammunition'
          ? ['ammunition', 'hydrationAmmo', 'printingAmmo']
          : []),
    ];
    for (const api of ownApis) {
      const target = apis[api](id);
      if (target !== id) directFailures.push({ api, id, target });
    }
    const native = identities.get(id) ?? id;
    if (
      kind === 'weapons' &&
      apis.printingWeapon(native) === id &&
      apis.printingWeaponExact(native) !== id
    )
      directFailures.push({
        api: 'printingWeaponExact',
        id,
        name: native,
        target: apis.printingWeaponExact(native),
      });
    for (const name of [
      `1-${id}`,
      `clan-${id}`,
      `similar ${id}`,
      `clan-${native}`,
      `CL${native}`,
    ]) {
      for (const [api, lookup] of Object.entries(apis)) {
        const target = lookup(name);
        if (
          generatedIds.has(target) &&
          catalogs.resolveRegistryId?.(name) !== target
        )
          fallbackLeaks.push({ api, name, target });
      }
      for (const target of registry.lookup(name).alternateIds ?? [])
        if (generatedIds.has(target))
          fallbackLeaks.push({ api: 'findSimilar', name, target });
    }
  }
  // Synthetic registry responses exercise boundaries that real catalog names
  // alone cannot cover, including the Missing Special Ammo regression.
  const service = getEquipmentLookupService();
  const originals = [service.getById, service.getAllEquipment, registry.lookup];
  const categoryFailures = [];
  try {
    for (const [name, candidate] of [
      ['Missing Special Ammo', originals[0].call(service, 'medium-laser')],
      [
        'Missing Special Weapon',
        service
          .getAllEquipment()
          .find((item) => item.category === 'Ammunition'),
      ],
      ...generated.map(({ id }) => [
        'Missing Special Weapon',
        originals[0].call(service, id),
      ]),
    ]) {
      assert(candidate, `Missing category probe candidate: ${name}`);
      service.getById = (id) =>
        name.endsWith('Ammo') || id === candidate.id ? candidate : undefined;
      service.getAllEquipment = () => [candidate];
      registry.lookup = () => ({ found: true, equipment: candidate });
      for (const api of ['unitLoaderIS', 'unitLoaderClan', 'unitLoaderMixed']) {
        const target = apis[api](name);
        if (target)
          categoryFailures.push({ api, name, candidate: candidate.id, target });
      }
    }
  } finally {
    [service.getById, service.getAllEquipment, registry.lookup] = originals;
  }
  return {
    baseline: inputs.baseline,
    provenance: inputs.provenance,
    apis: Object.keys(apis),
    resolved,
    directFailures,
    fallbackLeaks,
    categoryFailures,
  };
}

if (process.argv.includes('--capture')) {
  const output = resolve(option('--output'));
  const snapshot = await capture(
    resolve(option('--root')),
    read(option('--inputs')),
  );
  writeFileSync(output, JSON.stringify(snapshot) + '\n');
} else {
  // Pinned MegaMek 48fcb2f64; native identity constructors and runtime probe
  // (ParityCatalogProbe.java, retained with the 2.1-b evidence).
  const parityInfantryAndBA = [
    [
      'aa-weapon-mk.-1,-light',
      'aa-weapon-mk-1-light-registry',
      0.7,
      0.005,
      0,
      'BOTH',
    ],
    [
      'aa-weapon-mk.-2,-man-portable',
      'aa-weapon-mk-2-man-portable-registry',
      4.14,
      0.035,
      0,
      'BOTH',
    ],
    [
      'auto-pistol-m&g',
      'auto-pistol-m-g-registry',
      0.16,
      0.00065,
      0,
      'INNER_SPHERE',
    ],
    [
      'gauss-rifle,-light-david',
      'gauss-rifle-light-david-registry',
      4.01,
      0.018,
      0,
      'INNER_SPHERE',
    ],
    [
      'laser-rifle-er-[sunbeam-starfire]',
      'laser-rifle-er-sunbeam-starfire-registry',
      2.01,
      0.005,
      0,
      'INNER_SPHERE',
    ],
    [
      'needler,-support-firedrake',
      'needler-support-firedrake-registry',
      6.13,
      0.025,
      0,
      'INNER_SPHERE',
    ],
    [
      'needler-rifle-m&g-flechette',
      'needler-rifle-m-g-flechette-registry',
      0.1,
      0.0015,
      0,
      'BOTH',
    ],
    [
      'pistol-sternsnacht-heavy-[claymore]',
      'pistol-sternsnacht-heavy-claymore-registry',
      0.08,
      0.0025,
      0,
      'INNER_SPHERE',
    ],
    [
      'pulse-laser-rifle-is',
      'pulse-laser-rifle-inner-sphere-registry',
      0.76,
      0.005,
      0,
      'BOTH',
    ],
    [
      'rifle-m&g-g-150',
      'rifle-m-g-g-150-registry',
      1.64,
      0.0035,
      0,
      'INNER_SPHERE',
    ],
    [
      'support-laser-er,-is',
      'support-laser-er-is-registry',
      8.21,
      0.11,
      0,
      'INNER_SPHERE',
    ],
    [
      'support-laser-er,-semi-portable',
      'support-laser-er-semi-portable-registry',
      5.02,
      0.025,
      0,
      'CLAN',
    ],
    [
      'support-laser-er-heavy,-clan',
      'support-laser-er-heavy-clan-registry',
      18.52,
      0.24,
      0,
      'CLAN',
    ],
    ['isbalightactiveprobe', 'active-probe-light', 0, 0.25, 2, 'INNER_SPHERE'],
  ];
  for (const [
    input,
    id,
    battleValue,
    weight,
    criticalSlots,
    techBase,
  ] of parityInfantryAndBA) {
    test(`parity 2.1-b.1 resolves ${input} to its pinned identity`, () => {
      const require = createRequire(resolve(process.cwd(), 'package.json'));
      require('tsx/cjs');
      const { getEquipmentEntry, resolveAmmoBV } = require(
        resolve(process.cwd(), 'src/utils/construction/equipmentBV'),
      );
      for (const name of [input, input.toUpperCase()]) {
        const entry = getEquipmentEntry(name);
        assert.ok(entry, name);
        assert.deepEqual(
          {
            id: entry.id,
            battleValue: entry.battleValue,
            weight: entry.weight,
            criticalSlots: entry.criticalSlots,
            techBase: entry.techBase,
          },
          { id, battleValue, weight, criticalSlots, techBase },
          name,
        );
        assert.equal(
          resolveAmmoBV(name).resolved,
          false,
          `${name} is not ammunition`,
        );
      }
    });
  }
  test('parity 2.1-b.1 preserves the BA probe values and corrects its pinned rules level', () => {
    const data = read(
      resolve(
        process.cwd(),
        'public/data/equipment/official/electronics/active-probe.json',
      ),
    );
    const item = data.items.find((item) => item.id === 'active-probe-light');
    assert.deepEqual(
      {
        weight: item.weight,
        criticalSlots: item.criticalSlots,
        battleValue: item.battleValue,
        rulesLevel: item.rulesLevel,
        introductionYear: item.introductionYear,
      },
      {
        weight: 0.25,
        criticalSlots: 2,
        battleValue: 0,
        rulesLevel: 'STANDARD',
        introductionYear: 3050,
      },
      'MiscType.java:10941-10965 at 48fcb2f64',
    );
  });

  test('every previously resolved catalog/native input retains its API identity', async (t) => {
    const beforeFile =
      process.env.CATALOG_RESOLUTION_BEFORE ??
      resolve(here, 'resolution-before.json');
    const before = read(beforeFile);
    // #2607 strips the pod (OMNIPOD) and rear markers from a critical-slot token
    // before lookup, as Java MtfFile.java:1010-1020 does, so a pod-mounted form
    // follows its bare name's approved reroute.
    const require = createRequire(resolve(process.cwd(), 'package.json'));
    require('tsx/cjs');
    const { parseCriticalSlotToken } = require(
      resolve(
        process.cwd(),
        'src/services/units/unitLoaderService/equipmentResolution',
      ),
    );
    const bareName = (name) => parseCriticalSlotToken(name).lookupToken;
    const file =
      process.env.CATALOG_RESOLUTION_AFTER ??
      resolve(tmpdir(), `catalog-resolution-${process.pid}.json`);
    if (!process.env.CATALOG_RESOLUTION_AFTER)
      t.after(() => {
        for (const path of [file, file.slice(0, -5) + '-shifts.json'])
          if (existsSync(path)) unlinkSync(path);
      });
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        '--capture',
        '--root',
        process.cwd(),
        '--inputs',
        beforeFile,
        '--output',
        file,
      ],
      { encoding: 'utf8', maxBuffer: 20e6, windowsHide: true },
    );
    assert.equal(result.status, 0, result.stderr);
    const after = read(file);
    // Target of (api, name) in a compact snapshot, or undefined if unresolved.
    const targetOf = (snapshot, api, name) =>
      Object.entries(snapshot.resolved[name] ?? {}).find(([, used]) =>
        used.includes(snapshot.apis.indexOf(api)),
      )?.[0];
    assert.deepEqual(
      after.directFailures,
      [],
      'Every generated id resolves exactly',
    );
    assert.deepEqual(
      after.fallbackLeaks,
      [],
      'Generated entries never join fallback candidates',
    );
    assert.deepEqual(
      after.categoryFailures,
      [],
      'Registry recovery preserves category and generated-entry boundaries',
    );
    const shifts = [],
      allowed = [],
      gains = {};
    const check = (api, name, oldTarget, newTarget) => {
      // Weapon-only APIs can retain a gun sharing an old ammo id. The canonical
      // equipment/ammo assertions below require the five exact new ammo/artillery targets.
      if (newTarget === oldTarget) return;
      const route = APPROVED_JAVA_REROUTES.find(
        (route) =>
          (!route.api || route.api === api) &&
          route.name.toLowerCase() ===
            (route.literalName ? name : bareName(name)).toLowerCase() &&
          route.oldTarget === oldTarget,
      );
      const row = { api, name, oldTarget, newTarget };
      // loaderOnly (follow-up 93 tech routes): the unit loader knows the tech base;
      // tech-less APIs must keep their target.
      if (
        route &&
        newTarget === route.newTarget &&
        (!route.loaderOnly || api.startsWith('unitLoader'))
      )
        allowed.push(row);
      else shifts.push(row);
    };
    for (const [name, row] of Object.entries(before.resolved))
      for (const [oldTarget, used] of Object.entries(row))
        for (const k of used) {
          const api = before.apis[k];
          check(api, name, oldTarget, targetOf(after, api, name) ?? null);
        }
    for (const [name, row] of Object.entries(after.resolved))
      for (const [newTarget, used] of Object.entries(row))
        for (const k of used) {
          const api = after.apis[k];
          if (targetOf(before, api, name) !== undefined) continue;
          // #2607 strips pod/rear markers in critical-slot lookup, so a newly
          // resolved pod-qualified slot is checked against its bare name's old
          // target (#2613), not counted as a gain.
          const bare = api.startsWith('unitLoaderAmmo')
            ? targetOf(before, api, bareName(name))
            : undefined;
          if (bare !== undefined) check(api, name, bare, newTarget);
          else gains[api] = (gains[api] ?? 0) + 1;
        }
    writeFileSync(
      file.replace(/\.json$/, '-shifts.json'),
      JSON.stringify({ shifts, allowed, gains }, null, 2) + '\n',
    );
    for (const route of APPROVED_JAVA_REROUTES) {
      if (route.tagForm || route.loaderOnly) continue;
      if (route.api) {
        assert.equal(
          targetOf(after, route.api, route.name),
          route.newTarget ?? undefined,
          route.api + ' ' + route.name,
        );
        continue;
      }
      assert.equal(
        targetOf(after, 'equipment', route.name),
        route.newTarget ?? undefined,
        route.name,
      );
      if (!route.weapon)
        assert.equal(
          targetOf(after, 'ammunition', route.name),
          route.newTarget,
          route.name,
        );
    }
    for (const name of [
      'IS LB 2-X AC Ammo',
      'IS LB 5-X AC Ammo',
      'IS LB 5-X Cluster Ammo',
    ])
      for (const api of ['unitLoaderAmmoIS', 'unitLoaderAmmoClan']) {
        assert.equal(
          targetOf(after, api, `${name} (OMNIPOD)`),
          targetOf(after, api, name),
          `${api} ${name} (OMNIPOD) follows its bare form`,
        );
        assert.ok(
          targetOf(before, api, `${name} (OMNIPOD)`) !== undefined ||
            allowed.some(
              (row) => row.api === api && row.name === `${name} (OMNIPOD)`,
            ),
          `${api} ${name} (OMNIPOD) is guarded by the baseline, not a gain`,
        );
      }
    assert.deepEqual(shifts, [], JSON.stringify(shifts.slice(0, 30), null, 2));
  });
}
