import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import avatar from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/Avatar AV1-OU.json';
import cauldronBorn from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Cauldron-Born U.json';
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
