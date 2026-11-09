import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation as L } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory as C } from '@/types/equipment';

import { isSplittable, splitPartners } from '../splitAllocation';

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
