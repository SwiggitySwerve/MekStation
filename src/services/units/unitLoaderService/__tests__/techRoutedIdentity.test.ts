import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import daishiC from '../../../../../public/data/units/battlemechs/4-clan-invasion/advanced/Daishi C.json';
import avatar from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/Avatar AV1-OU.json';
import linebackerF from '../../../../../public/data/units/battlemechs/5-civil-war/experimental/Linebacker F.json';
import cauldronBorn from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Cauldron-Born U.json';
import assassin from '../../../../../public/data/units/battlemechs/6-dark-age/advanced/Assassin ASN-109.json';
import crossbowT from '../../../../../public/data/units/battlemechs/6-dark-age/advanced/Crossbow T.json';
import { resolveEquipmentId } from '../equipmentResolution';
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
