import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import { restoreCriticalSlotEquipment } from '../criticalSlotEquipment';
import { mapEquipment } from '../equipmentMapping';
import { takeSourceWeaponSlots } from '../sourceWeaponMounts';

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
const load = (slots: Record<string, string[]>, tonnage?: number) =>
  mapEquipment(
    [],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    slots,
    tonnage,
  );

it('matches legacy aliases without mutating caller claims', () => {
  const slots = Array.from({ length: 6 }, (_, index) => ({
    index,
    equipmentId: 'claw',
  }));
  const claimed = new Set([0]);
  expect(
    takeSourceWeaponSlots(slots, claimed, 'claws', 3).map((slot) => slot.index),
  ).toEqual([1, 2, 3]);
  expect([...claimed]).toEqual([0]);
  expect(takeSourceWeaponSlots(slots, claimed, 'claw', 0)).toEqual([]);
});

it('keeps one Cudgel-sized Mace rather than one mount per critical cell', () => {
  expect(
    load({ LEFT_ARM: Array(8).fill('Mace (R) (OMNIPOD)') }, 80),
  ).toMatchObject([
    {
      equipmentId: 'mace',
      weight: 8,
      criticalSlots: 8,
      slots: [0, 1, 2, 3, 4, 5, 6, 7],
      isRearMounted: true,
      isOmniPodMounted: true,
    },
  ]);
});
it('keeps repeated mounts and their source order', () => {
  const items = load(
    { LEFT_ARM: Array(8).fill('Mace'), RIGHT_ARM: Array(4).fill('Mace') },
    40,
  );
  expect(
    items.map(({ location, slots, weight }) => ({ location, slots, weight })),
  ).toEqual([
    { location: 'Left Arm', slots: [0, 1, 2, 3], weight: 4 },
    { location: 'Left Arm', slots: [4, 5, 6, 7], weight: 4 },
    { location: 'Right Arm', slots: [0, 1, 2, 3], weight: 4 },
  ]);
});

it('reserves an explicit later mount before recovering an earlier qualified mount', () => {
  const items = mapEquipment(
    [
      {
        id: 'smallshield',
        location: 'LEFT_ARM',
        slots: [3, 4, 5],
        isRearMounted: false,
      },
    ],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    {
      LEFT_ARM: [
        ...Array(3).fill('ISSmallShield (R)'),
        ...Array(3).fill('ISSmallShield'),
      ],
    },
    80,
  );
  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({ slots: [3, 4, 5], isRearMounted: false });
  expect(items[1]).toMatchObject({ slots: [0, 1, 2], isRearMounted: true });
});

it.each([6, 10])(
  'reserves every explicit cell of a legacy superheavy allocation (%i)',
  (count) => {
    const slots = Array.from({ length: count }, (_, index) => index);
    const items = mapEquipment(
      [{ id: 'ac-20', location: 'RIGHT_TORSO', slots, isRearMounted: true }],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      { RIGHT_TORSO: Array(10).fill('ISAC20 (R)') },
      105,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      equipmentId: 'ac-20',
      criticalSlots: 5,
      slots,
      isRearMounted: true,
    });
  },
);
it('joins native and legacy Claw identities without merging their mounts', () => {
  const items = load(
    { LEFT_ARM: ['ISClaw', 'Claws', 'ISClaw', 'Claws', 'ISClaw', 'Claws'] },
    40,
  );
  expect(items.map(({ slots, weight }) => ({ slots, weight }))).toEqual([
    { slots: [0, 1, 2], weight: 3 },
    { slots: [3, 4, 5], weight: 3 },
  ]);
});
it('sizes an explicit variable mount once and reserves its complete allocation', () => {
  const items = mapEquipment(
    [{ id: 'mace', location: 'LEFT_ARM' }],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    { LEFT_ARM: Array(8).fill('Mace') },
    80,
  );
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    equipmentId: 'mace',
    weight: 8,
    criticalSlots: 8,
    slots: [0, 1, 2, 3, 4, 5, 6, 7],
  });
});
it('retains incomplete-group and missing-tonnage guards and recovers fixed classes', () => {
  expect(load({ LEFT_ARM: Array(7).fill('Mace') }, 80)).toEqual([]);
  expect(load({ LEFT_ARM: Array(8).fill('Mace') })).toEqual([]);
  expect(load({ LEFT_ARM: Array(3).fill('ISSmallShield') }, 80)).toMatchObject([
    {
      equipmentId: 'smallshield',
      weight: 2,
      criticalSlots: 3,
      slots: [0, 1, 2],
    },
  ]);
});
it('converts superheavy demand once while keeping the ordinary mass', () => {
  expect(load({ LEFT_ARM: Array(8).fill('Mace') }, 150)).toMatchObject([
    {
      equipmentId: 'mace',
      weight: 15,
      criticalSlots: 8,
      slots: [0, 1, 2, 3, 4, 5, 6, 7],
    },
  ]);
});
it('preserves the empty-summary ammo guard independently of physical recovery', () => {
  const slots = { LEFT_TORSO: ['IS Ammo AC/5'] };
  expect(load(slots, 50)).toEqual([]);
  expect(
    restoreCriticalSlotEquipment(
      [],
      [],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      slots,
      50,
    ),
  ).toHaveLength(1);
});
it('keeps one quad Talons mount with the native reverse-location anchor', () => {
  const items = load(
    Object.fromEntries(
      [
        'FRONT_LEFT_LEG',
        'FRONT_RIGHT_LEG',
        'REAR_LEFT_LEG',
        'REAR_RIGHT_LEG',
      ].map((location) => [location, ['Talons', 'Talons']]),
    ),
    60,
  );
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    equipmentId: 'talons',
    weight: 4,
    criticalSlots: 8,
    location: 'Rear Left Leg',
    slots: [0, 1],
    spreadSlots: [
      { location: 'Rear Right Leg', slots: [0, 1] },
      { location: 'Front Left Leg', slots: [0, 1] },
      { location: 'Front Right Leg', slots: [0, 1] },
    ],
  });
  expect(load({ LEFT_LEG: ['Talons'] }, 60)).toEqual([]);
});
