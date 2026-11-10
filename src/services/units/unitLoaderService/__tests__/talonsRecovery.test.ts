import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { Era } from '@/types/temporal/Era';
import {
  getSlotParts,
  hasAssignedCriticalSlots,
} from '@/utils/construction/slotOperations/placement';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations/queries';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';
import { buildSlotsByLocation } from '@/utils/validation/slotValidationUtils';

import turkina from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Turkina U.json';
import sarath from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Sarath SRTH-1OB.json';
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

// MegaMek 48fcb2f64, MiscType.java:688-689,1256-1258,4314;
// MtfFile.java:1053-1068 reuses one mount for all of its spreadable criticals.
it.each([
  [turkina, 7, 4, 2],
  [sarath, 4, 8, 4],
] as const)(
  'recovers one spreadable Talons mount with native mass and locations',
  (source, weight, criticalSlots, locations) => {
    const loader = new UnitLoaderService();
    const state = loader.mapToUnitState(parseUnit(source), true);
    const talons = state.equipment.filter((x) => x.equipmentId === 'talons');
    expect(talons).toHaveLength(1);
    const mount = talons[0];
    if (!mount) throw Error('Missing Talons');
    expect(mount).toMatchObject({
      weight,
      criticalSlots,
      isOmniPodMounted: true,
    });
    expect(hasAssignedCriticalSlots(mount)).toBe(true);
    const parts = getSlotParts(mount);
    expect(parts).toHaveLength(locations);
    const slots = buildSlotsByLocation(state.equipment, state.configuration);
    for (const part of parts) {
      expect(part.slots).toEqual([4, 5]);
      expect(slots[part.location].used).toBe(2);
      expect(
        getAvailableSlotIndices(
          part.location,
          state.engineType,
          state.gyroType,
          state.equipment,
          state.armActuators,
          state.cockpitType,
        ),
      ).toEqual([]);
    }
    const saved = serializeCustomUnitState(state, {
      id: 'talons-roundtrip',
      chassis: 'Talons Fixture',
      variant: 'T',
      era: Era.DARK_AGE,
    });
    const restored = loader
      .mapToUnitState({ ...saved }, false)
      .equipment.filter((x) => x.equipmentId === 'talons');
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      weight,
      criticalSlots,
      isOmniPodMounted: true,
    });
    expect(getSlotParts(restored[0])).toEqual(parts);
  },
);
