import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';

import { getCriticalSlotsForLocation } from '../criticalSlotEquipment';
import { groupCriticalSlotNoticeEntries } from '../criticalSlotNoticeGroups';
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

it('keeps Galahad GLH-1D marker cells unrecovered, listed in the notice and absent from equipment until the marker PR', () => {
  const source = parseUnit(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/battlemechs/1-age-of-war/advanced/Galahad GLH-1D.json',
        ),
        'utf8',
      ),
    ),
  );
  const markerCells = Object.values(MechLocation).flatMap((location) =>
    (getCriticalSlotsForLocation(source.criticalSlots, location) ?? []).flatMap(
      (text, slot) =>
        text === 'IS Endo Steel' ? [{ text, location, slot }] : [],
    ),
  );
  expect(markerCells).toHaveLength(14);
  const state = new UnitLoaderService().mapToUnitState(source, true);
  expect(state.unrecoveredCriticalSlots).toHaveLength(markerCells.length);
  expect(state.unrecoveredCriticalSlots).toEqual(
    expect.arrayContaining(markerCells),
  );
  const notice = groupCriticalSlotNoticeEntries(
    state.unrecoveredCriticalSlots ?? [],
    source,
  );
  expect(notice).toEqual([
    expect.objectContaining({
      title: 'Placement markers only',
      count: 14,
    }),
  ]);
  expect(
    notice.flatMap((group) => group.kinds.flatMap((kind) => kind.entries)),
  ).toEqual(expect.arrayContaining(markerCells));
  for (const marker of markerCells) {
    expect(
      state.equipment.some((item) =>
        getSlotParts(item).some(
          (part) =>
            part.location === marker.location &&
            part.slots.includes(marker.slot),
        ),
      ),
    ).toBe(false);
  }
  expect(state.equipment.some((item) => item.name === 'IS Endo Steel')).toBe(
    false,
  );
});
