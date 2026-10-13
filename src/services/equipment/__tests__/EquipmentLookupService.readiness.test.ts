import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildBattleMechPreviewProjection } from '@/components/customizer/preview/recordSheetPreview.logic';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import {
  UnitLoaderService,
  parseUnit,
} from '@/services/units/unitLoaderService';

import warhammer from '../../../../public/data/units/battlemechs/1-age-of-war/standard/Warhammer WHM-6R.json';
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

beforeEach(() => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
});

it('uses the independently loaded official catalog for lookup and final PPC print data', async () => {
  const lookup = getEquipmentLookupService();
  // Draft recovery can prime the fallback before the app-level loader finishes.
  expect(lookup.getById('ppc')).toBeUndefined();
  const loaded = await getEquipmentLoader().loadOfficialEquipment();
  expect(loaded.success).toBe(true);
  expect(lookup.isInitialized()).toBe(false);
  const state = new UnitLoaderService().mapToUnitState(
    parseUnit(warhammer),
    true,
  );
  const projected = buildBattleMechPreviewProjection(state);
  const printed = getRecordSheetService().extractData({
    ...projected.unitConfig,
    equipment: [
      {
        id: 'mounted-left-ppc',
        name: 'PPC',
        location: 'Left Arm',
        isWeapon: true,
      },
      {
        id: 'mounted-right-ppc',
        name: 'PPC',
        location: 'Right Arm',
        isWeapon: true,
      },
    ],
  });
  const ppcs = printed.equipment.filter((item) => item.name === 'PPC');
  expect(ppcs).toHaveLength(2);
  for (const ppc of ppcs) {
    expect(ppc).toMatchObject({
      heat: 10,
      damage: '10',
      damageCode: '[DE]',
      minimum: 3,
      short: 6,
      medium: 12,
      long: 18,
    });
  }

  expect(lookup.getDataSource()).toBe('json');
  expect(
    lookup.getAllWeapons().find((weapon) => weapon.id === 'ppc'),
  ).toMatchObject({ name: 'PPC', heat: 10, damage: 10 });
  expect(lookup.getById('ppc')).toMatchObject({ name: 'PPC' });
  expect(lookup.getAllAmmunition()).toEqual(
    getEquipmentLoader().getAllAmmunition(),
  );

  getEquipmentLoader().clear();
  expect(lookup.getDataSource()).toBe('fallback');
  expect(lookup.getById('ppc')).toBeUndefined();
});
