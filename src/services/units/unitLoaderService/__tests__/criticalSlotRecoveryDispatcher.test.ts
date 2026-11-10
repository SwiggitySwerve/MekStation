import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import {
  recognizeCriticalSlotEntries,
  recoverCriticalSlotEntries,
  restoreCriticalSlotEquipment,
} from '../criticalSlotEquipment';
import { sourceCriticalWeapons } from '../sourceWeaponMounts';

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
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

const context = {
  equipment: [],
  unitTechBase: TechBase.INNER_SPHERE,
  unitTechBaseMode: TechBaseMode.INNER_SPHERE,
  tonnage: 50,
};
const L = MechLocation;

it.each([
  ['IS MRM 20 Ammo', 'mrm-20', EquipmentCategory.AMMUNITION, 1, 1],
  ['Bomb Bay', 'bomb-bay', EquipmentCategory.MISC_EQUIPMENT, 1, 1],
  [
    'ISDoubleHeatSink',
    'double-heat-sink',
    EquipmentCategory.MISC_EQUIPMENT,
    1,
    3,
  ],
] as const)(
  'dispatches existing %s recovery without mutating its input',
  (token, id, category, weight, criticalSlots) => {
    const critical = { LEFT_TORSO: Array<string>(criticalSlots).fill(token) };
    const input = { ...context, criticalSlots: critical };
    const locationEntries = recognizeCriticalSlotEntries(input).cells;
    const recovered = recoverCriticalSlotEntries({
      ...input,
      entry: locationEntries[0],
      location: L.LEFT_TORSO,
      locationEntries,
    });
    expect(recovered).toHaveLength(1);
    expect(recovered[0]).toMatchObject({
      equipmentId: id,
      category,
      weight,
      criticalSlots,
      location: L.LEFT_TORSO,
      slots: Array.from({ length: criticalSlots }, (_, i) => i),
    });
    expect(input.equipment).toEqual([]);
  },
);

it.each(['IS MRM 20 Ammo', 'Bomb Bay', 'ISDoubleHeatSink'])(
  'preserves the summary admission guard for %s',
  (token) => {
    const input = {
      ...context,
      criticalSlots: { LEFT_TORSO: Array<string>(3).fill(token) },
    };
    const locationEntries = recognizeCriticalSlotEntries(input).cells;
    expect(
      recoverCriticalSlotEntries({
        ...input,
        entry: locationEntries[0],
        location: L.LEFT_TORSO,
        locationEntries,
        physicalOnly: true,
      }),
    ).toEqual([]);
  },
);

it('requires a complete unreserved sink group, using native superheavy entry demand', () => {
  const input = {
    ...context,
    tonnage: 105,
    criticalSlots: { LEFT_TORSO: ['ISDoubleHeatSink', 'ISDoubleHeatSink'] },
  };
  const locationEntries = recognizeCriticalSlotEntries(input).cells;
  const dispatch = {
    ...input,
    entry: locationEntries[0],
    location: L.LEFT_TORSO,
    locationEntries,
  };
  expect(recoverCriticalSlotEntries(dispatch)[0]).toMatchObject({
    criticalSlots: 2,
    slots: [0, 1],
    weight: 1,
  });
  expect(recoverCriticalSlotEntries({ ...dispatch, tonnage: 100 })).toEqual([]);
  expect(
    recoverCriticalSlotEntries({
      ...dispatch,
      reservedSlots: new Map([[L.LEFT_TORSO, new Set([1])]]),
    }),
  ).toEqual([]);
});

it('sees previously recovered placements through refreshed context and does not reclaim an ammo bin', () => {
  const input = {
    ...context,
    criticalSlots: { LEFT_TORSO: ['IS MRM 20 Ammo', 'IS MRM 20 Ammo'] },
  };
  const initial = recognizeCriticalSlotEntries(input).cells;
  const first = recoverCriticalSlotEntries({
    ...input,
    entry: initial[0],
    location: L.LEFT_TORSO,
    locationEntries: initial,
  });
  const refreshed = { ...input, equipment: first };
  const locationEntries = recognizeCriticalSlotEntries(refreshed).cells;
  expect(locationEntries.map((entry) => entry.represented)).toEqual([
    true,
    false,
  ]);
  const reservedSlots = new Map([[L.LEFT_TORSO, new Set([0])]]);
  expect(
    recoverCriticalSlotEntries({
      ...refreshed,
      entry: locationEntries[0],
      location: L.LEFT_TORSO,
      locationEntries,
    }),
  ).toEqual([]);
  expect(
    recoverCriticalSlotEntries({
      ...refreshed,
      entry: locationEntries[0],
      location: L.LEFT_TORSO,
      locationEntries,
      reservedSlots,
    }),
  ).toEqual([]);
  expect(
    recoverCriticalSlotEntries({
      ...refreshed,
      entry: locationEntries[1],
      location: L.LEFT_TORSO,
      locationEntries,
      reservedSlots,
    })[0],
  ).toMatchObject({ slots: [1] });
  expect([...reservedSlots.get(L.LEFT_TORSO)!]).toEqual([0]);
});

it('routes already grouped native weapons through the same dispatcher even with the summary guard', () => {
  const input = {
    ...context,
    tonnage: 45,
    criticalSlots: { LEFT_ARM: Array<string>(3).fill('Hatchet') },
  };
  const locationEntries = recognizeCriticalSlotEntries(input).cells;
  const sourceWeapon = sourceCriticalWeapons(
    input.criticalSlots,
    input.tonnage,
    false,
  )[0];
  expect(
    recoverCriticalSlotEntries({
      ...input,
      entry: locationEntries[0],
      location: L.LEFT_ARM,
      locationEntries,
      sourceWeapon,
      physicalOnly: true,
    })[0],
  ).toMatchObject({ equipmentId: 'hatchet', slots: [0, 1, 2], weight: 3 });
  expect(
    recoverCriticalSlotEntries({
      ...input,
      entry: locationEntries[0],
      location: L.LEFT_ARM,
      locationEntries,
    }),
  ).toEqual([]);
});

it('keeps legacy recovery order before markers and keeps non-Omni suffix behavior', () => {
  const critical = {
    LEFT_TORSO: [
      'IS MRM 20 Ammo (OMNIPOD)',
      'Bomb Bay',
      'ISDoubleHeatSink',
      'ISDoubleHeatSink',
      'ISDoubleHeatSink',
      'IS Ferro-Fibrous',
    ],
  };
  const recovered = restoreCriticalSlotEquipment(
    [],
    [],
    context.unitTechBase,
    context.unitTechBaseMode,
    critical,
    45,
  );
  expect(
    recovered.map((item) => [
      item.equipmentId,
      item.slots,
      item.isOmniPodMounted,
    ]),
  ).toEqual([
    ['mrm-20', [0], false],
    ['bomb-bay', [1], false],
    ['double-heat-sink', [2, 3, 4], false],
    ['armor-slot-IS Ferro-Fibrous', [5], false],
  ]);
});
