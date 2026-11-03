import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations/queries';
import { buildSlotsByLocation } from '@/utils/validation/slotValidationUtils';

import crab from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/King Crab KGC-0000.json';
import atlas from '../../../../../public/data/units/battlemechs/4-clan-invasion/advanced/Atlas AS7-S2.json';
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

const load = (source: Parameters<UnitLoaderService['mapToUnitState']>[0]) =>
  new UnitLoaderService().mapToUnitState(source, true);
const issuesFor = (state: ReturnType<typeof load>) =>
  getEquipmentSlotIssues(
    state.equipment,
    state.configuration,
    state.engineType,
    state.gyroType,
    state.armActuators,
    state.cockpitType,
  );
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Pinned MegaMek 48fcb2f64: weapons of 8+ slots (WeaponType.java:2619-2621)
// may continue into the adjacent inner location (MtfFile.java:1086-1124,
// Mek.java:489-496), and TestMek.java:462-477 counts both parts.
it('splits King Crab KGC-0000 AC/20s between torso and arm', () => {
  const state = load(crab);
  const cannons = state.equipment.filter((i) => i.equipmentId === 'ac-20');
  expect(cannons.map((i) => [i.location, i.slots, i.splitSlots])).toEqual([
    [
      MechLocation.LEFT_TORSO,
      [0, 1],
      { location: 'Left Arm', slots: range(4, 11) },
    ],
    [
      MechLocation.RIGHT_TORSO,
      [0, 1],
      { location: 'Right Arm', slots: range(4, 11) },
    ],
  ]);
  expect(issuesFor(state)).toEqual([]);
});

it('continues an Atlas AS7-S2 center-torso Heavy Gauss Rifle into the side torso', () => {
  const state = load(atlas);
  const rifle = state.equipment.find(
    (item) => item.equipmentId === 'heavy-gauss-rifle',
  );
  expect(rifle).toMatchObject({
    location: MechLocation.CENTER_TORSO,
    slots: [10, 11],
    splitSlots: { location: MechLocation.RIGHT_TORSO, slots: range(2, 10) },
  });
  expect(issuesFor(state)).toEqual([]);
});

it('never splits a weapon below eight slots', () => {
  const lt = [...crab.criticalSlots.LEFT_TORSO];
  const ct = [...crab.criticalSlots.CENTER_TORSO];
  lt[4] = null;
  ct[11] = 'LRM 15';
  const state = load({
    ...crab,
    criticalSlots: { ...crab.criticalSlots, LEFT_TORSO: lt, CENTER_TORSO: ct },
  });
  const lrm = state.equipment.find((item) => item.equipmentId === 'lrm-15');
  expect(lrm?.splitSlots).toBeUndefined();
  expect(issuesFor(state).map((issue) => issue.message)).toContain(
    'LRM 15 in Left Torso needs 3 distinct critical slots.',
  );
});

it('treats the second location as occupied', () => {
  const state = load(crab);
  const cannon = state.equipment.find((item) => item.equipmentId === 'ac-20');
  expect(
    getAvailableSlotIndices(
      MechLocation.LEFT_ARM,
      state.engineType,
      state.gyroType,
      state.equipment,
      state.armActuators,
    ),
  ).toEqual([]);
  expect(
    buildSlotsByLocation(state.equipment, state.configuration)[
      MechLocation.LEFT_ARM
    ]?.used,
  ).toBe(8);
  const intruder = { ...cannon!, instanceId: 'x', name: 'X', criticalSlots: 1 };
  const equipment = [
    ...state.equipment,
    {
      ...intruder,
      location: MechLocation.LEFT_ARM,
      slots: [5],
      splitSlots: undefined,
    },
  ];
  expect(issuesFor({ ...state, equipment }).map((i) => i.message)).toContain(
    `X and ${cannon!.name} overlap in Left Arm, slot 6.`,
  );
});
