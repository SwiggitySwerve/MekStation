import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mapCockpitType as convertCockpit } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

import wildfire from '../../../../../public/data/units/battlemechs/4-clan-invasion/standard/Wildfire P1-WF.json';
import { mapCockpitType } from '../componentMappers';
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

// MegaMek 48fcb2f64 TestMek.java:225-230: VRRP weighs 3t, torso cockpit 4t.
it.each([mapCockpitType, convertCockpit])(
  'preserves the native VRRP identity and weight',
  (map) => {
    const cockpit = map('VRRP');
    expect(cockpit).toBe('Virtual Reality Piloting Pod');
    expect(getCockpitDefinition(cockpit)).toMatchObject({
      weight: 3,
      headSlots: 2,
      otherSlots: 4,
    });
  },
);

// Mek.java:5797-5838: VRRP has CT cockpit/life support, head sensors, side life support.
it('recovers Wildfire VRRP from complete native system evidence', () => {
  const state = new UnitLoaderService().mapToUnitState(wildfire, true);
  expect(state.cockpitType).toBe('Virtual Reality Piloting Pod');
  const fixed = (location: MechLocation) =>
    getFixedSlotNames(
      location,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    );
  expect([...fixed(MechLocation.HEAD).keys()]).toEqual([0, 1]);
  expect(fixed(MechLocation.CENTER_TORSO).get(11)).toBe('Life Support');
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

it('keeps a standard cockpit when its critical evidence is absent', () => {
  const state = new UnitLoaderService().mapToUnitState(
    // Pin the input independently of Wildfire's catalog cockpit identity.
    { ...wildfire, cockpit: 'STANDARD', criticalSlots: undefined },
    true,
  );
  expect(state.cockpitType).toBe('Standard');
});
