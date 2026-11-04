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
// These five Java identities are the coordinator-approved exceptions. All other
// previously resolved inputs, including consumer fallback results, are frozen.
export const APPROVED_JAVA_REROUTES = [
  ...[
    [
      '(R) IS Streak SRM 2 Ammo:50',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
    ],
    [
      '(R) IS Streak SRM 4 Ammo:75',
      'clan-streak-srm-4',
      'is-streak-srm-4-ammo-registry',
    ],
    ['IS LB 2-X AC Ammo:OMNI', 'lb-2-x-ammo', 'is-lb-2-x-ac-ammo-registry'],
    [
      'IS LB 2-X Cluster Ammo:OMNI',
      'clan-lb-2-x-cluster',
      'is-lb-2-x-cluster-ammo-registry',
    ],
    [
      'IS Streak SRM 2 Ammo:100',
      'streak-srm-ammo',
      'is-streak-srm-2-ammo-registry',
    ],
  ].map(([name, oldTarget, newTarget]) => ({
    name,
    oldTarget,
    newTarget,
    literalName: true,
    reason:
      'Opus G2-O4 exact qualified AmmoType identity; pin 48fcb2f64 AmmoType.java, LB2-X:5105-5115; Streak2:10628',
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
          route.name.toLowerCase() ===
            (route.literalName ? name : bareName(name)).toLowerCase() &&
          route.oldTarget === oldTarget,
      );
      const row = { api, name, oldTarget, newTarget };
      if (route && newTarget === route.newTarget) allowed.push(row);
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
      if (route.tagForm) continue;
      assert.equal(
        targetOf(after, 'equipment', route.name),
        route.newTarget,
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
