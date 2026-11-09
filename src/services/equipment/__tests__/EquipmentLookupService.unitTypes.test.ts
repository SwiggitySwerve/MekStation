import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLoader } from '../EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '../EquipmentLookupService';

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

/**
 * The catalog carries the Java weapon and equipment flags as `allowedUnitTypes`
 * (row 4.1-b: the ProtoMech Equipment tab offers what MegaMekLab's
 * F_PROTO_WEAPON test accepts). The browser inventory must keep that list.
 */
it('keeps the catalog unit-type list on every browser weapon that has one', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  const base = join(process.cwd(), 'public/data/equipment/official');
  const index: { files: { weapons: Record<string, string> } } = JSON.parse(
    readFileSync(join(base, 'index.json'), 'utf8'),
  );
  const listed = new Map<string, string[]>();
  for (const file of Object.values(index.files.weapons)) {
    const data: { items: { id: string; allowedUnitTypes?: string[] }[] } =
      JSON.parse(readFileSync(join(base, file), 'utf8'));
    for (const item of data.items) {
      if (item.allowedUnitTypes?.includes('ProtoMech'))
        listed.set(item.id, item.allowedUnitTypes);
    }
  }
  // 46 Java registry weapons plus the ProtoMech LRM and SRM entries.
  expect(listed.size).toBeGreaterThanOrEqual(60);

  const browser = new Map(service.getAllEquipment().map((e) => [e.id, e]));
  for (const id of listed.keys()) {
    expect({ id, types: browser.get(id)?.allowedUnitTypes }).toEqual({
      id,
      types: expect.arrayContaining(['ProtoMech']),
    });
  }
});

it('leaves the list off an item the catalog does not describe', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  const medium = service.getById('medium-laser');
  expect(medium).toBeDefined();
  expect(medium?.allowedUnitTypes ?? []).not.toContain('ProtoMech');
});
