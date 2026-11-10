import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EquipmentCategory } from '@/types/equipment';
import { MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';

import {
  convertMiscEquipment,
  type IEquipmentFile,
  type IRawMiscEquipmentData,
} from '../EquipmentConverters';
import { getEquipmentLoader } from '../EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '../EquipmentLookupService';
import { parseMiscEquipmentCategory } from '../EquipmentParsers';

// Exercise the official parser and lookup; replace only browser transport.
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

afterEach(() => jest.restoreAllMocks());

it('retains every miscellaneous catalog category without changing its meaning', async () => {
  const loader = getEquipmentLoader();
  expect((await loader.loadOfficialEquipment()).success).toBe(true);
  const base = join(process.cwd(), 'public/data/equipment/official');
  const index: { files: { miscellaneous: Record<string, string> } } =
    JSON.parse(readFileSync(join(base, 'index.json'), 'utf8'));
  for (const file of Object.values(index.files.miscellaneous)) {
    const data: IEquipmentFile<IRawMiscEquipmentData> = JSON.parse(
      readFileSync(join(base, file), 'utf8'),
    );
    for (const item of data.items) {
      expect(parseMiscEquipmentCategory(item.category)).toBe(item.category);
      expect(loader.getMiscEquipmentById(item.id)?.category).toBe(
        item.category,
      );
    }
  }
  expect(loader.getMiscEquipmentById('trailer-hitch')?.category).toBe(
    'Miscellaneous',
  );
});

it.each(['unrecognized category', '', '__proto__', 'constructor'])(
  'represents unknown category %p explicitly',
  (category) => {
    expect(parseMiscEquipmentCategory(category)).toBe('Unknown');
  },
);

it('resolves a Miscellaneous catalog item without expanding the mech browser', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  expect(service.getDataSource()).toBe('json');
  expect(service.getById('trailer-hitch')).toMatchObject({
    id: 'trailer-hitch',
    category: EquipmentCategory.MISC_EQUIPMENT,
  });
  expect(
    service.getByCategory(EquipmentCategory.MISC_EQUIPMENT),
  ).toContainEqual(service.getById('trailer-hitch'));
  expect(service.search('Trailer Hitch')).toContainEqual(
    service.getById('trailer-hitch'),
  );
  expect(
    service.getAllEquipment().some((item) => item.id === 'trailer-hitch'),
  ).toBe(false);
});

it('keeps real heat sinks and jump jets in configuration, outside lookup and browsing', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  for (const file of ['heat-sinks', 'jump-jets']) {
    const data: IEquipmentFile<IRawMiscEquipmentData> = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          `public/data/equipment/official/miscellaneous/${file}.json`,
        ),
        'utf8',
      ),
    );
    for (const item of data.items.filter(
      (entry) =>
        entry.category === MiscEquipmentCategory.HEAT_SINK ||
        entry.category === MiscEquipmentCategory.JUMP_JET,
    )) {
      expect(service.getById(item.id)).toBeUndefined();
      expect(
        service.getAllEquipment().some((entry) => entry.id === item.id),
      ).toBe(false);
    }
  }
  expect(
    getEquipmentLoader().getMiscEquipmentById('single-heat-sink'),
  ).toMatchObject({
    id: 'single-heat-sink',
    category: 'Heat Sink',
  });
});

it('preserves the physical weapon when it shares a Miscellaneous item ID', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  expect(service.getById('hatchet')?.category).toBe(
    EquipmentCategory.PHYSICAL_WEAPON,
  );
  expect(
    service.getAllEquipment().filter((item) => item.id === 'hatchet'),
  ).toHaveLength(1);
});

it('keeps unknown categories available by ID without treating them as heat sinks', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  const loader = getEquipmentLoader();
  const unknownItem = convertMiscEquipment({
    id: 'future-equipment',
    name: 'Future Equipment',
    category: 'Future category',
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    weight: 1,
    criticalSlots: 1,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3000,
  });
  const items = loader.getAllMiscEquipment();
  jest
    .spyOn(loader, 'getAllMiscEquipment')
    .mockReturnValue([...items, unknownItem]);
  expect(service.getById(unknownItem.id)).toMatchObject({ id: unknownItem.id });
  expect(service.query({}).some((entry) => entry.id === unknownItem.id)).toBe(
    true,
  );
  expect(
    service.getAllEquipment().some((entry) => entry.id === unknownItem.id),
  ).toBe(false);
});
