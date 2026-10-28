import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EquipmentCategory } from '@/types/equipment';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';

import { getEquipmentLoader } from '../EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '../EquipmentLookupService';

// Replace only browser file transport; load/convert/cache the real official corpus.
jest.mock('../EquipmentFileReader', () => ({
  readJsonFile: async (filePath: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', filePath),
        'utf8',
      ),
    ),
}));

const PHYSICAL_IDS = [
  'hatchet',
  'sword',
  'claws',
  'mace',
  'lance',
  'talons',
  'retractable-blade',
  'flail',
  'wrecking-ball',
];

beforeEach(() => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
});

// physical.json carries no category and sizes each weapon by the 'Mech's
// tonnage (weightFormula), so the ranged-weapon converter used to file them
// as Energy weapons with an undefined weight, which crashed the catalog.
it('loads physical weapons as physical, tonnage-sized weapons', async () => {
  const loaded = await getEquipmentLoader().loadOfficialEquipment();
  expect(loaded.success).toBe(true);
  await getEquipmentLookupService().initialize();

  for (const id of PHYSICAL_IDS) {
    const weapon = getEquipmentLoader().getWeaponById(id);
    expect(weapon).toMatchObject({
      category: WeaponCategory.PHYSICAL,
      weight: 0,
      criticalSlots: 0,
      heat: 0,
      variableEquipmentId: id,
    });

    const item = getEquipmentLookupService().getById(id);
    expect(item).toMatchObject({
      category: EquipmentCategory.PHYSICAL_WEAPON,
      weight: 0,
      variableEquipmentId: id,
    });
  }
  expect(
    getEquipmentLookupService()
      .getAllEquipment()
      .filter((item) => typeof item.weight !== 'number'),
  ).toEqual([]);
});
