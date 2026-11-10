import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { getCriticalSlotsForLocation } from '../criticalSlotEquipment';
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

const cases = [
  [
    '6-dark-age/experimental/Dasher II 4',
    MechLocation.LEFT_ARM,
    [6, 7],
    'chain-whip',
    'Chain Whip',
    EquipmentCategory.MISC_EQUIPMENT,
  ],
  [
    '6-dark-age/standard/Night Stalker NSR-K7',
    MechLocation.RIGHT_ARM,
    [4, 5],
    'chain-whip',
    'Chain Whip',
    EquipmentCategory.MISC_EQUIPMENT,
  ],
  [
    '6-dark-age/experimental/Templar III TLR2-OB',
    MechLocation.LEFT_ARM,
    [4, 5],
    'chain-whip',
    'Chain Whip',
    EquipmentCategory.MISC_EQUIPMENT,
  ],
  [
    '5-civil-war/standard/Tessen TSN-X-4',
    MechLocation.LEFT_ARM,
    [7, 8, 9, 10],
    'isc3sensors-registry',
    'C3 Remote Sensors',
    EquipmentCategory.AMMUNITION,
  ],
  [
    "6-dark-age/standard/Tessen TSN-X4R 'Rapunzel'",
    MechLocation.LEFT_ARM,
    [7],
    'isc3sensors-registry',
    'C3 Remote Sensors',
    EquipmentCategory.AMMUNITION,
  ],
  [
    "6-dark-age/standard/Tessen TSN-X4R 'Rapunzel'",
    MechLocation.RIGHT_ARM,
    [4, 5],
    'chain-whip',
    'Chain Whip',
    EquipmentCategory.MISC_EQUIPMENT,
  ],
  [
    '6-dark-age/standard/Trebuchet TBT-K7R',
    MechLocation.RIGHT_ARM,
    [4, 5],
    'chain-whip',
    'Chain Whip',
    EquipmentCategory.MISC_EQUIPMENT,
  ],
  [
    '6-dark-age/standard/Trebuchet TBT-XK7',
    MechLocation.RIGHT_ARM,
    [4, 5],
    'chain-whip',
    'Chain Whip',
    EquipmentCategory.MISC_EQUIPMENT,
  ],
] as const;

it.each(cases)(
  'preserves real %s %s equipment cells through two cold saves',
  (file, location, slots, equipmentId, name, category) => {
    const loader = new UnitLoaderService();
    const source = parseUnit(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/battlemechs', file + '.json'),
          'utf8',
        ),
      ),
    );
    let state = loader.mapToUnitState(source, true);
    for (let round = 0; round < 2; round++) {
      for (const slot of slots) {
        expect(
          state.equipment.some(
            (item) =>
              item.equipmentId === equipmentId &&
              item.category === category &&
              getSlotParts(item).some(
                (part) =>
                  part.location === location && part.slots.includes(slot),
              ),
          ),
        ).toBe(true);
      }
      const saved = serializeCustomUnitState(state, {
        id: 'exact-system-identity',
        chassis: state.chassis,
        variant: state.model,
        era: Era.LATE_SUCCESSION_WARS,
      });
      for (const slot of slots) {
        expect(
          getCriticalSlotsForLocation(saved.criticalSlots, location)?.[slot],
        ).toBe(name);
      }
      state = loader.mapToUnitState(
        parseUnit(JSON.parse(JSON.stringify(saved))),
        false,
      );
      for (const slot of slots) {
        expect(
          state.equipment.some(
            (item) =>
              item.equipmentId === equipmentId &&
              item.category === category &&
              getSlotParts(item).some(
                (part) =>
                  part.location === location && part.slots.includes(slot),
              ),
          ),
        ).toBe(true);
      }
    }
  },
);
