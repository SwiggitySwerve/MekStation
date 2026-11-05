import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment';

import crab from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/King Crab KGC-0000.json';
import cudgel from '../../../../../public/data/units/battlemechs/4-clan-invasion/experimental/Cudgel CDG-1B.json';
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

// MtfFile.java:1049-1140; MiscType.java:514-515,1080-1081 (48fcb2f64).
it.each([cudgel, { ...cudgel, equipment: [] }])(
  'loads the crit-only Cudgel Mace, including with an empty summary',
  (source) => {
    const maces = load(source).equipment.filter(
      (x) => x.equipmentId === 'mace',
    );
    expect(maces).toHaveLength(1);
    expect(maces[0]).toMatchObject({
      category: EquipmentCategory.PHYSICAL_WEAPON,
      weight: 8,
      criticalSlots: 8,
      location: MechLocation.LEFT_ARM,
      slots: [4, 5, 6, 7, 8, 9, 10, 11],
    });
  },
);

it.each([
  ['Hatchet', 'hatchet', 6],
  ['IS Lance', 'lance', 4],
] as const)(
  'sizes a crit-only %s through the shared owner',
  (token, id, count) => {
    const state = load({
      ...cudgel,
      equipment: [],
      criticalSlots: { LEFT_ARM: Array(count).fill(token) },
    });
    expect(state.equipment.filter((x) => x.equipmentId === id)).toEqual([
      expect.objectContaining({
        weight: count,
        criticalSlots: count,
        slots: Array.from({ length: count }, (_, i) => i),
      }),
    ]);
  },
);

it('groups two missing Hatchets but never duplicates an already listed mount', () => {
  const source = {
    ...cudgel,
    equipment: [],
    criticalSlots: { LEFT_ARM: Array(12).fill('Hatchet') },
  };
  const mounts = load(source).equipment.filter(
    (x) => x.equipmentId === 'hatchet',
  );
  expect(mounts.map((x) => x.slots)).toEqual([
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
  ]);
  expect(new Set(mounts.map((x) => x.instanceId)).size).toBe(2);
  const listed = load({
    ...source,
    equipment: [{ id: 'hatchet', location: 'LEFT_ARM' }],
  });
  expect(
    listed.equipment.filter((x) => x.equipmentId === 'hatchet'),
  ).toHaveLength(2);
  const complete = load({
    ...source,
    equipment: [
      { id: 'hatchet', location: 'LEFT_ARM' },
      { id: 'hatchet', location: 'LEFT_ARM' },
    ],
  });
  expect(
    complete.equipment.filter((x) => x.equipmentId === 'hatchet'),
  ).toHaveLength(2);
});

it.each(['PPC'])(
  'keeps the %s prerequisite class outside this repair',
  (token) => {
    const state = load({
      ...cudgel,
      equipment: [],
      criticalSlots: { LEFT_ARM: [token] },
    });
    expect(state.equipment).toEqual([]);
  },
);

it('preserves the already listed split AC/20s', () => {
  const state = load(crab);
  const cannons = state.equipment.filter((x) => x.equipmentId === 'ac-20');
  expect(cannons).toHaveLength(2);
  for (const cannon of cannons) {
    expect(
      (cannon.slots?.length ?? 0) + (cannon.splitSlots?.slots.length ?? 0),
    ).toBe(10);
    expect(cannon.splitSlots).toBeDefined();
  }
});

// MiscType.java:512-517,1075-1083; MtfFile.java:1133-1175 (48fcb2f64).
it.each([
  ['Sword', 'sword', 4, 6],
  ['Retractable Blade', 'retractable-blade', 4.5, 5],
] as const)(
  'restores the sized crit-only %s',
  (token, id, weight, criticalSlots) => {
    const source = {
      ...cudgel,
      equipment: [],
      criticalSlots: { LEFT_ARM: Array(criticalSlots).fill(token) },
    };
    expect(load(source).equipment).toEqual([
      expect.objectContaining({
        equipmentId: id,
        weight,
        criticalSlots,
        slots: Array.from({ length: criticalSlots }, (_, i) => i),
      }),
    ]);
    expect(
      load({ ...source, equipment: [{ id, location: 'LEFT_ARM' }] }).equipment,
    ).toHaveLength(1);
  },
);
