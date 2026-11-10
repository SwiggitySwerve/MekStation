import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import goliath from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Goliath GOL-6M.json';
import { parseCriticalSlotToken } from '../equipmentResolution';
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

// Pinned MegaMek 48fcb2f64 MtfFile.java:1014-1021 strips the Mek turret marker
// after the OmniPod marker and before the rear marker. Java checks (T) only as
// the outermost remaining suffix, so "(T) (R)" keeps its (T).
it.each([
  ['ISGaussRifle (T)', 'ISGaussRifle', false],
  ['CLERPPC (T) (OMNIPOD)', 'CLERPPC', false],
  ['ISERMediumLaser (R) (T)', 'ISERMediumLaser', true],
  ['ISERMediumLaser (T) (R)', 'ISERMediumLaser (T)', true],
  ['ISShoulderTurret (ARMORED)', 'ISShoulderTurret', false],
] as const)(
  '%s keeps identity and rear mounting',
  (token, lookupToken, rear) => {
    expect(parseCriticalSlotToken(token)).toMatchObject({
      lookupToken,
      isRearMounted: rear,
    });
  },
);

it('assigns Goliath GOL-6M turret weapons their critical slots', () => {
  const state = new UnitLoaderService().mapToUnitState(goliath, true);
  const turret = state.equipment.filter((item) =>
    ['gauss-rifle', 'mml-7'].includes(item.equipmentId),
  );
  expect(turret.map((item) => item.slots?.length)).toEqual([7, 4, 4]);
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
