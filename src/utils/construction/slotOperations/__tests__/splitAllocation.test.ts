import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation as L } from '@/types/construction';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory as C } from '@/types/equipment';

import {
  findEquipmentSlotAssignment,
  isSplittable,
  splitPartners,
} from '../splitAllocation';

const weapon: IMountedEquipmentInstance = {
  instanceId: 'weapon',
  equipmentId: 'ac-20',
  name: 'AC/20',
  category: C.BALLISTIC_WEAPON,
  weight: 14,
  criticalSlots: 10,
  heat: 7,
  techBase: TechBase.INNER_SPHERE,
  isRearMounted: false,
  isRemovable: true,
  isOmniPodMounted: true,
};

it.each([
  [7, C.BALLISTIC_WEAPON, false],
  [8, C.BALLISTIC_WEAPON, true],
  [12, C.PHYSICAL_WEAPON, false],
  [12, C.AMMUNITION, false],
] as const)(
  'keeps pinned split eligibility at %i slots for %s',
  (criticalSlots, category, expected) => {
    expect(isSplittable({ ...weapon, criticalSlots, category })).toBe(expected);
  },
);

it('keeps the loader adjacency for arms, torsos and head', () => {
  expect(splitPartners(L.LEFT_ARM)).toEqual([L.LEFT_TORSO]);
  expect(splitPartners(L.LEFT_TORSO)).toContain(L.CENTER_TORSO);
  expect(splitPartners(L.CENTER_TORSO)).toEqual([
    L.LEFT_TORSO,
    L.RIGHT_TORSO,
    L.CENTER_LEG,
    L.HEAD,
  ]);
  expect(splitPartners(L.HEAD)).toEqual([L.CENTER_TORSO]);
});

const free = new Map([
  [L.LEFT_TORSO, [0, 1]],
  [L.LEFT_ARM, [4, 5, 6, 7, 8, 9, 10, 11]],
]);
it('allocates one weapon across two adjacent contiguous portions', () => {
  expect(findEquipmentSlotAssignment(weapon, L.LEFT_TORSO, free)).toEqual({
    instanceId: weapon.instanceId,
    location: L.LEFT_TORSO,
    slots: [0, 1],
    splitSlots: { location: L.LEFT_ARM, slots: free.get(L.LEFT_ARM) },
  });
});
it.each([
  new Map([
    [L.LEFT_TORSO, [0, 1]],
    [L.RIGHT_ARM, free.get(L.LEFT_ARM)!],
  ]),
  new Map([
    [L.LEFT_TORSO, [0, 2]],
    [L.LEFT_ARM, free.get(L.LEFT_ARM)!],
  ]),
  new Map([
    [L.LEFT_TORSO, [0, 1]],
    [L.LEFT_ARM, [4, 5, 6, 7, 8, 9, 10]],
  ]),
])(
  'rejects non-adjacent, discontiguous or insufficient space (%p)',
  (slots) => {
    expect(
      findEquipmentSlotAssignment(weapon, L.LEFT_TORSO, slots),
    ).toBeUndefined();
  },
);
it('does not split short weapons, physical weapons, LAMs or legs', () => {
  expect(
    findEquipmentSlotAssignment(
      { ...weapon, criticalSlots: 7 },
      L.LEFT_TORSO,
      free,
    ),
  ).toBeUndefined();
  expect(
    findEquipmentSlotAssignment(
      { ...weapon, category: C.PHYSICAL_WEAPON },
      L.LEFT_TORSO,
      free,
    ),
  ).toBeUndefined();
  expect(
    findEquipmentSlotAssignment(
      weapon,
      L.LEFT_TORSO,
      free,
      MechConfiguration.LAM,
    ),
  ).toBeUndefined();
  expect(
    findEquipmentSlotAssignment(
      weapon,
      L.LEFT_LEG,
      new Map([...free, [L.LEFT_LEG, [4, 5]]]),
    ),
  ).toBeUndefined();
});
