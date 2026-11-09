import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EquipmentCategory } from '@/types/equipment';

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

  // Ids are not unique: a launcher's ammunition can share its id (clan-lb-2-x-ac)
  // and so can another record (clan-ams). Ammo never carries the list, so look at
  // every non-ammunition record of the id for the one that does.
  const nonAmmo = service
    .getAllEquipment()
    .filter((e) => e.category !== EquipmentCategory.AMMUNITION);
  for (const id of listed.keys()) {
    const types = nonAmmo
      .filter((e) => e.id === id)
      .flatMap((e) => e.allowedUnitTypes ?? []);
    expect({ id, types }).toEqual({
      id,
      types: expect.arrayContaining(['ProtoMech']),
    });
  }
});

// ISBombastLaser.java:94 removes F_PROTO_WEAPON; the list must survive without it.
it('keeps a list that excludes ProtoMech as it is', async () => {
  const service = getEquipmentLookupService();
  await service.initialize();
  const bombast = service.getById('bombast-laser');
  expect(bombast?.allowedUnitTypes).toBeDefined();
  expect(bombast?.allowedUnitTypes).not.toContain('ProtoMech');
  expect(bombast?.allowedUnitTypes).toContain('BattleMech');
});
