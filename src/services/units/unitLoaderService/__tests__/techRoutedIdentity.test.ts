import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import banshee from '../../../../../public/data/units/battlemechs/1-age-of-war/standard/Banshee BNC-1E.json';
import cestus from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/Cestus CTS-6Y-EC.json';
import emperor from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/Emperor EMP-6A-EC.json';
import enfield from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/Enfield END-6J-EC.json';
import arcticWolf2 from '../../../../../public/data/units/battlemechs/4-clan-invasion/advanced/Arctic Wolf 2.json';
import champion from '../../../../../public/data/units/battlemechs/4-clan-invasion/advanced/Champion CHP-3P.json';
import crossbowC from '../../../../../public/data/units/battlemechs/4-clan-invasion/advanced/Crossbow C.json';
import daishiC from '../../../../../public/data/units/battlemechs/4-clan-invasion/advanced/Daishi C.json';
import avatar from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/Avatar AV1-OU.json';
import bombardier from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/Bombardier BMB-14K.json';
import flea from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/Flea FLE-19.json';
import linebackerF from '../../../../../public/data/units/battlemechs/5-civil-war/experimental/Linebacker F.json';
import cauldronBorn from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Cauldron-Born U.json';
import pariahAZ from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Pariah (Septicemia) A-Z.json';
import assassin from '../../../../../public/data/units/battlemechs/6-dark-age/advanced/Assassin ASN-109.json';
import crossbowT from '../../../../../public/data/units/battlemechs/6-dark-age/advanced/Crossbow T.json';
import scarecrow from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json';
import { resolveEquipmentId } from '../equipmentResolution';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const IS = [TechBase.INNER_SPHERE, TechBaseMode.INNER_SPHERE] as const;
const CLAN = [TechBase.CLAN, TechBaseMode.CLAN] as const;

// Follow-up 93. The converter's list id (lrt-15) and the MTF crit token
// (LRT 15 / CLLRT15) name one pinned MegaMek 48fcb2f6 item, chosen by tech:
// java-registry.json.lookups.json "LRT 15" -> IS "LRT 15", CLAN "CLLRT15".
it.each([
  ['lrt-5', IS, 'lrt-5-registry'],
  ['LRT 5', IS, 'lrt-5-registry'],
  ['lrt-15', IS, 'lrt-15-registry'],
  ['LRT 15', IS, 'lrt-15-registry'],
  ['srt-4', IS, 'srt-4-registry'],
  ['SRT 4', IS, 'srt-4-registry'],
  ['lrt-15', CLAN, 'lrtorpedo15'],
  ['CLLRT15', CLAN, 'lrtorpedo15'],
  ['LRT 15', CLAN, 'lrtorpedo15'],
  ['srt-6', CLAN, 'srt6'],
  ['CLSRT6', CLAN, 'srt6'],
] as const)('%s on a %s unit resolves to %s', (id, [tech, mode], target) => {
  expect(resolveEquipmentId(id, tech, mode, []).equipmentDef?.id).toBe(target);
});

it('uses the crit-slot Clan marker on mixed-tech units', () => {
  expect(
    resolveEquipmentId('lrt-5', TechBase.INNER_SPHERE, TechBaseMode.MIXED, [
      'CLLRT5 (OMNIPOD)',
    ]).equipmentDef?.id,
  ).toBe('lrtorpedo5');
  expect(
    resolveEquipmentId('lrt-5', TechBase.INNER_SPHERE, TechBaseMode.MIXED, [
      'LRT 5',
    ]).equipmentDef?.id,
  ).toBe('lrt-5-registry');
});

it.each([
  ['Cauldron-Born U (Clan)', cauldronBorn],
  ['Avatar AV1-OU (IS)', avatar],
])('assigns %s torpedoes their critical slots', (_name, unit) => {
  const state = new UnitLoaderService().mapToUnitState(unit, true);
  const torpedoes = state.equipment.filter((item) =>
    /^(lrtorpedo|srt|lrt-|srt-)/.test(item.equipmentId),
  );
  expect(torpedoes.length).toBeGreaterThan(0);
  expect(torpedoes.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ),
  ).toEqual([]);
});

// One-shot launchers: the list id (srm-2-i-os) collapsed to the plain launcher
// while the crit token names the I-OS/OS item. Java: SRM 2 (OS) -> IS ISSRM2OS,
// CLAN CLSRM2 (OS); Clan I-OS/OS items are CLSRM2 (IOS), CLStreakSRM4 (OS), ...
it.each([
  ['srm-2-i-os', IS, 'issrm2ios-registry'],
  ['srm-2-i-os', CLAN, 'clsrm2-ios-registry'],
  ['CLSRM2 (IOS)', CLAN, 'clsrm2-ios-registry'],
  ['srm-2-os', IS, 'issrm2os-registry'],
  ['SRM 2 (OS)', CLAN, 'clsrm2-os-registry'],
  ['streak-srm-2-os', IS, 'isstreaksrm2os-registry'],
  ['streak-srm-4-os', CLAN, 'clstreaksrm4-os-registry'],
  ['CLStreakSRM4 (OS)', CLAN, 'clstreaksrm4-os-registry'],
  ['streak-srm-2-i-os', CLAN, 'clstreaksrm2-ios-registry'],
  ['narc-i-os', CLAN, 'clnarcbeacon-i-os-registry'],
  ['CLNarcBeacon (I-OS)', CLAN, 'clnarcbeacon-i-os-registry'],
  ['issrm4-os', IS, 'issrm4os-registry'],
] as const)(
  'one-shot %s on a %s unit resolves to %s',
  (id, [tech, mode], target) => {
    expect(resolveEquipmentId(id, tech, mode, []).equipmentDef?.id).toBe(
      target,
    );
  },
);

it.each([
  ['Crossbow T (Clan SRM I-OS)', crossbowT],
  ['Daishi C (Clan Streak SRM OS)', daishiC],
  ['Linebacker F (Clan Narc I-OS)', linebackerF],
  ['Assassin ASN-109 (IS SRM I-OS)', assassin],
])('assigns %s one-shots their critical slots', (_name, unit) => {
  const state = new UnitLoaderService().mapToUnitState(unit, true);
  const oneShots = state.equipment.filter((item) =>
    /i?-?os-registry$|ios-registry$/.test(item.equipmentId),
  );
  expect(oneShots.length).toBeGreaterThan(0);
  expect(oneShots.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ),
  ).toEqual([]);
});

// Prototypes: the converter's list slug collapsed to the production item while
// the crit token reached the pinned Java prototype (one owner each, no IS/Clan
// split), e.g. CLERMediumLaserPrototype, CLUltraAC10Prototype.
it.each([
  ['prototype-er-medium-laser', 'clermediumlaserprototype-registry'],
  ['prototype-er-small-laser', 'clersmalllaserprototype-registry'],
  ['prototype-streak-srm-4', 'streaksrm4prototype'],
  ['prototype-streak-srm-6', 'streaksrm6prototype'],
  ['prototype-ultra-autocannon-10', 'clultraac10prototype-registry'],
  ['primitive-prototype-ppc', 'primitive-prototype-ppc-registry'],
  ['prototype-rocket-launcher-20', 'rocketlauncher20prototype-registry'],
] as const)(
  'prototype list id %s resolves to %s for either tech',
  (id, target) => {
    for (const [tech, mode] of [IS, CLAN])
      expect(resolveEquipmentId(id, tech, mode, []).equipmentDef?.id).toBe(
        target,
      );
  },
);

it.each([
  ['Cestus CTS-6Y-EC', cestus],
  ['Enfield END-6J-EC', enfield],
  ['Banshee BNC-1E', banshee],
])('assigns %s prototype weapons their critical slots', (_name, unit) => {
  const state = new UnitLoaderService().mapToUnitState(parseUnit(unit), true);
  const prototypes = state.equipment.filter((item) =>
    /prototype/.test(item.equipmentId),
  );
  expect(prototypes.length).toBeGreaterThan(0);
  expect(prototypes.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ),
  ).toEqual([]);
});

// Emperor EMP-6A-EC (mixed tech) also mounts Clan LB-X ACs whose list ids still
// resolve to the IS item (a separate identity class); its prototype Streak SRM 4
// now takes both CLStreakSRM4Prototype slots.
it('assigns the Emperor EMP-6A-EC prototype Streak SRM 4 its critical slots', () => {
  const state = new UnitLoaderService().mapToUnitState(
    parseUnit(emperor),
    true,
  );
  const streak = state.equipment.filter(
    (item) => item.equipmentId === 'streaksrm4prototype',
  );
  expect(streak.map((item) => item.slots)).toEqual([[10, 11]]);
});

// Duplicate records: one pinned Java item had two catalog entries, the official
// one reached by the converter's list id and an unofficial twin reached by the
// crit token (ISImprovedNarc, CLNarcBeacon, CLiATMn). The crit name now reaches
// the official record. Java's "Heavy Machine Gun" is tech-dependent
// (IS "Heavy Machine Gun", CLAN CLHeavyMG): the Clan list id was the IS HMG.
it.each([
  ['ISImprovedNarc', IS, 'inarc'],
  ['CLNarcBeacon', CLAN, 'clan-narc'],
  ['CLiATM3', CLAN, 'iatm-3'],
  ['CLiATM6', CLAN, 'iatm-6'],
  ['CLiATM9', CLAN, 'iatm-9'],
  ['CLiATM12', CLAN, 'iatm-12'],
  ['heavy-machine-gun', IS, 'heavy-machine-gun'],
  ['heavy-machine-gun', CLAN, 'clheavymg-registry'],
  ['Heavy Machine Gun', CLAN, 'clheavymg-registry'],
] as const)('%s on a %s unit resolves to %s', (id, [tech, mode], target) => {
  expect(resolveEquipmentId(id, tech, mode, []).equipmentDef?.id).toBe(target);
});

it.each([
  ['Champion CHP-3P (iNarc)', champion, 'inarc'],
  ['Arctic Wolf 2 (Clan Narc)', arcticWolf2, 'clan-narc'],
  ['Pariah (Septicemia) A-Z (iATM 12)', pariahAZ, 'iatm-12'],
  ['Crossbow C (Clan HMG)', crossbowC, 'clheavymg-registry'],
] as const)('assigns %s its critical slots', (_name, unit, id) => {
  const state = new UnitLoaderService().mapToUnitState(unit, true);
  const mounts = state.equipment.filter((item) => item.equipmentId === id);
  expect(mounts.length).toBeGreaterThan(0);
  expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
});

// MG arrays: the shared records mga/lmga/hmga carry Clan values (0.25 t) while
// Java's ISMGA/ISLMGA/ISHMGA weigh 0.5 t. Java's display names are tech-dependent
// (Machine Gun Array -> IS ISMGA, CLAN CLMGA); MTFs list the display name and place
// crits by internal name, so the list id, display name and IS internal name route
// together (follow-up 92 slice 4 split them by routing ISLMGA alone).
it.each([
  ['machine-gun-array', IS, 'ismga-registry'],
  ['Light Machine Gun Array', IS, 'islmga-registry'],
  ['ISLMGA', IS, 'islmga-registry'],
  ['heavy-machine-gun-array', IS, 'ishmga-registry'],
  ['machine-gun-array', CLAN, 'mga'],
  ['Light Machine Gun Array', CLAN, 'lmga'],
  ['CLLMGA', CLAN, 'lmga'],
] as const)(
  'MG array %s on a %s unit resolves to %s',
  (id, [tech, mode], target) => {
    expect(resolveEquipmentId(id, tech, mode, []).equipmentDef?.id).toBe(
      target,
    );
  },
);

it.each([
  ['Flea FLE-19 (IS LMGA)', flea, 'islmga-registry', 0.5],
  ['Bombardier BMB-14K (IS MGA)', bombardier, 'ismga-registry', 0.5],
] as const)(
  'assigns %s its MG array slots at Java weight',
  (_name, unit, id, weight) => {
    const state = new UnitLoaderService().mapToUnitState(unit, true);
    const arrays = state.equipment.filter((item) => item.equipmentId === id);
    expect(arrays.length).toBeGreaterThan(0);
    expect(arrays.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
    expect(arrays.every((item) => item.weight === weight)).toBe(true);
    expect(
      getEquipmentSlotIssues(
        state.equipment,
        state.configuration,
        state.engineType,
        state.gyroType,
        state.armActuators,
        state.cockpitType,
      ),
    ).toEqual([]);
  },
);

// Mixed tech without a matching name marker: Scarecrow UCU-F4 places Clan light
// MG arrays (crit CLLMGA) under the list id light-machine-gun-array. The side is
// the one whose route target a crit token at that location resolves to.
it('routes a mixed-tech unit by the crit token its location carries', () => {
  expect(
    resolveEquipmentId(
      'light-machine-gun-array',
      TechBase.INNER_SPHERE,
      TechBaseMode.MIXED,
      ['CLLightMG', 'CLLMGA'],
    ).equipmentDef?.id,
  ).toBe('lmga');
  expect(
    resolveEquipmentId(
      'light-machine-gun-array',
      TechBase.INNER_SPHERE,
      TechBaseMode.MIXED,
      ['ISLMGA'],
    ).equipmentDef?.id,
  ).toBe('islmga-registry');
  const state = new UnitLoaderService().mapToUnitState(
    parseUnit(scarecrow),
    true,
  );
  const arrays = state.equipment.filter((item) => item.equipmentId === 'lmga');
  expect(arrays).toHaveLength(2);
  expect(arrays.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
});
