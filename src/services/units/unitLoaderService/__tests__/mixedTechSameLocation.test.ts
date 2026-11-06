import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';

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

// Kodiak (Cale) lists five er-medium-laser in its left arm, whose crits are
// CLERMediumLaser x3 and ISERMediumLaser x2. MegaMek 48fcb2f6 builds one mount
// per crit token (MtfFile.java:1052), so the arm carries three Clan ER medium
// lasers (CLERLaserMedium.java:72, 108 BV) and two IS ones
// (ISERLaserMedium.java:72, 62 BV). Every list entry read the location's first
// Clan token, so all five were Clan.
const source = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      'public/data/units/battlemechs/5-civil-war/standard/Kodiak (Cale).json',
    ),
    'utf8',
  ),
);

it('scores Kodiak (Cale) at Java’s BV', () => {
  // UL-16b oracle: 2535 total, offensive 1268.
  const { bv, breakdown } = calculateUnitBV(source, source.id);
  expect([bv, breakdown?.weaponBV]).toEqual([2535, 1108]);
});

it('mounts each left-arm ER medium laser on its own crit token', () => {
  const state = new UnitLoaderService().mapToUnitState(source, true);
  const lasers = state.equipment.filter(
    (item) =>
      item.location === MechLocation.LEFT_ARM &&
      /er-medium-laser/.test(item.equipmentId),
  );
  expect(lasers.map((item) => [item.equipmentId, item.slots]).sort()).toEqual([
    ['clan-er-medium-laser', [4]],
    ['clan-er-medium-laser', [5]],
    ['clan-er-medium-laser', [6]],
    ['er-medium-laser', [7]],
    ['er-medium-laser', [8]],
  ]);
});
